
import { createClient } from '@supabase/supabase-js';

// No Vercel, você deve configurar estas variáveis em Settings > Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found. Database features will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
