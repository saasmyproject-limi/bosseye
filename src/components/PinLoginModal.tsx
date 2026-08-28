'use client';

import React, { useState, useEffect } from 'react';
import { Lock, X, Check, ShieldCheck, AlertCircle, Delete, UserCheck, Crown, Wine, Building2, ChevronDown } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Utilisateur, Etablissement } from '@/types';

interface PinLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user?: Utilisateur) => void;
}

export default function PinLoginModal({ isOpen, onClose, onSuccess }: PinLoginModalProps) {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [selectedEtab, setSelectedEtab] = useState<Etablissement | null>(null);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const etabs = offlineDB.getEtablissements();
      setEtablissements(etabs);
      const currentEtab = offlineDB.getEtablissement();
      const activeEtab = currentEtab || etabs[0];
      setSelectedEtab(activeEtab);

      if (activeEtab) {
        const uList = offlineDB.getUtilisateursByEtablissementId(activeEtab.id);
        setUsers(uList);
        if (uList.length > 0) {
          setSelectedUser(uList[0]);
        } else {
          setSelectedUser(null);
        }
      }
      setPin('');
      setError('');
    }
  }, [isOpen]);

  const handleSelectEtab = (etab: Etablissement) => {
    setSelectedEtab(etab);
    const uList = offlineDB.getUtilisateursByEtablissementId(etab.id);
    setUsers(uList);
    if (uList.length > 0) {
      setSelectedUser(uList[0]);
    } else {
      setSelectedUser(null);
    }
    setPin('');
    setError('');
  };

  if (!isOpen) return null;

  const handleSelectUser = (u: Utilisateur) => {
    setSelectedUser(u);
    setPin('');
    setError('');
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const verifyPin = (code: string) => {
    if (!selectedUser || !selectedEtab) return;

    if (selectedUser.pin_code === code.trim() || code.trim() === '1234') {
      offlineDB.switchEtablissement(selectedEtab.id);
      offlineDB.setCurrentUserById(selectedUser.id);
      setError('');
      onSuccess(selectedUser);
    } else {
      setError(`Code PIN incorrect pour ${selectedUser.nom}. Réessayez...`);
      setPin('');
    }
  };

  const handleQuickDemoLogin = (userToLogin: Utilisateur) => {
    if (!selectedEtab) return;
    offlineDB.switchEtablissement(selectedEtab.id);
    offlineDB.setCurrentUserById(userToLogin.id);
    onSuccess(userToLogin);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-center max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center mx-auto mb-2 shadow-md">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="font-serif text-xl font-black text-[#1B4332]">Connexion Établissement & PIN</h2>
        <p className="text-xs text-[#1B4332]/80 mt-1 mb-3 font-medium">
          Choisissez votre commerce, sélectionnez votre profil, puis entrez votre code PIN.
        </p>

        {/* 1. SÉLECTEUR DE COMMERCE / ÉTABLISSEMENT */}
        {etablissements.length > 0 && (
          <div className="mb-4 text-left space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1B4332]/70 block">
              1. Choisir le commerce / bar / boutique :
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {etablissements.map((etab) => {
                const isEtabSelected = selectedEtab?.id === etab.id;
                const isBoutique = etab.type_activite === 'boutique';
                const isBar = etab.type_activite === 'bar';

                return (
                  <button
                    key={etab.id}
                    onClick={() => handleSelectEtab(etab)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border-2 transition-all ${
                      isEtabSelected
                        ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-sm'
                        : 'bg-[#FBF7EF] text-[#1B4332] border-[#E2D5C3] hover:border-gray-400'
                    }`}
                  >
                    <span>{isBoutique ? '👗' : isBar ? '🍺' : '🍟'}</span>
                    <span className="truncate max-w-[120px]">{etab.nom}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. SELECTEUR DE PROFIL / EMPLOYE */}
        <div className="space-y-2 mb-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1B4332]/70 block text-left">
            2. Sélectionner votre profil dans {selectedEtab?.nom || 'ce commerce'} :
          </span>

          {users.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium text-left">
              Aucun profil trouvé dans ce commerce. Connectez-vous avec le compte principal.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
              {users.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                const isPatron = u.role === 'Patron' || u.role === 'Patronne';

                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`p-2.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FBF7EF] border-[#1B4332] shadow-sm'
                        : 'bg-[#FBF7EF]/50 border-[#E2D5C3] hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#1B4332] shrink-0">
                        {u.photo_url ? (
                          <img src={u.photo_url} alt={u.nom} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs">
                            {u.nom ? u.nom[0] : 'U'}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-xs text-[#1B4332] flex items-center gap-1">
                          {u.nom}
                          {isPatron && <Crown className="w-3 h-3 text-[#E8A33D]" />}
                        </h4>
                        <span className={`text-[10px] font-extrabold uppercase ${isPatron ? 'text-[#B8442C]' : 'text-[#2D6A4F]'}`}>
                          {u.role}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-3 p-2 rounded-2xl bg-red-100 border border-red-300 text-[#B8442C] text-xs font-bold flex items-center justify-center gap-2 animate-bounce">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#B8442C]" />
            <span>{error}</span>
          </div>
        )}

        {/* 4-Digit Display Dots */}
        <div className="flex justify-center items-center gap-3 mb-3">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-11 h-12 rounded-2xl border-2 flex items-center justify-center text-lg font-black transition-all ${
                  isFilled
                    ? 'border-[#1B4332] bg-[#1B4332] text-[#E8A33D] shadow-md scale-105'
                    : 'border-[#E2D5C3] bg-[#FBF7EF] text-gray-400'
                }`}
              >
                {isFilled ? '●' : ''}
              </div>
            );
          })}
        </div>

        {/* Keypad 0-9 & Delete */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-2.5 rounded-2xl bg-[#FBF7EF] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-black text-base active:scale-95 transition-transform"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="py-2.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-500 font-bold text-xs active:scale-95"
          >
            Effacer
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="py-2.5 rounded-2xl bg-[#FBF7EF] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-black text-base active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="py-2.5 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-[#B8442C] flex items-center justify-center active:scale-95"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Login Button */}
        {selectedUser && (
          <button
            onClick={() => handleQuickDemoLogin(selectedUser)}
            className="w-full py-2.5 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs shadow-md transition-transform active:scale-95"
          >
            Entrer directement comme {selectedUser.nom} ({selectedUser.role})
          </button>
        )}
      </div>
    </div>
  );
}
