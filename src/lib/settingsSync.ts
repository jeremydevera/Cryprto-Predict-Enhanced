import { supabase } from '@/lib/supabase'

/**
 * Per-user settings sync. Every setting in this app already funnels through a handful of
 * localStorage keys, so syncing == mirroring those keys to a Supabase row keyed by user_id.
 *
 * Flow:
 *  • On login → pullCloudSettings(): cloud row wins (write into localStorage); if no row yet,
 *    seed it from whatever is local now (so a user's first login keeps their tuned profiles).
 *  • On any settings change → scheduleCloudSave(): debounced upsert of the local snapshot.
 *
 * When Supabase isn't configured or nobody is signed in, every function no-ops and the app
 * behaves exactly as before (localStorage only).
 */

// The localStorage keys that make up a user's settings. NOTE: keep in sync with tradingStore.
// 'backtestProfileSeeds_v1' is intentionally excluded — it's device-local seed bookkeeping.
const SYNCED_KEYS = [
  'cp_strategy_settings_v1',
  'cp_terminal_settings_v1',
  'cp_scanner_settings_v1',
  'cp_strategy_filters_v1',
  'backtestProfiles_v1',
  'backtestAppendedCoins_v1',
] as const

const TABLE = 'user_settings'
const SAVE_DEBOUNCE_MS = 1500

let currentUserId: string | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
// Guards against the writes we make during applySnapshot re-triggering a save.
let applying = false

function snapshotLocal(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (typeof window === 'undefined') return out
  for (const k of SYNCED_KEYS) {
    const raw = window.localStorage.getItem(k)
    if (raw == null) continue
    try { out[k] = JSON.parse(raw) } catch { /* skip unparseable */ }
  }
  return out
}

/** Write a cloud snapshot into localStorage. Returns true if any value actually changed. */
function applySnapshot(data: Record<string, unknown>): boolean {
  if (typeof window === 'undefined' || !data) return false
  let changed = false
  applying = true
  try {
    for (const k of SYNCED_KEYS) {
      if (!(k in data)) continue
      const next = JSON.stringify(data[k])
      if (window.localStorage.getItem(k) !== next) {
        window.localStorage.setItem(k, next)
        changed = true
      }
    }
  } finally {
    applying = false
  }
  return changed
}

/** Called by the auth store on login/logout. */
export function setSyncUser(userId: string | null) {
  currentUserId = userId
}

/** Debounced upsert of the current local settings to the signed-in user's row. */
export function scheduleCloudSave() {
  if (!supabase || !currentUserId || applying) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { void flushCloudSave() }, SAVE_DEBOUNCE_MS)
}

async function flushCloudSave() {
  if (!supabase || !currentUserId) return
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: currentUserId, data: snapshotLocal(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (error) console.error('[settingsSync] save failed:', error.message)
}

/**
 * On login: load the user's cloud settings into localStorage.
 * Returns true when local data changed (caller should reload so the store re-hydrates).
 */
export async function pullCloudSettings(userId: string): Promise<boolean> {
  if (!supabase) return false
  currentUserId = userId
  const { data, error } = await supabase.from(TABLE).select('data').eq('user_id', userId).maybeSingle()
  if (error) { console.error('[settingsSync] pull failed:', error.message); return false }
  if (!data) {
    // First login on this account — seed the cloud from current local settings.
    await flushCloudSave()
    return false
  }
  return applySnapshot((data.data ?? {}) as Record<string, unknown>)
}
