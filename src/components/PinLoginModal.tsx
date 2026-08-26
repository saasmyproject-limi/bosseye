'use client';

import React, { useState, useEffect } from 'react';
import { Lock, X, Check, ShieldCheck, AlertCircle, Delete, UserCheck, Crown, Wine } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { Utilisateur } from '@/types';

interface PinLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinLoginModal({ isOpen, onClose, onSuccess }: PinLoginModalProps) {
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const uList = offlineDB.getUtilisateurs();
      setUsers(uList);
      if (uList.length > 0) {
        setSelectedUser(uList[0]);
      }
      setPin('');
      setError('');
    }
  }, [isOpen]);

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
    const res = offlineDB.loginWithPin(code);
    if (res) {
      setError('');
      onSuccess();
    } else {
      setError('Code PIN incorrect. Réessayez...');
      setPin('');
    }
  };

  const handleQuickDemoLogin = (userToLogin: Utilisateur) => {
    offlineDB.setCurrentUserById(userToLogin.id);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-black p-1.5 rounded-full bg-[#FBF7EF]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center mx-auto mb-3 shadow-md">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="font-serif text-xl font-black text-[#1B4332]">Connexion au Bar / Espace</h2>
        <p className="text-xs text-[#1B4332]/80 mt-1 mb-4 font-medium">
          Choisissez votre profil (**Patron** ou **Serveur/Employé**) puis saisissez votre code PIN.
        </p>

        {/* 1. SELECTEUR DE PROFIL / RÔLE (Patron vs Serveur) */}
        <div className="space-y-2 mb-5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1B4332]/70 block text-left">
            Sélectionner le profil utilisateur :
          </span>

          <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              const isPatron = u.role === 'Patron';

              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#FBF7EF] border-[#1B4332] shadow-sm'
                      : 'bg-[#FBF7EF]/50 border-[#E2D5C3] hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#1B4332] shrink-0">
                      {u.photo_url ? (
                        <img src={u.photo_url} alt={u.nom} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs">
                          {u.nom ? u.nom[0] : 'U'}
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-xs text-[#1B4332] flex items-center gap-1.5">
                        {u.nom}
                        {isPatron && <Crown className="w-3 h-3 text-[#E8A33D]" />}
                      </h4>
                      <span className={`text-[10px] font-extrabold uppercase ${isPatron ? 'text-[#B8442C]' : 'text-[#2D6A4F]'}`}>
                        {u.role} • PIN: {u.pin_code}
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
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-2xl bg-red-100 border border-red-300 text-[#B8442C] text-xs font-bold flex items-center justify-center gap-2 animate-bounce">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#B8442C]" />
            <span>{error}</span>
          </div>
        )}

        {/* 4-Digit Display Dots */}
        <div className="flex justify-center items-center gap-4 mb-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
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
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-3 rounded-2xl bg-[#FBF7EF] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-black text-lg active:scale-95 transition-transform"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="py-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-gray-500 font-bold text-xs active:scale-95"
          >
            Effacer
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="py-3 rounded-2xl bg-[#FBF7EF] hover:bg-[#EADECB] border border-[#E2D5C3] text-[#1B4332] font-black text-lg active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="py-3 rounded-2xl bg-[#FBF7EF] border border-[#E2D5C3] text-[#B8442C] flex items-center justify-center active:scale-95"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Login Button */}
        {selectedUser && (
          <button
            onClick={() => handleQuickDemoLogin(selectedUser)}
            className="w-full py-3 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs shadow-md transition-transform active:scale-95"
          >
            Entrer directement comme {selectedUser.nom} ({selectedUser.role})
          </button>
        )}
      </div>
    </div>
  );
}
