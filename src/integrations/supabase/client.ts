// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Safe storage wrapper with error handling
const safeStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.debug('Storage getItem error:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.debug('Storage setItem error:', error);
      // Handle quota exceeded errors silently
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.debug('Storage removeItem error:', error);
    }
  },
};

// Singleton pattern to prevent multiple client instances
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = (() => {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: safeStorage,
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      lockTimeout: 10000, // Increased from default 5000ms to prevent lock warnings
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
})();

// Helper to clear auth state if needed
export const clearSupabaseAuth = () => {
  try {
    localStorage.removeItem('sb-auth-token');
    localStorage.removeItem('sb-refresh-token');
  } catch (error) {
    console.debug('Clear auth error:', error);
  }
};
