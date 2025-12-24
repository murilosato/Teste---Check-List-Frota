import { createClient } from '@supabase/supabase-js';

/**
 * Lógica resiliente para detecção de variáveis de ambiente.
 * O preview do Gemini Studio não suporta import.meta.env, 
 * enquanto o Vite (Vercel) sim.
 */
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  // Fix: Cast import.meta to any to allow access to Vite's env property in TypeScript
  // Verifica se o ambiente suporta import.meta.env (Vite)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
    supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
  }
} catch (e) {
  // Silencioso: fallback para ambientes que restringem acesso ao import.meta
}

/**
 * Exporta o cliente apenas se as chaves obrigatórias existirem.
 * Caso contrário, exporta null para que o App trate como modo offline puro.
 */
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
