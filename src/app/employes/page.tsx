'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Phone, Lock, X, Check, Camera, UserX, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Utilisateur, RoleUtilisateur } from '@/types';

export default function EmployesPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [nom, setNom] = useState('');
  const [role, setRole] = useState<RoleUtilisateur>('Employé');
  const [pinCode, setPinCode] = useState('');
  const [telephone, setTelephone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUtilisateurs(offlineDB.getUtilisateurs());
  };

  const handleOpenDialog = () => {
    setNom('');
    setRole('Employé');
    setPinCode('');
    setTelephone('');
    setPhotoUrl(null);
    setErrorMsg('');
    setIsDialogOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setErrorMsg('Le nom complet est obligatoire');
      return;
    }
    if (!pinCode.trim() || pinCode.length !== 4) {
      setErrorMsg('Le code PIN doit comporter exactement 4 chiffres');
      return;
    }

    offlineDB.addUtilisateur({
      nom: nom.trim(),
      role,
      pin_code: pinCode.trim(),
      telephone: telephone.trim(),
      photo_url: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      actif: true,
    });

    loadUsers();
    setIsDialogOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    offlineDB.toggleUtilisateurStatus(id);
    loadUsers();
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-white flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 max-w-7xl mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-brand-border/60">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange bg-brand-orangeLight px-2.5 py-1 rounded-full border border-brand-orange/30">
              Espace Patron / Gérant
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Gestion des Utilisateurs & PINs</h1>
          </div>

          <button
            onClick={handleOpenDialog}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orangeHover hover:to-amber-600 text-white font-black text-xs flex items-center gap-2 shadow-glow transition-transform active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Créer Utilisateur (PIN)</span>
          </button>
        </div>

        {/* Users List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {utilisateurs.map((u) => (
            <div
              key={u.id}
              className={`p-5 rounded-3xl border transition-all flex items-center justify-between shadow-card ${
                u.actif ? 'bg-brand-card border-brand-border' : 'bg-brand-card/40 border-brand-border/40 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-brand-orange shrink-0 shadow-md">
                  {u.photo_url ? (
                    <img src={u.photo_url} alt={u.nom} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-orange flex items-center justify-center font-bold text-white text-base">
                      {u.nom[0]}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-black text-sm text-white">{u.nom}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-orange/20 text-brand-orange border border-brand-orange/40 uppercase">
                      {u.role}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      PIN: {u.pin_code}
                    </span>
                  </div>
                </div>
              </div>

              {u.role !== 'Patron' && (
                <button
                  onClick={() => handleToggleStatus(u.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                    u.actif
                      ? 'bg-red-950/40 text-red-400 border-red-800/40 hover:bg-red-900/60'
                      : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900/60'
                  }`}
                >
                  {u.actif ? 'Désactiver' : 'Activer'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* DIALOG DE CRÉATION D'UTILISATEUR AVEC PIN A 4 CHIFFRES */}
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-brand-card border border-brand-border rounded-3xl p-6 w-full max-w-md shadow-glow relative">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-brand-black"
              >
                ✕
              </button>

              <h2 className="text-xl font-black text-white mb-1">Nouveau Membre (Code PIN)</h2>
              <p className="text-xs text-gray-400 mb-4">Attribuez un code PIN à 4 chiffres pour la connexion rapide.</p>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Nom Complet *</label>
                  <input
                    type="text"
                    placeholder="Ex: Chantal MBALLA"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full bg-brand-black border border-brand-border rounded-2xl p-3.5 text-white font-bold text-sm focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Rôle *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as RoleUtilisateur)}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                    >
                      <option value="Employé">Employé (Serveuse/Caissière)</option>
                      <option value="Gérant">Gérant</option>
                      <option value="Patron">Patron</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Code PIN à 4 Chiffres *</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Ex: 1234"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-amber-400 font-mono font-black text-center text-lg focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="699001122"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full bg-brand-black border border-brand-border rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-orange to-amber-500 text-white font-black text-base shadow-glow transition-transform active:scale-95 mt-2"
                >
                  Créer l'Utilisateur
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
