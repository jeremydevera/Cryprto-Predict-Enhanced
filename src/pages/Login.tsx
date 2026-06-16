import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { CandlestickChart } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { isSupabaseConfigured } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signIn, signUp } = useAuthStore()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Where to go after auth — back to the page they were gated from, else terminal.
  const from = (location.state as { from?: string } | null)?.from ?? '/terminal'

  // Already signed in → skip the login page.
  if (user) return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setNotice(null); setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email.trim(), password)
        if (error) { setError(error); return }
        navigate(from, { replace: true })
      } else {
        const { error, needsConfirmation } = await signUp(email.trim(), password)
        if (error) { setError(error); return }
        if (needsConfirmation) {
          setNotice('Account created. Check your email to confirm, then log in.')
          setMode('login')
        } else {
          navigate(from, { replace: true })
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ' +
    'placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <CandlestickChart className="h-6 w-6 text-cyan-300" />
          <div className="text-lg font-semibold">CryptoPredict Web</div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded border border-amber-900/50 bg-amber-950/20 p-3 text-xs text-amber-300">
              Auth isn’t configured yet. Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>, then restart. Until then the app is open to everyone.
            </div>
          )}

          <h1 className="mb-1 text-base font-semibold">
            {mode === 'login' ? 'Log in' : 'Create account'}
          </h1>
          <p className="mb-4 text-xs text-slate-400">
            {mode === 'login' ? 'Welcome back.' : 'Sign up to get your own workspace.'}
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Email</label>
              <input
                type="email" required value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls} placeholder="you@example.com"
                disabled={!isSupabaseConfigured || busy}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Password</label>
              <input
                type="password" required value={password} minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls} placeholder="••••••••"
                disabled={!isSupabaseConfigured || busy}
              />
            </div>

            {error && <div className="rounded border border-rose-900/50 bg-rose-950/20 p-2 text-xs text-rose-300">{error}</div>}
            {notice && <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-2 text-xs text-emerald-300">{notice}</div>}

            <Button type="submit" variant="primary" className="w-full" disabled={!isSupabaseConfigured || busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <button onClick={() => { setMode('signup'); setError(null); setNotice(null) }} className="text-blue-400 hover:text-blue-300">
                Need an account? Sign up
              </button>
            ) : (
              <button onClick={() => { setMode('login'); setError(null); setNotice(null) }} className="text-blue-400 hover:text-blue-300">
                Already have an account? Log in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
