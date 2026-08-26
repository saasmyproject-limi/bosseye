'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, X, User, ShieldAlert } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { CassePerte, Employe, Produit } from '@/types';

export default function CassesPertesPage() {
  const [casses, setCasses] = useState<CassePerte[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [selectedProduitId, setSelectedProduitId] = useState('');
  const [quantiteBouteilles, setQuantiteBouteilles] = useState(1);
  const [motif, setMotif] = useState('');
  const [responsableId, setResponsableId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCasses(offlineDB.getCassesPertes());
    const prods = offlineDB.getProduits();
    const emps = offlineDB.getEmployes();
    setProduits(prods);
    setEmployes(emps);

    if (prods.length > 0 && !selectedProduitId) setSelectedProduitId(prods[0].id);
    if (emps.length > 0 && !responsableId) setResponsableId(emps[0].id);
  };

  const handleSaveCasse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduitId || !motif.trim() || !responsableId) return;

    const boutique = offlineDB.getBoutique();
    offlineDB.addCassePerte({
      boutique_id: boutique.id,
      produit_id: selectedProduitId,
      quantite_bouteilles: Number(quantiteBouteilles) || 1,
      motif: motif.trim(),
      responsable_id: responsableId,
    });

    loadData();
    setIsDialogOpen(false);
    setMotif('');
    setQuantiteBouteilles(1);
  };

  return (
    <main className="min-h-screen bg-brand-black text-white p-4 max-w-lg mx-auto pb-28 pt-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="text-[10px] font-bold text-red-400 bg-red-950/80 px-2.5 py-1 rounded-full uppercase border border-red-500/40">
            Registre des Pertes
          </span>
          <h1 className="text-2xl font-black text-white mt-1">Casses & Pertes</h1>
        </div>

        <button
          onClick={() => setIsDialogOpen(true)}
          className="py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-glow transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Signaler Perte</span>
        </button>
      </div>

      {casses.length === 0 ? (
        <div className="text-center py-12 bg-brand-card border border-brand-border rounded-3xl p-6">
          <ShieldAlert className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="font-bold text-base text-gray-300">Aucune perte enregistrée</h3>
          <p className="text-xs text-gray-500 mt-1">
            Signalez toute bouteille cassée ou manquante avec la photo du responsable.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {casses.map((c) => {
            const dateStr = new Date(c.created_at).toLocaleString('fr-FR', {
              dateStyle: 'short',
              timeStyle: 'short',
            });

            return (
              <div
                key={c.id}
                className="p-4 rounded-3xl bg-brand-card border border-brand-border flex items-center justify-between shadow-card"
              >
                <div className="flex items-center gap-3">
                  {/* Photo du Responsable obligatoire */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-red-500 shrink-0">
                    {c.responsable?.photo_url ? (
                      <img
                        src={c.responsable.photo_url}
                        alt={c.responsable.nom}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-red-600 flex items-center justify-center font-bold text-white text-xs">
                        {c.responsable?.nom[0] || 'R'}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white">
                      {c.produit?.nom || 'Produit'} (x{c.quantite_bouteilles})
                    </h3>
                    <p className="text-xs text-red-400 font-semibold mt-0.5">Motif: {c.motif}</p>
                    <span className="text-[10px] text-gray-400">
                      Par <strong>{c.responsable?.nom}</strong> • {dateStr}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DIALOG DE DÉCLARATION DE PERTE */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 w-full max-w-md shadow-glow relative">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-brand-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Signaler Casse / Perte
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Ce stock sera immédiatement décrémenté du total.
            </p>

            <form onSubmit={handleSaveCasse} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Produit concerné *</label>
                <select
                  value={selectedProduitId}
                  onChange={(e) => setSelectedProduitId(e.target.value)}
                  className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-bold text-sm focus:outline-none focus:border-red-500"
                >
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} (Stock actuel: {p.casiers_pleins}c + {p.bouteilles_vrac}b)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Quantité de bouteilles *</label>
                <input
                  type="number"
                  min="1"
                  value={quantiteBouteilles}
                  onChange={(e) => setQuantiteBouteilles(parseInt(e.target.value) || 1)}
                  className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-bold text-base focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Motif de la casse / perte *</label>
                <input
                  type="text"
                  placeholder="Ex: Bouteille glissée du plateau, bouteille cassée au bar..."
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-bold text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              {/* SELECTION DU RESPONSABLE AVEC APERÇU PHOTO */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Employé Responsable (Photo) *</label>
                <select
                  value={responsableId}
                  onChange={(e) => setResponsableId(e.target.value)}
                  className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-bold text-sm focus:outline-none focus:border-red-500"
                >
                  {employes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-base shadow-glow transition-transform active:scale-95"
              >
                Enregistrer la Perte
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
