'use client';

import React, { useState, useEffect } from 'react';
import {
  Camera,
  FileSpreadsheet,
  Upload,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCcw,
  Download,
  Info,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Etablissement } from '@/types';

interface StockAiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface EditableStockItem {
  id: string;
  article: string;
  categorie: string;
  quantite: number;
  prix_achat: number;
  prix_vente: number;
}

export default function StockAiScannerModal({
  isOpen,
  onClose,
  onSuccess,
}: StockAiScannerModalProps) {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [activeTab, setActiveTab] = useState<'photo' | 'excel'>('photo');
  const [usageType, setUsageType] = useState<'reapprovisionnement' | 'initial' | 'physique'>('reapprovisionnement');

  // Step 1: Upload state
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [apiWarning, setApiWarning] = useState('');

  // Step 2: Editable review sheet state
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [items, setItems] = useState<EditableStockItem[]>([]);
  const [newCatInput, setNewCatInput] = useState<{ [itemId: string]: string }>({});
  const [showNewCatInput, setShowNewCatInput] = useState<{ [itemId: string]: boolean }>({});

  useEffect(() => {
    if (isOpen) {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setImages([]);
      setErrorMsg('');
      setApiWarning('');
      setStep('upload');
      setItems([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const existingProducts = offlineDB.getProduits();
  const existingCategories = Array.from(
    new Set(existingProducts.map((p) => p.categorie).filter(Boolean))
  );

  // --- HORS-LIGNE / DEFAUT CATEGORIES ---
  const defaultCategoryList = [
    ...existingCategories,
    'À vérifier',
    'Vêtements',
    'Chaussures',
    'Accessoires',
    'Électronique',
    'Bières',
    'Softs',
    'Jus',
    'Vins & Spiritueux',
    'Plats / Snacks',
    'Produits Divers',
  ];
  const uniqueCategories = Array.from(new Set(defaultCategoryList));

  // --- GESTION DES PHOTOS ---
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    setErrorMsg('');
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // --- ANALYSE VIA backend /api/ai/scan-stock (CLAUDE VISION) ---
  const handleAnalyzeWithClaude = async () => {
    if (images.length === 0) {
      setErrorMsg('Veuillez ajouter au moins une photo du reçu ou du bon de livraison.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg('');
    setApiWarning('');

    try {
      const res = await fetch('/api/ai/scan-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          type_activite: etablissement?.type_activite || 'boutique',
          secteur_boutique: etablissement?.secteur_boutique || '',
          type_usage: usageType,
          categories_existantes: existingCategories,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error && data.error.includes('ANTHROPIC_API_KEY')) {
          setApiWarning(data.error);
          // Permettre de passer directement à la fiche modifiable avec une ligne vierge
          setItems([
            {
              id: `item-${Date.now()}-1`,
              article: 'Ex: Chemise Homme Coton',
              categorie: 'Vêtements',
              quantite: 10,
              prix_achat: 5000,
              prix_vente: 10000,
            },
          ]);
          setStep('review');
          setIsAnalyzing(false);
          return;
        }
        throw new Error(data.error || 'Erreur lors de la réponse de l\'IA Claude.');
      }

      const extractedItems: EditableStockItem[] = (data.items || []).map(
        (it: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          article: it.article || `Article ${idx + 1}`,
          categorie: it.categorie || 'À vérifier',
          quantite: Math.max(1, Number(it.quantite) || 1),
          prix_achat: Math.max(0, Number(it.prix_achat) || 0),
          prix_vente: Math.max(0, Number(it.prix_vente) || 0),
        })
      );

      if (extractedItems.length === 0) {
        // Si aucun article détecté, créer une ligne vierge par défaut
        setItems([
          {
            id: `item-${Date.now()}-1`,
            article: '',
            categorie: 'À vérifier',
            quantite: 1,
            prix_achat: 0,
            prix_vente: 0,
          },
        ]);
      } else {
        setItems(extractedItems);
      }

      setStep('review');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || 'Impossible d\'analyser l\'image. Vous pouvez basculer sur la fiche manuelle.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- IMPORT EXCEL / CSV ---
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) return;

        // Auto-détection du séparateur (virgule, point-virgule ou tabulation)
        const firstLine = lines[0];
        let sep = ',';
        if (firstLine.includes(';')) sep = ';';
        else if (firstLine.includes('\t')) sep = '\t';

        const parsedItems: EditableStockItem[] = [];

        // Ignorer l'entête si présent
        const hasHeader =
          firstLine.toLowerCase().includes('article') ||
          firstLine.toLowerCase().includes('nom') ||
          firstLine.toLowerCase().includes('produit');

        const startIndex = hasHeader ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const cols = lines[i].split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
          if (cols.length > 0 && cols[0]) {
            parsedItems.push({
              id: `csv-${Date.now()}-${i}`,
              article: cols[0] || 'Article',
              categorie: cols[1] || 'À vérifier',
              quantite: Math.max(1, Number(cols[2]) || 1),
              prix_achat: Math.max(0, Number(cols[3]) || 0),
              prix_vente: Math.max(0, Number(cols[4]) || 0),
            });
          }
        }

        if (parsedItems.length > 0) {
          setItems(parsedItems);
          setStep('review');
          setErrorMsg('');
        } else {
          setErrorMsg('Le fichier CSV est vide ou non reconnu.');
        }
      } catch (err) {
        setErrorMsg('Erreur lors de la lecture du fichier CSV/Excel.');
      }
    };
    reader.readAsText(file);
  };

  // --- TÉLÉCHARGER MODÈLE CSV ---
  const handleDownloadCSVTemplate = () => {
    const csvContent =
      'Nom_Article;Categorie;Quantite;Prix_Achat_Unitaire;Prix_Vente_Unitaire\n' +
      'Chemise Homme Pagne;Vêtements;15;7000;12000\n' +
      'Pantalon Jean Bleu;Vêtements;8;10000;18000\n' +
      'T-Shirt Coton Noir;Vêtements;20;3000;6000\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_inventaire_oeko.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- MANIPULATION DE LA FICHE MODIFIABLE ---
  const handleItemChange = (id: string, field: keyof EditableStockItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleAddBlankRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        article: '',
        categorie: 'À vérifier',
        quantite: 1,
        prix_achat: 0,
        prix_vente: 0,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // --- ENREGISTREMENT FINAL EN DATABASE ---
  const handleSaveToDatabase = () => {
    const validItems = items.filter((it) => it.article && it.article.trim().length > 0);
    if (validItems.length === 0) {
      setErrorMsg('Veuillez renseigner au moins un article valide.');
      return;
    }

    try {
      const res = offlineDB.bulkAddOrUpdateStock(
        validItems.map((it) => ({
          nom: it.article,
          categorie: it.categorie,
          quantite: it.quantite,
          prix_achat: it.prix_achat,
          prix_vente: it.prix_vente,
        })),
        usageType
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg('Erreur lors de l\'enregistrement en base de données.');
    }
  };

  const totalQty = items.reduce((acc, it) => acc + (Number(it.quantite) || 0), 0);
  const totalValueEst = items.reduce(
    (acc, it) => acc + (Number(it.quantite) || 0) * (Number(it.prix_vente) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-4 sm:p-6 w-full max-w-4xl shadow-2xl relative space-y-4 max-h-[92vh] flex flex-col my-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#E2D5C3] pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-xl font-black shadow-md">
              📸
            </div>
            <div>
              <h2 className="font-serif font-black text-lg sm:text-xl text-[#1B4332] flex items-center gap-2">
                <span>Saisie Rapide de Stock IA</span>
                <span className="text-[10px] bg-[#E8A33D] text-[#0F291E] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Claude Vision
                </span>
              </h2>
              <p className="text-xs text-gray-600 font-bold">
                Scan de reçu/cahier d'inventaire & Import Excel/CSV
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black p-2 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Secteur du Commerce (Badge d'Adaptation) */}
        {etablissement && (
          <div className="bg-[#1B4332] text-white p-3 rounded-2xl flex items-center justify-between text-xs font-bold shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E8A33D] shrink-0" />
              <span>
                Commerce : <strong className="text-[#E8A33D]">{etablissement.nom}</strong> ({etablissement.type_activite.toUpperCase()}
                {etablissement.secteur_boutique ? ` — ${etablissement.secteur_boutique}` : ''})
              </span>
            </div>
            <span className="hidden sm:inline-block text-[11px] bg-[#2D6A4F] text-emerald-200 px-2 py-0.5 rounded-lg">
              Adaptation IA Active
            </span>
          </div>
        )}

        {/* ERREUR BANNER */}
        {errorMsg && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-900 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* AVERTISSEMENT API KEY */}
        {apiWarning && (
          <div className="p-3 bg-amber-100 border border-amber-300 text-amber-950 rounded-2xl text-xs font-bold space-y-1 shrink-0">
            <div className="flex items-center gap-2 font-black text-amber-900">
              <Info className="w-4 h-4 text-amber-800" />
              <span>Clé API Anthropic non configurée</span>
            </div>
            <p className="text-[11px] opacity-90 leading-snug font-medium">
              {apiWarning} Vous avez été redirigé sur la <strong>Fiche Modifiable Vierge</strong> pour saisir vos articles directement.
            </p>
          </div>
        )}

        {/* --- STEP 1: SELECTION ET CHARGEMENT (UPLOAD) --- */}
        {step === 'upload' && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Navigation Onglets (Scan Photo vs Import CSV) */}
            <div className="flex items-center gap-2 bg-[#FBF7EF] p-1.5 rounded-2xl border border-[#E2D5C3]">
              <button
                onClick={() => setActiveTab('photo')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'photo'
                    ? 'bg-[#1B4332] text-white shadow-md'
                    : 'text-[#1B4332] hover:bg-[#E2D5C3]/40'
                }`}
              >
                <Camera className="w-4 h-4 text-[#E8A33D]" />
                <span>1. Scanner Photo / Reçu manuscrit</span>
              </button>
              <button
                onClick={() => setActiveTab('excel')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'excel'
                    ? 'bg-[#1B4332] text-white shadow-md'
                    : 'text-[#1B4332] hover:bg-[#E2D5C3]/40'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-[#E8A33D]" />
                <span>2. Importer Fichier Excel / CSV</span>
              </button>
            </div>

            {/* TAB 1 : SCAN PHOTO IA */}
            {activeTab === 'photo' && (
              <div className="space-y-4">
                {/* Choix du contexte d'usage */}
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-2">
                    Contexte de la saisie *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setUsageType('reapprovisionnement')}
                      className={`p-3 rounded-2xl border-2 text-left space-y-1 transition-all ${
                        usageType === 'reapprovisionnement'
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      <h4 className="font-bold text-xs flex items-center gap-1.5">
                        <span>🚚 Arrivage / Livraison</span>
                      </h4>
                      <p className="text-[10px] opacity-80 font-medium">
                        Reçu ou bon de livraison du fournisseur (s'ajoute au stock existant).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUsageType('initial')}
                      className={`p-3 rounded-2xl border-2 text-left space-y-1 transition-all ${
                        usageType === 'initial'
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      <h4 className="font-bold text-xs flex items-center gap-1.5">
                        <span>📦 Stock Initial</span>
                      </h4>
                      <p className="text-[10px] opacity-80 font-medium">
                        Cahier d'inventaire papier ou stock de démarrage lors de l'inscription.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUsageType('physique')}
                      className={`p-3 rounded-2xl border-2 text-left space-y-1 transition-all ${
                        usageType === 'physique'
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                          : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      <h4 className="font-bold text-xs flex items-center gap-1.5">
                        <span>📸 Étagère / Casiers</span>
                      </h4>
                      <p className="text-[10px] opacity-80 font-medium">
                        Photo directe des produits physiques pour estimation visuelle rapide.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Zone de chargement / prise de photo */}
                <div className="border-2 border-dashed border-[#1B4332]/40 rounded-3xl p-6 bg-[#FBF7EF] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif font-black text-sm text-[#1B4332]">
                      Prendre une photo ou sélectionner des images
                    </h4>
                    <p className="text-xs text-gray-600 font-medium">
                      Accepte reçus manuscrits, cahiers d'inventaire ou plusieurs photos de factures.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs cursor-pointer shadow-md transition-transform active:scale-95">
                    <Upload className="w-4 h-4 text-[#E8A33D]" />
                    <span>Choisir ou Photographier 📷</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Previews d'images */}
                {images.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-[#1B4332]">
                      Photos sélectionnées ({images.length}) :
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative rounded-2xl overflow-hidden border border-[#E2D5C3] bg-white group shadow-sm">
                          <img src={img} alt={`Aperçu ${idx + 1}`} className="w-full h-24 object-cover" />
                          <button
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700"
                            title="Supprimer la photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bouton d'action Analyse Claude */}
                <button
                  onClick={handleAnalyzeWithClaude}
                  disabled={isAnalyzing || images.length === 0}
                  className="w-full py-4 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-glow-brique transition-transform active:scale-95"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCcw className="w-5 h-5 animate-spin" />
                      <span>Analyse de l'image en cours par Claude IA Vision...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-white" />
                      <span>Analyser avec l'IA Claude Vision ➔</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2 : IMPORT EXCEL / CSV */}
            {activeTab === 'excel' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-[#1B4332]/40 rounded-3xl p-6 bg-[#FBF7EF] text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-6 h-6 text-[#1B4332]" />
                  </div>
                  <div>
                    <h4 className="font-serif font-black text-sm text-[#1B4332]">
                      Importer un fichier de stock (.csv, .xlsx, .xls)
                    </h4>
                    <p className="text-xs text-gray-600 font-medium">
                      Téléchargez le modèle CSV exemple ou chargez directement votre fichier d'inventaire.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleDownloadCSVTemplate}
                      type="button"
                      className="py-2.5 px-4 rounded-2xl bg-[#FBF7EF] border border-[#1B4332] hover:bg-[#E2D5C3]/40 text-[#1B4332] font-bold text-xs flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-[#B8442C]" />
                      <span>Télécharger le Modèle CSV exemple</span>
                    </button>

                    <label className="py-2.5 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs cursor-pointer flex items-center gap-2 shadow-md">
                      <Upload className="w-4 h-4 text-[#E8A33D]" />
                      <span>Choisir un Fichier CSV 📁</span>
                      <input
                        type="file"
                        accept=".csv, .tsv, .txt, .xlsx, .xls"
                        onChange={handleCSVImport}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-[#1B4332]/10 border border-[#1B4332]/20 rounded-2xl text-xs text-[#1B4332] font-medium space-y-1">
                  <p className="font-bold">Format des colonnes attendu dans le fichier CSV :</p>
                  <code className="block bg-[#FBF7EF] p-2 rounded-xl border border-[#E2D5C3] font-mono text-[11px]">
                    Nom_Article ; Categorie ; Quantite ; Prix_Achat_Unitaire ; Prix_Vente_Unitaire
                  </code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 2: FICHE MODIFIABLE DE VÉRIFICATION (REVIEW SHEET) --- */}
        {step === 'review' && (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            {/* Summary Bar */}
            <div className="bg-[#1B4332] text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
              <div className="flex items-center gap-3">
                <span className="bg-[#E8A33D] text-[#0F291E] px-2.5 py-1 rounded-xl font-black">
                  {items.length} article(s) détecté(s)
                </span>
                <span>Quantité totale : {totalQty} unités</span>
              </div>
              <div>
                <span>Valeur estimée : <strong className="text-[#E8A33D]">{totalValueEst.toLocaleString()} FCFA</strong></span>
              </div>
            </div>

            {/* Fiche Modifiable (Tableau ou Liste de Cartes) */}
            <div className="flex-1 overflow-y-auto border border-[#E2D5C3] rounded-2xl bg-[#FBF7EF] p-2 sm:p-3 space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 bg-white rounded-2xl border border-[#E2D5C3] shadow-sm space-y-2 hover:border-[#1B4332]/40 transition-colors"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Index & Article Name */}
                    <div className="sm:col-span-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#FBF7EF] border border-[#E2D5C3] text-[10px] font-black text-[#1B4332] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Nom de l'article *"
                        value={item.article}
                        onChange={(e) => handleItemChange(item.id, 'article', e.target.value)}
                        className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1B4332] focus:border-[#1B4332] focus:outline-none"
                      />
                    </div>

                    {/* Category Dropdown */}
                    <div className="sm:col-span-3">
                      {!showNewCatInput[item.id] ? (
                        <select
                          value={item.categorie}
                          onChange={(e) => {
                            if (e.target.value === 'NEW_CAT') {
                              setShowNewCatInput({ ...showNewCatInput, [item.id]: true });
                            } else {
                              handleItemChange(item.id, 'categorie', e.target.value);
                            }
                          }}
                          className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl px-2 py-1.5 text-xs font-bold text-[#1B4332] focus:outline-none"
                        >
                          {uniqueCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="NEW_CAT">➕ Nouvelle catégorie...</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Saisir catégorie"
                            value={newCatInput[item.id] || ''}
                            onChange={(e) =>
                              setNewCatInput({ ...newCatInput, [item.id]: e.target.value })
                            }
                            className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl px-2 py-1.5 text-xs font-bold text-[#1B4332]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newCatInput[item.id]) {
                                handleItemChange(item.id, 'categorie', newCatInput[item.id]);
                              }
                              setShowNewCatInput({ ...showNewCatInput, [item.id]: false });
                            }}
                            className="p-1.5 bg-[#1B4332] text-white rounded-lg text-xs font-bold"
                          >
                            OK
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quantité */}
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <span className="text-[10px] text-gray-500 font-bold sm:hidden">Qté:</span>
                      <input
                        type="number"
                        min={1}
                        placeholder="Qté"
                        value={item.quantite}
                        onChange={(e) =>
                          handleItemChange(item.id, 'quantite', Number(e.target.value))
                        }
                        className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl px-2 py-1.5 text-xs font-bold text-[#1B4332] text-center"
                      />
                    </div>

                    {/* Prix Vente / Prix Achat */}
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <span className="text-[10px] text-gray-500 font-bold sm:hidden">Prix Vente:</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Prix Vente FCFA"
                        value={item.prix_vente || ''}
                        onChange={(e) =>
                          handleItemChange(item.id, 'prix_vente', Number(e.target.value))
                        }
                        className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl px-2 py-1.5 text-xs font-bold text-[#1B4332] text-right"
                      />
                    </div>

                    {/* Trash Button */}
                    <div className="sm:col-span-1 text-right">
                      <button
                        onClick={() => handleRemoveRow(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Supprimer cet article"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddBlankRow}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#1B4332]/40 hover:bg-[#1B4332]/5 text-[#1B4332] font-black text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4 text-[#B8442C]" />
                <span>Ajouter une ligne d'article manuellement</span>
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#E2D5C3] shrink-0">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] hover:bg-[#E2D5C3]/40 text-[#1B4332] font-bold text-xs flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Recommencer le scan</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial py-3 px-4 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleSaveToDatabase}
                  className="flex-1 sm:flex-initial py-3 px-6 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Valider et Enregistrer en Stock ➔</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
