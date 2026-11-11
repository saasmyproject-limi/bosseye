import { createClient } from '@supabase/supabase-js';

// Nettoyer rigoureusement l'URL pour retirer tout suffixe "/rest/v1" ou slash final configuré par mégarde dans Vercel
let rawUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://efxjaxjslivudhnsbvwm.supabase.co'
).trim();
rawUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

const supabaseUrl = rawUrl;
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGpheGpzbGl2dWRobnNidndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MTk5MDQsImV4cCI6MjEwMzI5NTkwNH0.OxhgOTtj4ULhFgAlR7kunO2vSg1IJyS4CWE33vSI3qE'
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn(
      '[Supabase] ATTENTION: Les variables NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY sont manquantes dans votre environnement Vercel / .env.local.'
    );
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
