import { Link, useLocation } from 'react-router-dom'
import { Activity, CandlestickChart, Settings, BrainCircuit, MessageSquareText, SlidersHorizontal, ScanSearch, FlaskConical, Radio, Bot, Wallet, Layers, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { isSupabaseConfigured } from '@/lib/supabase'

function AccountMenu() {
  const { user, signOut } = useAuthStore()
  if (!isSupabaseConfigured || !user) return null
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-slate-400 sm:inline" title={user.email ?? ''}>{user.email}</span>
      <button
        onClick={() => { void signOut() }}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-rose-300"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Log out</span>
      </button>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  const isActive = (path: string) => loc.pathname === path

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <CandlestickChart className="h-5 w-5 text-cyan-300" />
            <div className="text-sm font-semibold">CryptoPredict Web</div>
          </div>

          <nav className="ml-2 flex items-center gap-1">
            <Link
              to="/terminal"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/terminal') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <Activity className="h-4 w-4" />
              Terminal
            </Link>
            <Link
              to="/insights"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/insights') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <BrainCircuit className="h-4 w-4" />
              AI Insights
            </Link>
            <Link
              to="/chat"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/chat') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <MessageSquareText className="h-4 w-4" />
              Market Chat
            </Link>

            <Link
              to="/strategies"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/strategies') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <Layers className="h-4 w-4" />
              Strategies
            </Link>
            <Link
              to="/filters"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/filters') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Link>
            <Link
              to="/scanner"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/scanner') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <ScanSearch className="h-4 w-4" />
              Scanner
            </Link>
            <Link
              to="/backtesting"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/backtesting') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <FlaskConical className="h-4 w-4" />
              Backtest
            </Link>
            <Link
              to="/background-scanner"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/background-scanner') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <Radio className="h-4 w-4" />
              BG Scanner
            </Link>
            <Link
              to="/auto-trader"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/auto-trader') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <Bot className="h-4 w-4" />
              Auto Trader
            </Link>
            <Link
              to="/paper-trading"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/paper-trading') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <Wallet className="h-4 w-4" />
              Paper
            </Link>
            <Link
              to="/settings"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive('/settings') ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-900',
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>

          <div className="ml-auto" />
          <AccountMenu />
        </div>
      </div>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
