'use client';

import React, { useState, useEffect } from 'react';
import { History, Plus, Minus, AlertTriangle, Search, Filter, RefreshCcw } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { MouvementStock } from '@/types';

export default function CommunMouvementsPage() {
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
    offlineDB.syncOfflineQueue();
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

        {/* Mouvements Table */}
        <div className="bg-white border border-[#E2D5C3] rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3ECE0] text-[#1B4332] font-black uppercase border-b border-[#E2D5C3]">
                <tr>
                  <th className="p-4">Date & Heure</th>
                  <th className="p-4">Produit / Article</th>
                  <th className="p-4">Type Mouvement</th>
                  <th className="p-4 text-right">Quantité</th>
                  <th className="p-4">Motif / Note</th>
                  <th className="p-4">Auteur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D5C3]">
                {filteredMouvements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                      Aucun mouvement enregistré.
                    </td>
                  </tr>
                ) : (
                  filteredMouvements.map((m) => (
                    <tr key={m.id} className="hover:bg-[#FBF7EF] transition-colors">
                      <td className="p-4 font-bold text-gray-700">
                        {new Date(m.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="p-4 font-serif font-black text-[#1B4332]">
                        {m.produit?.nom || 'Inconnu'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${
                            m.type_mouvement === 'entree'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.type_mouvement === 'sortie'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {m.type_mouvement === 'entree'
                            ? '➕ Entrée'
                            : m.type_mouvement === 'sortie'
                            ? '➖ Sortie'
                            : '⚠️ Casse'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-[#1B4332]">
                        {m.quantite_bouteilles} pcs/btl
                      </td>
                      <td className="p-4 text-gray-600 font-medium">{m.note_motif || 'N/A'}</td>
                      <td className="p-4 font-bold text-[#1B4332]">{m.utilisateur?.nom || 'Système'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
