'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, ArrowLeft, PackageCheck, Sparkles, Plus, Minus } from 'lucide-react';
import { PRESET_CAMEROUN_PRODUCTS, PresetStockItem } from '@/lib/presetData';
import { offlineDB } from '@/lib/offlineDB';
import { Produit } from '@/types';

export default function OnboardingStockPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Étape 1 : IDs des produits cochés par la patronne (tous cochés par défaut pour faciliter)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    PRESET_CAMEROUN_PRODUCTS.map((p) => p.id)
  );

  // Étape 2 : Configuration détaillée du stock initial pour chaque produit coché
  const [configItems, setConfigItems] = useState<
    (PresetStockItem & {
      casiers_pleins: number;
      bouteilles_vrac: number;
      bouteilles_par_casier: 12 | 24;
      prix_achat_casier: number;
      prix_vente_bouteille: number;
    })[]
  >(
    PRESET_CAMEROUN_PRODUCTS.map((p) => ({
      ...p,
      casiers_pleins: p.casiers_pleins_default,
      bouteilles_vrac: p.bouteilles_vrac_default,
      bouteilles_par_casier: p.bouteilles_par_casier,
      prix_achat_casier: p.prix_achat_casier_default,
      prix_vente_bouteille: p.prix_vente_bouteille_default,
    }))
  );

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const updateItemConfig = (id: string, field: string, value: number) => {
    setConfigItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleFinish = () => {
    const boutique = offlineDB.getBoutique();
    const finalProduits: Produit[] = configItems
      .filter((item) => selectedIds.includes(item.id))
      .map((item) => ({
        id: item.id,
        boutique_id: boutique.id,
        nom: item.nom,
        photo_url: item.photo_url,
        casiers_pleins: Number(item.casiers_pleins) || 0,
        bouteilles_vrac: Number(item.bouteilles_vrac) || 0,
        bouteilles_par_casier: item.bouteilles_par_casier,
        prix_achat_casier: Number(item.prix_achat_casier) || 0,
        prix_vente_bouteille: Number(item.prix_vente_bouteille) || 0,
        stock_seuil_alerte: 5,
        actif: true,
      }));

    offlineDB.saveProduits(finalProduits);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-brand-black text-white p-4 max-w-lg mx-auto pb-28 pt-4">
      {/* En-tête de progression */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[10px] font-bold text-brand-orange bg-brand-orangeLight px-2.5 py-1 rounded-full uppercase border border-brand-orange/30">
            Étape {step} sur 2
          </span>
          <h1 className="text-xl font-black text-white mt-1">
            {step === 1 ? 'Quels produits vendez-vous ?' : 'Entrez votre stock actuel'}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange font-bold">
          {step}/2
        </div>
      </div>

      {/* ÉTAPE 1 : GRILLE 3 COLONNES D'IMAGES PRÉ-REMPLIES */}
      {step === 1 && (
        <div>
          <p className="text-xs text-gray-400 mb-4">
            Cochez simplement les boissons et plats disponibles dans votre snack/bar à Yaoundé :
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {PRESET_CAMEROUN_PRODUCTS.map((product) => {
              const isChecked = selectedIds.includes(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => toggleSelect(product.id)}
                  className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all active:scale-95 flex flex-col justify-between p-2 h-36 ${
                    isChecked
                      ? 'border-brand-orange bg-brand-orange/15 shadow-glow'
                      : 'border-brand-border bg-brand-card opacity-60'
                  }`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center -z-10 brightness-50"
                    style={{ backgroundImage: `url(${product.photo_url})` }}
                  />

                  <div className="flex justify-end">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                        isChecked ? 'bg-brand-orange text-white' : 'bg-gray-800 text-gray-400 border border-gray-600'
                      }`}
                    >
                      {isChecked && <Check className="w-4 h-4" />}
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold uppercase text-brand-orange bg-black/70 px-1.5 py-0.5 rounded-full inline-block mb-0.5">
                      {product.categorie}
                    </span>
                    <h3 className="text-xs font-bold text-white leading-tight drop-shadow">
                      {product.nom}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            disabled={selectedIds.length === 0}
            onClick={() => setStep(2)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-base flex items-center justify-center gap-2 shadow-glow transition-transform active:scale-95 disabled:opacity-50"
          >
            <span>Continuer avec {selectedIds.length} produit(s)</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ÉTAPE 2 : CARDS DE CONFIGURATION STOCK POUR TOUS LES ARTICLES COCHÉS */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Remplissez les chiffres pour chaque produit (ou laissez les valeurs recommandées) :
          </p>

          {configItems
            .filter((item) => selectedIds.includes(item.id))
            .map((item) => {
              const totalBouteilles = item.casiers_pleins * item.bouteilles_par_casier + item.bouteilles_vrac;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl bg-brand-card border border-brand-border space-y-3.5 shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.photo_url}
                      alt={item.nom}
                      className="w-12 h-12 rounded-2xl object-cover border border-brand-border"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-white">{item.nom}</h3>
                      <span className="text-xs text-brand-orange font-semibold">
                        Stock calculé : {item.casiers_pleins}c + {item.bouteilles_vrac}b = {totalBouteilles} bouteilles
                      </span>
                    </div>
                  </div>

                  {/* Ligne 1 : Casiers pleins & Bouteilles vrac */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">
                        Casiers pleins ?
                      </label>
                      <div className="flex items-center bg-brand-black border border-brand-border rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemConfig(item.id, 'casiers_pleins', Math.max(0, item.casiers_pleins - 1))
                          }
                          className="w-8 h-8 rounded-lg bg-brand-border text-white flex items-center justify-center font-bold"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.casiers_pleins}
                          onChange={(e) =>
                            updateItemConfig(item.id, 'casiers_pleins', parseInt(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-center font-black text-white text-base focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateItemConfig(item.id, 'casiers_pleins', item.casiers_pleins + 1)}
                          className="w-8 h-8 rounded-lg bg-brand-orange text-white flex items-center justify-center font-bold"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">
                        Bouteilles vrac ?
                      </label>
                      <div className="flex items-center bg-brand-black border border-brand-border rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemConfig(item.id, 'bouteilles_vrac', Math.max(0, item.bouteilles_vrac - 1))
                          }
                          className="w-8 h-8 rounded-lg bg-brand-border text-white flex items-center justify-center font-bold"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.bouteilles_vrac}
                          onChange={(e) =>
                            updateItemConfig(item.id, 'bouteilles_vrac', parseInt(e.target.value) || 0)
                          }
                          className="w-full bg-transparent text-center font-black text-white text-base focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateItemConfig(item.id, 'bouteilles_vrac', item.bouteilles_vrac + 1)}
                          className="w-8 h-8 rounded-lg bg-brand-orange text-white flex items-center justify-center font-bold"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ligne 2 : Bouteilles / Casier (Boutons 12 ou 24) */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-300 block mb-1">
                      Bouteilles par casier ?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateItemConfig(item.id, 'bouteilles_par_casier', 12)}
                        className={`py-2 rounded-xl font-bold text-xs border transition-all ${
                          item.bouteilles_par_casier === 12
                            ? 'bg-brand-orange text-white border-brand-orange shadow-glow'
                            : 'bg-brand-black text-gray-400 border-brand-border'
                        }`}
                      >
                        [ 12 bouteilles ]
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItemConfig(item.id, 'bouteilles_par_casier', 24)}
                        className={`py-2 rounded-xl font-bold text-xs border transition-all ${
                          item.bouteilles_par_casier === 24
                            ? 'bg-brand-orange text-white border-brand-orange shadow-glow'
                            : 'bg-brand-black text-gray-400 border-brand-border'
                        }`}
                      >
                        [ 24 bouteilles ]
                      </button>
                    </div>
                  </div>

                  {/* Ligne 3 : Prix d'achat casier & Prix de vente bouteille */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-brand-border/50">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-0.5">
                        Prix Achat Casier (FCFA)
                      </label>
                      <input
                        type="number"
                        value={item.prix_achat_casier}
                        onChange={(e) =>
                          updateItemConfig(item.id, 'prix_achat_casier', parseInt(e.target.value) || 0)
                        }
                        className="w-full bg-brand-black border border-brand-border rounded-xl p-2 font-bold text-amber-400 text-sm text-center focus:outline-none focus:border-brand-orange"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-0.5">
                        Prix Vente Bouteille (FCFA)
                      </label>
                      <input
                        type="number"
                        value={item.prix_vente_bouteille}
                        onChange={(e) =>
                          updateItemConfig(item.id, 'prix_vente_bouteille', parseInt(e.target.value) || 0)
                        }
                        className="w-full bg-brand-black border border-brand-border rounded-xl p-2 font-bold text-emerald-400 text-sm text-center focus:outline-none focus:border-brand-orange"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Boutons d'action bas de page */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-4 px-4 rounded-2xl bg-brand-card hover:bg-brand-hover border border-brand-border font-bold text-gray-300 flex items-center justify-center gap-1 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>

            <button
              type="button"
              onClick={handleFinish}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-base flex items-center justify-center gap-2 shadow-glow transition-transform active:scale-95"
            >
              <PackageCheck className="w-5 h-5" />
              <span>Valider & Lancer Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
