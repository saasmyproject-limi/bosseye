'use client';

import React, { useState } from 'react';
import { Lock, X, Check, ShieldCheck, AlertCircle, Delete } from 'lucide-react';
import { offlineDB } from '@/lib/offlineDB';

interface PinLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinLoginModal({ isOpen, onClose, onSuccess }: PinLoginModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#14161C] border border-brand-border rounded-3xl p-6 w-full max-w-sm shadow-glow relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-brand-black"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center mx-auto mb-3 shadow-glow">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-black text-white">Connexion par Code PIN</h2>
        <p className="text-xs text-gray-400 mt-1 mb-4">
          Entrez votre code à 4 chiffres (ex: <strong className="text-brand-orange">1234</strong> pour Patron, <strong className="text-amber-400">5678</strong> pour Gérant, <strong className="text-emerald-400">0000</strong> pour Serveuse).
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center justify-center gap-2 animate-bounce">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* 4-Digit Display Dots */}
        <div className="flex justify-center items-center gap-4 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                  isFilled
                    ? 'border-brand-orange bg-brand-orange/20 text-brand-orange shadow-glow scale-105'
                    : 'border-brand-border bg-brand-black text-gray-600'
                }`}
              >
                {isFilled ? '●' : ''}
              </div>
            );
          })}
        </div>

        {/* Keypad 0-9 & Delete */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-3.5 rounded-2xl bg-brand-card hover:bg-brand-hover border border-brand-border text-white font-black text-lg active:scale-95 transition-transform"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="py-3.5 rounded-2xl bg-brand-black border border-brand-border text-gray-400 font-bold text-xs active:scale-95"
          >
            Effacer
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="py-3.5 rounded-2xl bg-brand-card hover:bg-brand-hover border border-brand-border text-white font-black text-lg active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="py-3.5 rounded-2xl bg-brand-black border border-brand-border text-red-400 flex items-center justify-center active:scale-95"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
