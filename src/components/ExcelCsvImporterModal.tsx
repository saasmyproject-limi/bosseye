'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, Check, X, Trash2, Plus, AlertTriangle, Sparkles } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Produit, ModeSuiviStock, ExemplaireArticle } from '@/types';

interface ExcelCsvImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemImport {
  id: string;
  nom: string;
  categorie: string;
  quantite: number;
  prix_achat: number;
  prix_vente: number;
  mode_suivi: ModeSuiviStock;
  identifiant_unique?: string; // IMEI / OKO code
}

export default function ExcelCsvImporterModal({
  isOpen,
  onClose,
  onSuccess,
}: ExcelCsvImporterModalProps) {
  const [items, setItems] = useState<ItemImport[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  // Téléchargement d'un modèle CSV type
  const handleDownloadTemplate = () => {
    const header = 'Nom,Categorie,Quantite,PrixAchat,PrixVente,ModeSuivi,IdentifiantIMEI\n';
    const sampleRows =
      'Chemise Pagne Homme,Vêtements,10,7000,12000,quantite,\n' +
      'iPhone 13 Pro 256GB,Téléphones & Électronique,1,450000,550000,unite_serie,354928109283019\n' +
      'Paracétamol 500mg,Pharmacie,20,500,1000,lot_pharmacie,LOT-2026-09\n';

    const blob = new Blob([header + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_import_oeko.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parsing simple de fichier CSV/Texte
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error('Fichier vide ou illisible.');

        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) throw new Error('Aucune donnée d\'article trouvée dans le fichier.');

        const parsedItems: ItemImport[] = [];
        // Analyse ligne par ligne (délimiteur virgule ou point-virgule ou tabulation)
        lines.slice(1).forEach((line, idx) => {
          const cols = line.split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length >= 2 && cols[0]) {
            const nom = cols[0];
            const categorie = cols[1] || 'Article';
            const quantite = parseInt(cols[2], 10) || 1;
            const prix_achat = parseFloat(cols[3]) || 0;
            const prix_vente = parseFloat(cols[4]) || 0;
            let mode_suivi: ModeSuiviStock = 'quantite';
            if (cols[5] === 'unite_serie' || cols[5] === 'unite') mode_suivi = 'unite_serie';
            else if (cols[5] === 'lot_pharmacie' || cols[5] === 'lot') mode_suivi = 'lot_pharmacie';
            const identifiant_unique = cols[6] || undefined;

            parsedItems.push({
              id: `import-${idx}-${Date.now()}`,
              nom,
              categorie,
              quantite,
              prix_achat,
              prix_vente,
              mode_suivi,
              identifiant_unique,
            });
          }
        });

        if (parsedItems.length === 0) {
          throw new Error('Format de fichier invalide. Veuillez utiliser le modèle téléchargeable.');
        }

        setItems(parsedItems);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Erreur lors du traitement du fichier.');
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsText(file);
  };

  const handleUpdateItem = (id: string, field: keyof ItemImport, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddBlankRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `blank-${Date.now()}`,
        nom: 'Nouvel Article',
        categorie: 'Article',
        quantite: 1,
        prix_achat: 0,
        prix_vente: 0,
        mode_suivi: 'quantite',
      },
    ]);
  };

  const handleSaveAllToStock = () => {
    if (items.length === 0) return;
    const etab = offlineDB.getEtablissement();
    const existingProds = offlineDB.getProduits();

    const newProduits: Produit[] = items.map((item, idx) => {
      const prodId = `prod-imp-${Date.now()}-${idx}`;
      let generatedExemplaires: ExemplaireArticle[] | undefined = undefined;

      if (item.mode_suivi === 'unite_serie') {
        const idCode = item.identifiant_unique || offlineDB.generateUniqueArticleCode();
        generatedExemplaires = [
          {
            id: `ex-${prodId}-1`,
            produit_id: prodId,
            identifiant_unique: idCode,
            prix_achat_specifique: item.prix_achat,
            statut: 'en_stock',
          },
        ];
      }

      return {
        id: prodId,
        etablissement_id: etab.id,
        nom: item.nom.trim(),
        categorie: item.categorie.trim() || 'Article',
        unite: 'piece',
        mode_suivi: item.mode_suivi,
        quantite_totale: item.quantite,
        seuil_alerte: 3,
        prix_achat_unitaire: item.prix_achat,
        prix_vente_unitaire: item.prix_vente,
        cout_achat_unitaire_cmp: item.prix_achat,
        exemplaires: generatedExemplaires,
        actif: true,
        created_at: new Date().toISOString(),
      };
    });

    offlineDB.saveProduits([...newProduits, ...existingProds]);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-black p-1 rounded-xl bg-[#FBF7EF]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-xl font-black shadow-md">
            📊
          </div>
          <div>
            <h2 className="font-serif font-black text-xl text-[#1B4332]">Importation Excel / CSV</h2>
            <p className="text-xs text-gray-600 font-bold">
              Téléversez votre inventaire existant ou téléchargez le modèle type
            </p>
          </div>
        </div>

        {/* Action Header & Modèle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#FBF7EF] rounded-2xl border border-[#E2D5C3]">
          <div>
            <p className="text-xs font-bold text-[#1B4332]">Besoin d'un modèle structuré ?</p>
            <p className="text-[11px] text-gray-500 font-medium">Format supporté : CSV, XLS, XLSX (colonnes attendues : Nom, Catégorie, Quantité, Prix...)</p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="py-2 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-[#E8A33D]" />
            <span>Télécharger le Modèle CSV</span>
          </button>
        </div>

        {/* Input Fichier */}
        {items.length === 0 && (
          <div className="p-8 border-2 border-dashed border-[#1B4332]/40 rounded-3xl text-center bg-white space-y-3">
            <Upload className="w-10 h-10 text-[#B8442C] mx-auto" />
            <div>
              <p className="font-serif font-black text-base text-[#1B4332]">Sélectionnez votre fichier d'inventaire</p>
              <p className="text-xs text-gray-500 font-medium mt-1">Glissez-déposez ou cliquez ci-dessous pour choisir votre fichier (.csv, .xlsx)</p>
            </div>

            <label className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl bg-[#B8442C] text-white font-black text-xs shadow-md cursor-pointer hover:bg-[#9C3823] transition-all">
              <span>Choisir un fichier...</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls, text/csv, application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Grille de prévisualisation éditable */}
        {items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1B4332] bg-white px-3 py-1 rounded-full border border-[#E2D5C3]">
                {items.length} article(s) détecté(s) dans "{fileName}"
              </span>

              <button
                type="button"
                onClick={handleAddBlankRow}
                className="py-1.5 px-3 rounded-xl bg-[#1B4332] text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-[#E8A33D]" />
                <span>+ Ajouter une ligne</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E2D5C3] bg-white max-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FBF7EF] border-b border-[#E2D5C3] text-[11px] font-black text-[#1B4332] uppercase">
                  <tr>
                    <th className="p-3">Article</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Mode Suivi</th>
                    <th className="p-3 text-center">Qté</th>
                    <th className="p-3 text-right">Prix Achat</th>
                    <th className="p-3 text-right">Prix Vente</th>
                    <th className="p-3">IMEI / N° Série</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D5C3]">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FBF7EF]/50">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.nom}
                          onChange={(e) => handleUpdateItem(item.id, 'nom', e.target.value)}
                          className="w-full bg-white border border-[#E2D5C3] rounded-lg p-1.5 text-xs font-bold text-[#1B4332]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.categorie}
                          onChange={(e) => handleUpdateItem(item.id, 'categorie', e.target.value)}
                          className="w-full bg-white border border-[#E2D5C3] rounded-lg p-1.5 text-xs font-medium text-[#1B4332]"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={item.mode_suivi}
                          onChange={(e) => handleUpdateItem(item.id, 'mode_suivi', e.target.value as ModeSuiviStock)}
                          className="w-full bg-white border border-[#E2D5C3] rounded-lg p-1.5 text-[11px] font-bold text-[#1B4332]"
                        >
                          <option value="quantite">Quantité globale</option>
                          <option value="unite_serie">À l'unité / Serie</option>
                          <option value="lot_pharmacie">N° de Lot</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantite}
                          onChange={(e) => handleUpdateItem(item.id, 'quantite', parseInt(e.target.value, 10) || 1)}
                          className="w-16 bg-white border border-[#E2D5C3] rounded-lg p-1.5 text-xs font-bold text-center text-[#1B4332]"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={item.prix_achat}
                          onChange={(e) => handleUpdateItem(item.id, 'prix_achat', parseFloat(e.target.value) || 0)}
                          className="w-24 bg-white border border-[#E2D5C3] rounded-lg p-1.5 text-xs font-bold text-right text-[#1B4332]"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={item.prix_vente}
                          onChange={(e) => handleUpdateItem(item.id, 'prix_vente', parseFloat(e.target.value) || 0)}
                          className="w-24 bg-white border border-[#E2D5C3] rounded-lg p-1.5 text-xs font-bold text-right text-[#B8442C]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Optionnel (ex: 3549...)"
                          value={item.identifiant_unique || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'identifiant_unique', e.target.value)}
                          className="w-full bg-white border border-[#E2D5C3] rounded-lg p-1.5 text-[11px] font-mono text-gray-700"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItems([])}
                className="py-3 px-4 rounded-2xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-gray-800"
              >
                Recommencer / Réinitialiser
              </button>
              <button
                type="button"
                onClick={handleSaveAllToStock}
                className="flex-1 py-3.5 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Valider et Enregistrer ces {items.length} Articles en Stock ➔</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
