import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Vite exposes only vars prefixed with VITE_ to the client bundle.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Whether Supabase auth is wired up. When false the whole auth gate goes DORMANT:
 * ProtectedRoute lets everything through and the login UI shows a setup notice,
 * so the app runs exactly as it did before any keys are added. Set the two
 * VITE_SUPABASE_* vars (locally in .env, in prod via the host dashboard) to activate.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

/** Single shared browser client. Null until configured (see above). */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
