import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient<any, "public", any>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase URL or Anon Key is missing. Please check your .env.local file. The app is running in offline mode (Supabase disabled).'
  );
  // Create a dummy client object or handle strictly. 
  // For now, to prevent crash, we just avoid initializing nicely or throw a clearer error?
  // Actually, creating a client with missing args throws. 
  // We will initialize a dummy one if needed or just let it fail but inside a try/catch block if possible? 
  // No, imports are top level.
  // Best approach: Initialize with dummy values if missing to prevent crash, but logs will show error.
  // OR: export type casting.
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
