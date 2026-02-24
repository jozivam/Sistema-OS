import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient<any, "public", any>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Configurado' : 'Ausente');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Configurado' : 'Ausente');
  console.error(
    'Supabase URL or Anon Key is missing. Please check your .env.local file. The app is running in offline mode (Supabase disabled).'
  );
}

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    // Fallback to prevent white screen, but API calls will fail
    supabase = createClient('https://placeholder.supabase.co', 'placeholder');
  }
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
  // Fallback
  supabase = createClient('https://placeholder.supabase.co', 'placeholder');
}

export { supabase };
