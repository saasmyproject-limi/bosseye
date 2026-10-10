'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MessageSquare,
  CreditCard,
  Bookmark,
  Edit2,
  Trash2,
  X,
  Check,
  Building2,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Client, Facture, Reservation, Etablissement } from '@/types';
import { syncShopToCloud } from '@/lib/supabaseSync';
import { fetchClientsFromCloud, saveClientToCloud, deleteClientFromCloud } from '@/lib/clientsSyncService';

export default function CommunClientsPage() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [nom, setNom] = useState('');
  const [phone, setPhone] = useState('');
  const [sexe, setSexe] = useState<'Homme' | 'Femme' | 'Autre'>('Femme');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const etab = offlineDB.getEtablissement();
      setEtablissement(etab);
      setFactures(offlineDB.getFactures());
      setReservations(offlineDB.getReservations());

      if (etab?.id) {
        const { clients: cloudClients } = await fetchClientsFromCloud(etab.id);
        setClients(cloudClients && cloudClients.length > 0 ? cloudClients : offlineDB.getClients());
      } else {
        setClients(offlineDB.getClients());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!c) return false;
    const matchNom = (c.nom || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchPhone = (c.telephone_whatsapp || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchNom || matchPhone;
  });

  const handleOpenAddModal = () => {
    setEditingClient(null);
    setNom('');
    setPhone('');
    setSexe('Femme');
    setNote('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Client) => {
    setEditingClient(c);
    setNom(c.nom || '');
    setPhone(c.telephone_whatsapp || '');
    setSexe(c.sexe || 'Femme');
    setNote('');
    setIsModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    if (editingClient) {
      saveClientToCloud({
        ...editingClient,
        nom: nom.trim(),
        telephone_whatsapp: phone.trim(),
        sexe,
      });
    } else {
      saveClientToCloud({
        id: '',
        etablissement_id: etablissement?.id || '',
        nom: nom.trim(),
        telephone_whatsapp: phone.trim(),
        sexe,
        created_at: new Date().toISOString(),
      });
    }

    if (etablissement) syncShopToCloud(etablissement.id);

    setIsModalOpen(false);
    loadData();
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce client de votre répertoire ?')) {
      deleteClientFromCloud(id);
      if (etablissement) syncShopToCloud(etablissement.id);
      loadData();
    }
  };

  // Calculs statistiques globaux
  const totalDettesActives = factures
    .filter((f) => f && f.statut === 'credit_encours' && (f.montant_restant || 0) > 0)
    .reduce((acc, f) => acc + (f.montant_restant || 0), 0);

  const totalReservationsActives = reservations
    .filter((r) => r && r.statut === 'en_attente')
    .length;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D5C3]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-0.5 rounded-full border border-[#B8442C]/30">
              Répertoire & CRM Client
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-black text-[#1B4332] mt-1">
              Gestion des Clients & Carnet d'Adresses
            </h1>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="py-3 px-5 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-[#E8A33D]" />
            <span>Nouveau Client</span>
          </button>
        </div>

        {/* Cartes Statistiques Clientèle */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Total Clients Enregistrés</span>
              <Users className="w-5 h-5 text-[#1B4332]" />
            </div>
            <p className="font-serif font-black text-2xl text-[#1B4332]">{clients.length} client(s)</p>
            <p className="text-[11px] text-gray-500">Sauvegardés et synchronisés sur le Cloud</p>
          </div>

          <div className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Dettes Clients En Cours</span>
              <CreditCard className="w-5 h-5 text-red-600" />
            </div>
            <p className="font-serif font-black text-2xl text-red-700">{totalDettesActives.toLocaleString('fr-FR')} FCFA</p>
            <p className="text-[11px] text-gray-500">À récupérer auprès de vos clients</p>
          </div>

          <div className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">Réservations Actives</span>
              <Bookmark className="w-5 h-5 text-purple-700" />
            </div>
            <p className="font-serif font-black text-2xl text-purple-900">{totalReservationsActives} réservation(s)</p>
            <p className="text-[11px] text-gray-500">Mises de côté avec acompte</p>
          </div>
        </div>

        {/* Filtre & Recherche */}
        <div className="bg-[#F3ECE0] p-4 rounded-3xl border border-[#E2D5C3]">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Rechercher par nom ou numéro WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-[#1B4332]"
            />
          </div>
        </div>

        {/* Grille des Fiches Clients */}
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#E2D5C3] text-gray-500 text-xs font-medium space-y-3">
            <Users className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="font-serif font-bold text-base text-[#1B4332]">Aucun client trouvé</p>
            <p>Ajoutez de nouveaux clients pour suivre leurs achats, dettes et réservations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((c) => {
              const clientFactures = factures.filter((f) => f && f.client_id === c.id);
              const debtFacture = clientFactures.find((f) => f.statut === 'credit_encours' && (f.montant_restant || 0) > 0);
              const currentDebt = debtFacture?.montant_restant || 0;
              const totalAchats = clientFactures.reduce((acc, f) => acc + (f.montant_total || 0), 0);
              const clientRes = reservations.filter((r) => r && r.client_id === c.id && r.statut === 'en_attente');

              return (
                <div key={c.id} className="bg-white border border-[#E2D5C3] rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-[#B8442C] transition-all">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center font-serif font-black text-lg shadow">
                          {c.nom.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif font-black text-base text-[#1B4332]">{c.nom}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332]">
                              {c.sexe === 'Homme' ? '👨 Homme' : c.sexe === 'Femme' ? '👩 Femme' : '👤 Client'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-bold mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-700" />
                            <span>{c.telephone_whatsapp || 'Sans numéro'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] hover:bg-[#E2D5C3] text-[#1B4332]"
                          title="Modifier les coordonnées"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(c.id)}
                          className="p-1.5 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats Spécifiques Client */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                        <span className="text-[10px] text-gray-500 block uppercase font-bold">Total Achats</span>
                        <span className="font-black text-[#1B4332]">{totalAchats.toLocaleString('fr-FR')} F</span>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3]">
                        <span className="text-[10px] text-gray-500 block uppercase font-bold">Dette En Cours</span>
                        <span className={`font-black ${currentDebt > 0 ? 'text-red-600' : 'text-emerald-800'}`}>
                          {currentDebt > 0 ? `${currentDebt.toLocaleString('fr-FR')} F` : '0 F (Solde OK)'}
                        </span>
                      </div>
                    </div>

                    {/* Badge Réservation si active */}
                    {clientRes.length > 0 && (
                      <div className="p-2.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 font-bold flex items-center justify-between">
                        <span>🔖 Réservations en cours :</span>
                        <span className="font-black">{clientRes.length} article(s)</span>
                      </div>
                    )}
                  </div>

                  {/* Bouton WhatsApp Direct */}
                  {c.telephone_whatsapp && (
                    <a
                      href={`https://wa.me/${c.telephone_whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4 text-white" />
                      <span>Contacter sur WhatsApp ➔</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL AJOUT / ÉDITION CLIENT */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleSaveClient} className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">
                  {editingClient ? 'Modifier le Client' : 'Nouveau Client'}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom Complet du Client *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mme Marie Jeanne"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full bg-white border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1">N° Téléphone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 699000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-[#E2D5C3] rounded-2xl p-3 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1B4332] block mb-1.5">Sexe / Genre du Client</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Femme', label: '👩 Femme' },
                    { id: 'Homme', label: '👨 Homme' },
                    { id: 'Autre', label: '👤 Autre' },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSexe(s.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        sexe === s.id
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-sm font-black'
                          : 'bg-white text-[#1B4332] border-[#E2D5C3]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-white border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] text-white font-black text-xs shadow-md"
                >
                  {editingClient ? 'Enregistrer les Modifications' : 'Ajouter le Client'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
