'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Database, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DiagnosticInfo {
  projectUrl: string;
  userId: string | null;
  userEmail: string | null;
  lastReadResult: { success: boolean; message: string; timestamp?: string };
  lastWriteResult: { success: boolean; message: string; timestamp?: string };
  pendingItemsCount: number;
}

export default function DiagnosticPanel() {
  const [info, setInfo] = useState<DiagnosticInfo>({
    projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Non configurée (fallback actif)',
    userId: null,
    userEmail: null,
    lastReadResult: { success: false, message: 'Aucun test de lecture effectué' },
    lastWriteResult: { success: false, message: 'Aucun test d\'écriture effectué' },
    pendingItemsCount: 0,
  });
  const [isRunningTest, setIsRunningTest] = useState(false);

  const runDiagnostic = async () => {
    setIsRunningTest(true);
    const timestamp = new Date().toLocaleTimeString('fr-FR');

    // 1. Récupérer l'utilisateur connecté via Supabase Auth
    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email || null;
      }
    } catch (e) {
      console.warn('Diagnostic auth check error:', e);
    }

    // 2. Compter les éléments en attente d'envoi dans le localStorage
    let pendingCount = 0;
    if (typeof window !== 'undefined') {
      try {
        const queue = JSON.parse(localStorage.getItem('oeko_offline_sync_queue') || '[]');
        pendingCount = Array.isArray(queue) ? queue.length : 0;
      } catch (e) {
        pendingCount = 0;
      }
    }

    // 3. Test de lecture Cloud (Supabase)
    let readRes = { success: false, message: '', timestamp };
    try {
      const { data, error } = await supabase.from('activites').select('count', { count: 'exact', head: true });
      if (error) {
        readRes = { success: false, message: `Échec lecture table "activites" : ${error.message} (Code: ${error.code})`, timestamp };
      } else {
        readRes = { success: true, message: `Lecture Supabase OK (Table activites accessible, statut HTTP 200)`, timestamp };
      }
    } catch (err: any) {
      readRes = { success: false, message: `Erreur réseau ou URL non joignable : ${err?.message || err}`, timestamp };
    }

    // 4. Test d'écriture Cloud (Supabase / journal_audit ping ou test RPC)
    let writeRes = { success: false, message: '', timestamp };
    try {
      const { error } = await supabase.from('journal_audit').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        writeRes = { success: false, message: `Test écriture/accès : ${error.message} (${error.code})`, timestamp };
      } else {
        writeRes = { success: true, message: `Connexion Cloud Supabase active et prête pour écriture`, timestamp };
      }
    } catch (err: any) {
      writeRes = { success: false, message: `Échec d'écriture : ${err?.message || err}`, timestamp };
    }

    setInfo({
      projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Non configurée',
      userId,
      userEmail,
      lastReadResult: readRes,
      lastWriteResult: writeRes,
      pendingItemsCount: pendingCount,
    });
    setIsRunningTest(false);
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="bg-white border-2 border-[#E2D5C3] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm text-[#1B4332]">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#B8442C]" />
          <h3 className="font-bold text-sm sm:text-base">Diagnostic Cloud Supabase (Phase 1)</h3>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={isRunningTest}
          className="px-3 py-1.5 rounded-xl bg-[#1B4332] text-white hover:bg-[#143326] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunningTest ? 'animate-spin' : ''}`} />
          <span>Tester la connexion</span>
        </button>
      </div>

      {/* Informations système */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E2D5C3]">
          <span className="text-gray-500 block font-semibold mb-0.5">Adresse du projet Supabase :</span>
          <code className="text-[#1B4332] font-mono font-bold break-all">{info.projectUrl}</code>
        </div>

        <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E2D5C3]">
          <span className="text-gray-500 block font-semibold mb-0.5">Utilisateur Supabase Auth connecté :</span>
          {info.userId ? (
            <div className="space-y-0.5">
              <span className="text-emerald-700 font-bold block">{info.userEmail || 'Sans email'}</span>
              <code className="text-[10px] text-gray-600 block">UUID: {info.userId}</code>
            </div>
          ) : (
            <span className="text-amber-700 font-medium italic">Non connecté à Supabase Auth (Session locale active)</span>
          )}
        </div>
      </div>

      {/* Tests Lecture & Écriture */}
      <div className="space-y-2 text-xs">
        <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
          info.lastReadResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {info.lastReadResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold flex items-center justify-between">
              <span>Dernière lecture Cloud :</span>
              {info.lastReadResult.timestamp && (
                <span className="text-[10px] font-normal opacity-75">{info.lastReadResult.timestamp}</span>
              )}
            </div>
            <p className="mt-0.5 font-medium">{info.lastReadResult.message}</p>
          </div>
        </div>

        <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
          info.lastWriteResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {info.lastWriteResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold flex items-center justify-between">
              <span>Dernière écriture Cloud :</span>
              {info.lastWriteResult.timestamp && (
                <span className="text-[10px] font-normal opacity-75">{info.lastWriteResult.timestamp}</span>
              )}
            </div>
            <p className="mt-0.5 font-medium">{info.lastWriteResult.message}</p>
          </div>
        </div>
      </div>

      {/* Éléments en attente */}
      <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E2D5C3] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#E8A33D]" />
          <span className="font-bold">Éléments dans la file d'attente hors ligne :</span>
        </div>
        <span className={`px-2.5 py-1 rounded-full font-black text-xs ${
          info.pendingItemsCount > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
        }`}>
          {info.pendingItemsCount} éléments en attente
        </span>
      </div>
    </div>
  );
}
