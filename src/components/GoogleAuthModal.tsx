'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, User, Check, Sparkles, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { CompteUtilisateur } from '@/types';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: (compte: CompteUtilisateur) => void;
}

export default function GoogleAuthModal({ isOpen, onClose, onSuccess }: GoogleAuthModalProps) {
  const router = useRouter();
  const [customEmail, setCustomEmail] = useState('');
  const [customNom, setCustomNom] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!isOpen) return null;

  const demoAccounts = [
    {
      email: 'marie.dupont@gmail.com',
      nom: 'Marie Dupont',
      avatar: '👩‍💼',
      badge: 'Patronne (2 boutiques)',
    },
    {
      email: 'soeur.famille@gmail.com',
      nom: 'Sarah K. (Ta Sœur)',
      avatar: '👩‍🍳',
      badge: 'Nouveau compte',
    },
    {
      email: 'paul.eboua@gmail.com',
      nom: 'Paul Éboua',
      avatar: '👨‍💼',
      badge: 'Gérant Bar / Resto',
    },
  ];

  const handleLogin = (email: string, nom: string, photo_url?: string) => {
    const compte = offlineDB.loginWithGoogle(email, nom, photo_url);
    if (onSuccess) onSuccess(compte);

    // Vérifier les activités rattachées
    const activites = offlineDB.getActivitesDuCompte(compte.id);
    if (activites.length === 0) {
      // 0 activité -> Rediriger vers l'écran de création d'activité sans afficher un écran vide
      router.push('/activites?create=true');
    } else {
      // 1 ou plus -> Aller sur "Mes activités"
      router.push('/activites');
    }

    if (onClose) onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const email = customEmail.trim().toLowerCase();
    const formattedEmail = email.includes('@') ? email : `${email}@gmail.com`;
    const nom = customNom.trim() || formattedEmail.split('@')[0];
    handleLogin(formattedEmail, nom);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#F3ECE0] border-2 border-[#E2D5C3] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative space-y-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center mx-auto text-2xl font-black shadow-lg">
            👁️
          </div>
          <h2 className="font-serif text-2xl font-black text-[#1B4332]">
            Connexion à <span className="text-[#B8442C]">œko</span>
          </h2>
          <p className="text-xs text-[#1B4332]/80 font-bold max-w-xs mx-auto">
            Niveau 1 — Votre compte unique (Gmail uniquement). Vos commerces et activités seront rattachés ici.
          </p>
        </div>

        {/* Google 1-Click Button */}
        <div className="space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#1B4332]/70 text-center">
            Se connecter avec un compte Google
          </p>

          <div className="space-y-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => handleLogin(acc.email, acc.nom)}
                className="w-full bg-white hover:bg-[#FBF7EF] border-2 border-[#E2D5C3] hover:border-[#1B4332] rounded-2xl p-3.5 flex items-center justify-between transition-all group shadow-sm text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F3ECE0] flex items-center justify-center text-xl shadow-inner">
                    {acc.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[#1B4332] group-hover:text-[#B8442C] transition-colors flex items-center gap-2">
                      {acc.nom}
                      <span className="text-[10px] bg-[#E8A33D]/20 text-[#1B4332] px-2 py-0.5 rounded-md font-medium">
                        {acc.badge}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{acc.email}</div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-[#1B4332]/10 group-hover:bg-[#1B4332] group-hover:text-white flex items-center justify-center text-gray-600 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          {/* Toggle Custom Email input */}
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full py-2.5 text-xs text-[#1B4332] hover:text-[#B8442C] font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Utiliser une autre adresse Gmail...</span>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="bg-white/80 p-4 rounded-2xl border border-[#E2D5C3] space-y-3">
              <div className="text-xs font-bold text-[#1B4332]">Créer / Connecter mon Compte Gmail :</div>
              <input
                type="email"
                placeholder="votre.nom@gmail.com *"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-black"
              />
              <input
                type="password"
                placeholder="Mot de passe du compte *"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-black"
              />
              <input
                type="text"
                placeholder="Votre nom complet (optionnel)"
                value={customNom}
                onChange={(e) => setCustomNom(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-black"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#1B4332] rounded-xl hover:bg-[#143326]"
                >
                  Créer / Connecter mon Compte
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security badge footer */}
        <div className="pt-2 border-t border-[#E2D5C3] flex items-center justify-center gap-2 text-[11px] text-gray-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Inscription 100% sécurisée via Google OAuth</span>
        </div>
      </div>
    </div>
  );
}
