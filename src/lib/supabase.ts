import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://efxjaxjslivudhnsbvwm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGpheGpzbGl2dWRobnNidndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MTk5MDQsImV4cCI6MjEwMzI5NTkwNH0.OxhgOTtj4ULhFgAlR7kunO2vSg1IJyS4CWE33vSI3qE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
