import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, type_activite, secteur_boutique, type_usage, categories_existantes } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'La clé API Anthropic (ANTHROPIC_API_KEY) n\'est pas encore configurée sur le serveur. Veuillez l\'ajouter dans le fichier .env.local pour activer l\'analyse automatique par l\'IA Claude.',
          items: [],
        },
        { status: 400 }
      );
    }

    // Définition de la description du secteur pour le prompt Claude
    let secteurDesc = '';
    if (type_activite === 'boutique') {
      secteurDesc = secteur_boutique
        ? `une boutique spécialisée dans le secteur "${secteur_boutique}"`
        : 'une boutique de commerce général (habillement, articles divers)';
    } else if (type_activite === 'bar') {
      secteurDesc = 'un bar / lounge / boite de nuit (boissons, bières, casiers, spiritueux, vins)';
    } else {
      secteurDesc = 'un snack-bar / restaurant (plats, fast-food, boissons, jus)';
    }

    // Définition du contexte du document
    let usageDesc = '';
    if (type_usage === 'initial') {
      usageDesc = 'un inventaire initial de démarrage rédigé sur un cahier/feuille ou imprimé';
    } else if (type_usage === 'reapprovisionnement') {
      usageDesc = 'un bon de livraison, facture ou reçu d\'arrivage fournisseur';
    } else {
      usageDesc = 'une photographie directe d\'articles physiques sur des étagères, présentoirs ou casiers';
    }

    const categoriesStr =
      categories_existantes && categories_existantes.length > 0
        ? categories_existantes.join(', ')
        : 'Aucune catégorie prédéfinie pour le moment';

    const systemPrompt = `Tu es l'assistant IA vision expert pour l'application de gestion de stock œko (L'œil du patron), spécialisé dans la reconnaissance visuelle de reçus manuscrits, bons de livraison imprimés, cahiers d'inventaire et étagères de stock.

INSTRUCTION DYNAMIQUE CONTEXTUELLE :
Ce commerce est ${type_activite === 'boutique' ? `une boutique de ${secteur_boutique || 'commerce général'}` : type_activite === 'bar' ? 'un bar / lounge' : 'un snack-bar / restaurant'}.
Voici un reçu de livraison/inventaire (${usageDesc}).
Identifie chaque article, sa quantité, son prix si visible, et propose une catégorie adaptée à ce secteur d'activité, en tenant compte des catégories déjà existantes dans le stock de ce commerce : [${categoriesStr}].

RÈGLES IMPORTANTES :
- Ne te limite jamais à une liste fixe de catégories pré-codées en dur : déduis et propose les catégories les plus pertinentes d'après le type de commerce et le nom de l'article.
- Si un article est incertain ou très ambigu, classe-le dans la catégorie "À vérifier".
- Extrais "article" (nom), "categorie" (catégorie déduite), "quantite" (nombre), "prix_achat" (nombre en FCFA ou 0), "prix_vente" (nombre en FCFA ou 0).

FORMAT DE RÉPONSE STRICTEMENT EXIGÉ :
Réponds UNIQUEMENT sous la forme d'un tableau JSON valide, sans aucun texte d'introduction, sans commentaire, sans balise explicative.
Exemple exact :
[
  {"article": "Chemise Pagne Homme", "categorie": "Vêtements", "quantite": 10, "prix_achat": 7000, "prix_vente": 12000},
  {"article": "Bière 33 Export 65cl", "categorie": "Bières", "quantite": 24, "prix_achat": 500, "prix_vente": 650}
]`;

    const contentPayload: any[] = [];

    if (images && Array.isArray(images)) {
      images.forEach((imgDataUrl: string) => {
        if (typeof imgDataUrl === 'string' && imgDataUrl.length > 0) {
          let mediaType = 'image/jpeg';
          let base64Data = imgDataUrl;

          if (imgDataUrl.includes(';base64,')) {
            const parts = imgDataUrl.split(';base64,');
            mediaType = parts[0].replace('data:', '') || 'image/jpeg';
            base64Data = parts[1];
          }

          contentPayload.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          });
        }
      });
    }

    contentPayload.push({
      type: 'text',
      text: 'Analyse ces images et extrais les articles au format JSON structuré demandé.',
    });

    const claudeModel = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: 2500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: contentPayload,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur API Claude:', errorText);
      return NextResponse.json(
        {
          success: false,
          error: `L'API Claude a retourné une erreur (${response.status}) : ${errorText}`,
          items: [],
        },
        { status: 500 }
      );
    }

    const resData = await response.json();
    const replyText = resData.content?.[0]?.text || '[]';

    // Nettoyage des balises markdown éventuelles (ex: ```json ... ```)
    const cleanedJson = replyText.replace(/```json/g, '').replace(/```/g, '').trim();

    let items = [];
    try {
      items = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.error('Erreur parsing JSON depuis la réponse Claude:', replyText);
    }

    return NextResponse.json({
      success: true,
      items: Array.isArray(items) ? items : [],
    });
  } catch (error: any) {
    console.error('Erreur backend scan stock IA:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors du traitement visuel de l\'image par l\'IA.',
        items: [],
      },
      { status: 500 }
    );
  }
}
