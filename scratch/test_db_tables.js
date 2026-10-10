const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://efxjaxjslivudhnsbvwm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGpheGpzbGl2dWRobnNidndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MTk5MDQsImV4cCI6MjEwMzI5NTkwNH0.OxhgOTtj4ULhFgAlR7kunO2vSg1IJyS4CWE33vSI3qE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing connection to Supabase:', supabaseUrl);
  try {
    const { data, error } = await supabase.from('activites').select('count', { count: 'exact', head: true });
    if (error) {
      console.log('QueryResult activites error:', error.message, error.code);
    } else {
      console.log('Table activites exists and accessible!');
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testConnection();
