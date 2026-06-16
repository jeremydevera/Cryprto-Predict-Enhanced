import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * Layout guard for the app's routes. Renders the nested route (<Outlet/>) only when a
 * user is signed in. When Supabase isn't configured the gate is DORMANT — it renders
 * everything, so the app behaves exactly as it did before auth was added.
 */
export default function ProtectedRoute() {
  const location = useLocation()
  const { user, loading } = useAuthStore()

  if (!isSupabaseConfigured) return <Outlet />

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}
