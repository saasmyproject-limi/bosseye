'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Phone, Lock, X, Check, Camera, UserX, AlertCircle, Crown } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { offlineDB } from '@/lib/offlineDB';
import { Utilisateur, RoleUtilisateur } from '@/types';

export default function CommunEmployesPage() {
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
    <AppLayout>
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
              className="py-3 px-5 rounded-2xl bg-[#B8442C] hover:bg-[#9C3823] text-white font-black text-xs shadow-glow-brique flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouveau Compte / PIN</span>
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-800" />
              <span>Droit limité : Seul le gérant gère les accès.</span>
            </div>
          )}
        </div>

        {/* Grille des Utilisateurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {utilisateurs.map((u) => {
            const isPatron = ['Patron', 'Patronne', 'Directeur', 'Gérant'].includes(u.role);
            return (
              <div
                key={u.id}
                className={`bg-white border-2 rounded-3xl p-5 shadow-sm space-y-3 relative flex flex-col justify-between ${
                  u.actif ? 'border-[#E2D5C3]' : 'border-red-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center text-xl font-bold font-serif">
                    {u.nom.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-base text-[#1B4332] flex items-center gap-1.5">
                      {u.nom}
                      {isPatron && <Crown className="w-4 h-4 text-amber-500" />}
                    </h3>
                    <span className="text-[10px] font-black text-[#B8442C] uppercase bg-[#B8442C]/10 px-2 py-0.5 rounded-full">
                      {u.role}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold text-gray-700">
                    <span>Code PIN d'accès :</span>
                    <span
                      className={`font-black px-2 py-0.5 rounded border ${
                        canAddEmployee || u.id === currentUser?.id
                          ? 'text-[#1B4332] bg-white border-[#E2D5C3]'
                          : 'text-gray-500 bg-gray-100 border-gray-300 font-mono'
                      }`}
                    >
                      {canAddEmployee || u.id === currentUser?.id ? `🔑 ${u.pin_code}` : '🔑 •••• (Confidentiel)'}
                    </span>
                  </div>
                  {u.telephone && (
                    <div className="flex justify-between items-center text-gray-500 font-medium">
                      <span>Téléphone :</span>
                      <span>{u.telephone}</span>
                    </div>
                  )}
                </div>

                {canAddEmployee && u.id !== currentUser?.id && (
                  <button
                    onClick={() => handleToggleStatus(u.id)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      u.actif
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {u.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Création Utilisateur */}
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveUser}
              className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D5C3]">
                <h3 className="font-serif font-black text-xl text-[#1B4332]">Ajouter un Employé / PIN</h3>
                <button type="button" onClick={() => setIsDialogOpen(false)} className="text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-100 text-red-900 text-xs font-bold border border-red-300">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Marie Vendeuse, Jean Caissier..."
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Rôle *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  >
                    <option value="Employé">Employé / Vendeuse</option>
                    <option value="Serveuse">Serveuse</option>
                    <option value="Caissière">Caissière</option>
                    <option value="Gérant">Gérant</option>
                    <option value="Patron">Patron</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1B4332] mb-1">Code PIN (4 chiffres) *</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="ex: 1234"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B4332] mb-1">Téléphone (Optionnel)</label>
                <input
                  type="tel"
                  placeholder="ex: 699000000"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full bg-[#FBF7EF] border border-[#E2D5C3] rounded-xl p-2.5 text-xs font-bold text-[#1B4332]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="py-3 px-4 rounded-xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-xs shadow-md"
                >
                  Créer le Compte
                </button>
              </div>
            </form>
          </div>
        )}
    </AppLayout>
  );
}
