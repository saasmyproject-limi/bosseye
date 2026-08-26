'use client';

import React, { useState, useEffect } from 'react';
import { History, Plus, Minus, AlertTriangle, Search, Filter, RefreshCcw, CheckCircle2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { MouvementStock } from '@/types';

export default function MouvementsPage() {
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('tous');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadMouvements();
  }, []);

  const loadMouvements = () => {
    setMouvements(offlineDB.getMouvements());
  };

  const handleSyncNow = () => {
    const syncedCount = offlineDB.syncOfflineQueue();
    loadMouvements();
  };

  const filteredMouvements = mouvements.filter((m) => {
    const matchesType = typeFilter === 'tous' || m.type_mouvement === typeFilter;
    const matchesSearch =
      m.produit?.nom.toLowerCase().includes(search.toLowerCase()) ||
      m.utilisateur?.nom.toLowerCase().includes(search.toLowerCase()) ||
      m.note_motif.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0F1115] text-white flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 max-w-7xl mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-brand-border/60">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange bg-brand-orangeLight px-2.5 py-1 rounded-full border border-brand-orange/30">
              Traçabilité Complète
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Historique des Mouvements de Stock</h1>
          </div>

          <button
            onClick={handleSyncNow}
            className="py-3 px-5 rounded-2xl bg-brand-card hover:bg-brand-hover border border-brand-border text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-card"
          >
            <RefreshCcw className="w-4 h-4 text-brand-orange" />
            <span>Synchroniser Mouvements</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Rechercher par produit, motif ou utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: 'tous', label: 'Tous' },
              { id: 'entree', label: '➕ Entrées' },
              { id: 'sortie', label: '➖ Sorties / Ventes' },
              { id: 'casse_perte', label: '⚠️ Casses / Pertes' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  typeFilter === f.id
                    ? 'bg-brand-orange text-white shadow-glow'
                    : 'bg-brand-card border border-brand-border text-gray-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Movements Table */}
        <div className="p-6 rounded-3xl bg-brand-card border border-brand-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-brand-black/80 text-gray-400 uppercase text-[10px] tracking-wider border-b border-brand-border">
                <tr>
                  <th className="py-3 px-4">Date / Heure</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Produit</th>
                  <th className="py-3 px-4">Quantité</th>
                  <th className="py-3 px-4">Auteur (PIN)</th>
                  <th className="py-3 px-4">Motif / Note</th>
                  <th className="py-3 px-4">Synchronisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {filteredMouvements.map((m) => {
                  const dateStr = new Date(m.created_at).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <tr key={m.id} className="hover:bg-brand-hover/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-400">{dateStr}</td>
                      <td className="py-3.5 px-4 font-black">
                        {m.type_mouvement === 'entree' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px]">
                            ➕ Entrée
                          </span>
                        ) : m.type_mouvement === 'sortie' ? (
                          <span className="px-2.5 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px]">
                            ➖ Sortie
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 text-[10px]">
                            ⚠️ Casse / Perte
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">{m.produit?.nom || 'Produit'}</td>
                      <td className="py-3.5 px-4 font-black text-amber-400">
                        {m.type_mouvement === 'entree' ? `+${m.quantite_bouteilles}` : `-${m.quantite_bouteilles}`} bouteilles
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        {m.utilisateur?.photo_url && (
                          <img src={m.utilisateur.photo_url} alt={m.utilisateur.nom} className="w-6 h-6 rounded-full object-cover" />
                        )}
                        <span>{m.utilisateur?.nom || 'Employé'} ({m.utilisateur?.role})</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-300 max-w-xs truncate">{m.note_motif}</td>
                      <td className="py-3.5 px-4">
                        {m.sync_status === 'synced' ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Synchro
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                            <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> En Attente (Offline)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
