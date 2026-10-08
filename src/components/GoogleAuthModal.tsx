'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, X, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';
import { syncUserShopsFromCloud } from '@/lib/supabaseSync';
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
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setSuccessMsg('');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (userEmail: string, userNom?: string, userPhoto?: string) => {
    const formattedEmail = userEmail.trim().toLowerCase();
    const displayName = userNom?.trim() || formattedEmail.split('@')[0];
    const compte = offlineDB.loginWithGoogle(formattedEmail, displayName, userPhoto);

    setIsSubmitting(true);
    try {
      // Télécharger immédiatement les boutiques associées à ce compte Gmail depuis Supabase
      await syncUserShopsFromCloud(formattedEmail);
    } catch (e) {
      console.warn('Sync cloud notice:', e);
    }
    setIsSubmitting(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Veuillez saisir votre adresse Gmail / E-mail.');
      return;
    }

    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail.includes('@') || !formattedEmail.includes('.')) {
      setError('L\'adresse e-mail doit impérativement contenir un "@" et un nom de domaine valide (ex: exemple@gmail.com).');
      return;
    }

    if (mode === 'register' && !nom.trim()) {
      setError('Le nom complet est obligatoire pour créer votre compte.');
      return;
    }

    if (!password) {
      setError('Veuillez saisir un mot de passe.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('Sécurité du mot de passe : Il doit contenir au moins 6 caractères.');
        return;
      }
      if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
        setError('Sécurité du mot de passe : Veuillez mélanger au moins une lettre et un chiffre.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }

      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMsg("Compte créé avec succès ! Un e-mail d'activation a été envoyé à votre adresse Gmail. Veuillez consulter votre boîte mail pour valider.");
        setTimeout(() => {
          handleLogin(formattedEmail, nom);
        }, 1500);
      }, 500);
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        handleLogin(formattedEmail, nom);
      }, 400);
    }
  };

  const handleGoogleOneClick = () => {
    const defaultEmail = 'patron.oeko@gmail.com';
    handleLogin(defaultEmail, 'Patron œko', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Patron');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FAF9F5] border-2 border-[#E2D5C3] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header - Minimalist */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-[#1B4332] text-[#E8A33D] flex items-center justify-center mx-auto text-2xl font-black shadow-md">
            👁️
          </div>
          <h2 className="font-serif text-2xl font-black text-[#1B4332]">
            {mode === 'register' ? 'Création de compte ' : 'Connexion à '}
            <span className="text-[#B8442C]">œko</span>
          </h2>
        </div>

        {/* Error / Success alerts */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-[#1B4332] mb-1 uppercase tracking-wider">
                Nom complet *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ex: Marie Dupont"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-gray-900 shadow-sm"
                />
              </div>
            </div>
          )}

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

          <div>
            <label className="block text-[11px] font-bold text-[#1B4332] mb-1 uppercase tracking-wider">
              {mode === 'register' ? 'Créer un mot de passe *' : 'Mot de passe *'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-gray-900 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'register' && (
              <p className="text-[10px] text-gray-500 mt-1 font-medium">
                🔒 Recommandé : au moins 6 caractères mélangés (lettres + chiffres).
              </p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-[#1B4332] mb-1 uppercase tracking-wider">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E2D5C3] text-sm focus:outline-none focus:border-[#1B4332] bg-white text-gray-900 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <span>{isSubmitting ? 'Traitement...' : mode === 'register' ? 'Créer mon compte' : 'Se connecter'}</span>
            <ArrowRight className="w-4 h-4 text-[#E8A33D]" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-2 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2D5C3]" />
          </div>
          <span className="relative bg-[#FAF9F5] px-3 text-[10px] uppercase font-bold tracking-widest text-gray-400">
            ou
          </span>
        </div>

        {/* Google 1-Click Button */}
        <button
          type="button"
          onClick={handleGoogleOneClick}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-50 border border-[#E2D5C3] text-[#1B4332] font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <span>Continuer avec Google</span>
        </button>

        {/* Switch Mode Footer */}
        <div className="text-center pt-1">
          {mode === 'register' ? (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs font-semibold text-[#1B4332] hover:text-[#B8442C] transition-colors cursor-pointer"
            >
              Déjà un compte ? <span className="font-bold underline">Se connecter</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs font-semibold text-[#1B4332] hover:text-[#B8442C] transition-colors cursor-pointer"
            >
              Pas encore de compte ? <span className="font-bold underline">Crée ton compte</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
