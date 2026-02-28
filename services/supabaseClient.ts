/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logService } from './logger';

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

const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    try {
      const cloned = res.clone();
      const errBody = await cloned.json();
      const pathName = typeof url === 'string' ? new URL(url).pathname : (url as URL).pathname || 'unknown';
      logService.addLog('error', `Erro Supabase (HTTP ${res.status}) em ${pathName}`, errBody);
    } catch {
      const pathName = typeof url === 'string' ? new URL(url).pathname : (url as URL).pathname || 'unknown';
      logService.addLog('error', `Erro Supabase (HTTP ${res.status}) em ${pathName}`, null);
    }
  }
  return res;
};

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: customFetch
      },
      auth: {
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
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
