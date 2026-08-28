'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Phone, Lock, X, Check, Camera, UserX, AlertCircle, Crown } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { offlineDB } from '@/lib/offlineDB';
import { Utilisateur, RoleUtilisateur } from '@/types';

export default function EmployesPage() {
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
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
    try {
      setCurrentUser(offlineDB.getCurrentUser());
    } catch (e) { console.error(e); }
  }, []);

  const loadUsers = () => {
    try {
      setUtilisateurs(offlineDB.getUtilisateurs());
    } catch (e) { console.error(e); }
  };

  const canAddEmployee = ['Patron', 'Patronne', 'Directeur', 'Gérant'].includes(currentUser?.role || '');

  const handleOpenDialog = () => {
    if (!canAddEmployee) return;
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
    if (!canAddEmployee) {
      setErrorMsg('Seul le patron ou le gérant peut ajouter un employé à son compte.');
      return;
    }
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
    if (!canAddEmployee) return;
    offlineDB.toggleUtilisateurStatus(id);
    loadUsers();
  };

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#1B4332] flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E2D5C3]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#B8442C] bg-[#B8442C]/10 px-2.5 py-1 rounded-full border border-[#B8442C]/20">
              Espace Patron / Gérant
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#1B4332] mt-1">
              Gestion des Utilisateurs & PINs
            </h1>
          </div>

          {canAddEmployee ? (
            <button
              onClick={handleOpenDialog}
              className="py-2.5 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs flex items-center gap-2 shadow-md transition-transform active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-[#E8A33D]" />
              <span>+ Créer Utilisateur (PIN)</span>
            </button>
          ) : (
            <div className="py-2.5 px-4 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs flex items-center gap-2 shadow-sm">
              <Lock className="w-4 h-4 text-amber-800" />
              <span>Seul le patron peut ajouter un employé</span>
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {utilisateurs.map((u) => {
            const isPatron = u.role === 'Patron';
            return (
              <div
                key={u.id}
                className={`p-5 rounded-3xl border-2 transition-all flex items-center justify-between shadow-card ${
                  u.actif
                    ? 'bg-[#F3ECE0] border-[#E2D5C3] hover:border-[#1B4332]'
                    : 'bg-[#F3ECE0]/50 border-[#E2D5C3]/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#1B4332] bg-[#1B4332] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                    {u.photo_url ? (
                      <img src={u.photo_url} alt={u.nom} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(u.nom || 'U')[0]}</span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-serif font-black text-sm text-[#1B4332] flex items-center gap-1">
                      {u.nom}
                      {isPatron && <Crown className="w-3.5 h-3.5 text-[#E8A33D]" />}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${
                        isPatron ? 'bg-[#B8442C]/10 text-[#B8442C] border-[#B8442C]/20' : 'bg-[#1B4332]/10 text-[#2D6A4F] border-[#1B4332]/20'
                      }`}>
                        {u.role}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#1B4332] flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#E8A33D]" />
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
                        ? 'bg-[#B8442C]/10 text-[#B8442C] border-[#B8442C]/20 hover:bg-[#B8442C]/20'
                        : 'bg-[#1B4332]/10 text-[#2D6A4F] border-[#1B4332]/20 hover:bg-[#1B4332]/20'
                    }`}
                  >
                    {u.actif ? 'Désactiver' : 'Activer'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* DIALOG DE CRÉATION D'UTILISATEUR AVEC PIN A 4 CHIFFRES */}
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
              >
                ✕
              </button>

              <h2 className="font-serif text-xl font-black text-[#1B4332] mb-1">Nouveau Membre (Code PIN)</h2>
              <p className="text-xs text-[#1B4332]/80 mb-4 font-medium">Attribuez un code PIN à 4 chiffres pour la connexion rapide.</p>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-2xl bg-red-100 border border-red-300 text-[#B8442C] text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#B8442C]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Nom Complet *</label>
                  <input
                    type="text"
                    placeholder="Ex: Chantal MBALLA"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3.5 text-[#1B4332] font-bold text-sm focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">Rôle *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as RoleUtilisateur)}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-[#1B4332] font-bold text-xs focus:outline-none focus:border-[#1B4332]"
                    >
                      <option value="Employé">Employé (Serveuse/Caissière)</option>
                      <option value="Gérant">Gérant</option>
                      <option value="Patron">Patron</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1B4332] block mb-1">Code PIN à 4 Chiffres *</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Ex: 1234"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-[#1B4332] font-mono font-black text-center text-lg focus:outline-none focus:border-[#1B4332]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1B4332] block mb-1">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="699001122"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-2xl p-3 text-[#1B4332] font-bold text-xs focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-base shadow-md transition-transform active:scale-95 mt-2"
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
