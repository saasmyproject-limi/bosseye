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
  const [etablissement, setEtablissement] = useState<any>(null);

  useEffect(() => {
    try {
      setEtablissement(offlineDB.getEtablissement());
    } catch (e) { console.error(e); }
    loadMouvements();
  }, []);

  const loadMouvements = () => {
    try {
      setMouvements(offlineDB.getMouvements());
    } catch (e) { console.error(e); }
  };

  const handleSyncNow = () => {
    const syncedCount = offlineDB.syncOfflineQueue();
    loadMouvements();
  };

  const filteredMouvements = mouvements.filter((m) => {
    if (!m) return false;
    const matchesType = typeFilter === 'tous' || m.type_mouvement === typeFilter;
    const prodName = m.produit?.nom || '';
    const userName = m.utilisateur?.nom || '';
    const motif = m.note_motif || '';

    const matchesSearch =
      prodName.toLowerCase().includes(search.toLowerCase()) ||
      userName.toLowerCase().includes(search.toLowerCase()) ||
      motif.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E2D5C3]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-1 rounded-full border border-[#B8442C]/20">
              Traçabilité Complète
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#1B4332] mt-1">
              Historique des Mouvements de Stock
            </h1>
          </div>

          <button
            onClick={handleSyncNow}
            className="py-2.5 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md"
          >
            <RefreshCcw className="w-4 h-4 text-[#E8A33D]" />
            <span>Synchroniser Mouvements</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Rechercher par produit, motif ou utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl py-2.5 pl-10 pr-4 text-xs text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
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
                    ? 'bg-[#1B4332] text-white shadow-md font-black'
                    : 'bg-[#F3ECE0] border border-[#E2D5C3] text-[#1B4332] hover:bg-[#EADECB]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Movements Table */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#F3ECE0] border border-[#E2D5C3] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1B4332]">
              <thead className="bg-[#FBF7EF] text-[#1B4332]/70 uppercase text-[10px] tracking-wider border-b border-[#E2D5C3]">
                <tr>
                  <th className="py-3 px-4">Date / Heure</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Produit</th>
                  <th className="py-3 px-4">Quantité</th>
                  <th className="py-3 px-4">Auteur (PIN)</th>
                  <th className="py-3 px-4">Motif / Note</th>
                  <th className="py-3 px-4">Statut Synchro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D5C3]">
                {filteredMouvements.map((m) => {
                  const dateStr = new Date(m.created_at).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <tr key={m.id} className="hover:bg-[#FBF7EF]/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-600">{dateStr}</td>
                      <td className="py-3.5 px-4 font-black">
                        {m.type_mouvement === 'entree' ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#1B4332]/10 text-[#2D6A4F] text-[10px] font-bold">
                            ➕ Entrée
                          </span>
                        ) : m.type_mouvement === 'sortie' ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#B8442C]/10 text-[#B8442C] text-[10px] font-bold">
                            ➖ Sortie
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-[#E8A33D]/20 text-[#1B4332] text-[10px] font-bold">
                            ⚠️ Casse / Perte
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1B4332]">{m.produit?.nom || 'Produit'}</td>
                      <td className="py-3.5 px-4 font-black text-[#1B4332]">
                        {m.type_mouvement === 'entree' ? `+${m.quantite_bouteilles}` : `-${m.quantite_bouteilles}`}{' '}
                        {etablissement?.type_activite === 'boutique' || m.produit?.unite === 'piece' ? 'pièce(s)' : 'bouteille(s)'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1B4332] flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-[#1B4332] bg-[#1B4332] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {m.utilisateur?.photo_url ? (
                            <img src={m.utilisateur.photo_url} alt={m.utilisateur.nom} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(m.utilisateur?.nom || 'E')[0]}</span>
                          )}
                        </div>
                        <span>{m.utilisateur?.nom || 'Employé'} ({m.utilisateur?.role || 'Staff'})</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-700 max-w-xs truncate">{m.note_motif}</td>
                      <td className="py-3.5 px-4">
                        {m.sync_status === 'synced' ? (
                          <span className="text-[#2D6A4F] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Synchro
                          </span>
                        ) : (
                          <span className="text-[#E8A33D] font-bold flex items-center gap-1 animate-pulse">
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
