import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { setSyncUser, pullCloudSettings } from '@/lib/settingsSync'

// onAuthStateChange also fires on token refresh; only react when the user identity changes.
let lastSyncedUserId: string | null = null
async function syncSettingsForUser(user: User | null) {
  const uid = user?.id ?? null
  if (uid === lastSyncedUserId) return
  lastSyncedUserId = uid
  setSyncUser(uid)
  if (!uid) return
  // Cloud settings win on login; reload so the (already-hydrated) store picks up the new values.
  const changed = await pullCloudSettings(uid)
  if (changed && typeof window !== 'undefined') window.location.reload()
}

type AuthState = {
  session: Session | null
  user: User | null
  /** True until the first session check resolves — guards against a login-page flash on refresh. */
  loading: boolean
  initialized: boolean
  init: () => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: isSupabaseConfigured, // nothing to wait for when auth is dormant
  initialized: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })
    if (!supabase) { set({ loading: false }); return }

    // Restore any persisted session, then keep state in sync with login/logout/refresh.
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, loading: false })
      void syncSettingsForUser(data.session?.user ?? null)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false })
      void syncSettingsForUser(session?.user ?? null)
    })
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Auth is not configured.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: 'Auth is not configured.', needsConfirmation: false }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message, needsConfirmation: false }
    // With email confirmation ON, Supabase returns a user but no active session yet.
    const needsConfirmation = !data.session
    return { error: null, needsConfirmation }
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },
}))
