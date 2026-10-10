'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { supabase } from '@/lib/supabase';
import { CompteUtilisateur } from '@/types';

interface GoogleAuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose?: () => void;
  onSuccess?: (compte: CompteUtilisateur) => void;
}

export default function GoogleAuthModal({
  isOpen,
  initialMode = 'register',
  onClose,
  onSuccess,
}: GoogleAuthModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      setEmail('');
      setNom('');
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  // Authentification Google directe via Supabase Auth (OAuth 2.0 sans mot de passe)
  const handleGoogleOAuthLogin = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/activites` 
        : 'https://bosseye-sooty.vercel.app/activites';

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (authError) {
        throw authError;
      }
    } catch (err: any) {
      console.error('Erreur Supabase OAuth Google:', err);
      // Fallback local gracieux si le provider Supabase n'est pas encore activé dans le dashboard
      setError(`Connexion Google Cloud : ${err?.message || 'Impossible d\'ouvrir la page Google. Vérifiez votre connexion internet.'}`);
      setIsSubmitting(false);
    }
  };

  const handleEmailQuickAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail || !formattedEmail.includes('@') || !formattedEmail.includes('.')) {
      setError('Veuillez saisir une adresse Gmail ou e-mail valide (ex: exemple@gmail.com).');
      return;
    }

    const displayName = nom.trim() || formattedEmail.split('@')[0];
    const compte = offlineDB.loginWithGoogle(formattedEmail, displayName);

    if (onSuccess) onSuccess(compte);

    const activites = offlineDB.getActivitesDuCompte(compte.id);
    if (activites.length === 0) {
      router.push('/activites?create=true');
    } else {
      offlineDB.switchEtablissement(activites[0].id);
      router.push('/activites');
    }

    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FAF9F5] border-2 border-[#E2D5C3] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200">
        {/* Bouton Fermer */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* En-tête */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center mx-auto text-2xl font-black shadow-md">
            👁️
          </div>
          <h2 className="font-serif text-2xl font-black text-[#1B4332]">
            Connexion à <span className="text-[#B8442C]">œko</span>
          </h2>
          <p className="text-xs text-gray-600 font-medium">
            Connectez-vous avec votre compte Google. Aucun mot de passe requis.
          </p>
        </div>

        {/* Messages d'erreur ou de succès */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium text-center">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Bouton Principal Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleOAuthLogin}
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-gray-50 border-2 border-[#1B4332] text-[#1B4332] font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isSubmitting ? 'Redirection vers Google...' : 'Se connecter avec Google'}</span>
        </button>

        {/* Séparateur */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2D5C3]" />
          </div>
          <span className="relative bg-[#FAF9F5] px-3 text-[10px] uppercase font-bold tracking-widest text-gray-400">
            ou saisie manuelle de l'e-mail
          </span>
        </div>

        {/* Accès rapide E-mail / Nom */}
        <form onSubmit={handleEmailQuickAccess} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-[#1B4332] mb-1 uppercase tracking-wider">
              Nom complet (optionnel)
            </label>
            <input
              type="text"
              placeholder="ex: Paul Biya"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-gray-900 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#1B4332] mb-1 uppercase tracking-wider">
              Adresse Gmail / E-mail *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="votre.adresse@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-gray-900 shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continuer avec cet e-mail</span>
            <ArrowRight className="w-4 h-4 text-[#E8A33D]" />
          </button>
        </form>

        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Connexion sécurisée via Supabase Cloud Auth</span>
        </div>
      </div>
    </div>
  );
}
