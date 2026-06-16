import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Terminal from '@/pages/Terminal'
import Settings from '@/pages/Settings'
import AIInsights from '@/pages/AIInsights'
import MarketChat from '@/pages/MarketChat'
import Strategies from '@/pages/Strategies'
import SignalFilters from '@/pages/SignalFilters'
import Scanner from '@/pages/Scanner'
import Backtesting from '@/pages/Backtesting'
import BackgroundScanner from '@/pages/BackgroundScanner'
import AutoTrader from '@/pages/AutoTrader'
import PaperTrading from '@/pages/PaperTrading'
import Login from '@/pages/Login'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import ScannerDaemon from '@/components/ScannerDaemon'
import { useAuthStore } from '@/stores/authStore'

export default function App() {
  const initAuth = useAuthStore((s) => s.init)
  useEffect(() => { initAuth() }, [initAuth])

  return (
    <ErrorBoundary>
      <Router>
        <ScannerDaemon />
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Everything below requires a signed-in user (gate is dormant until Supabase is configured). */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/terminal" replace />} />
            <Route path="/terminal" element={<Terminal />} />
            <Route path="/insights" element={<AIInsights />} />
            <Route path="/chat" element={<MarketChat />} />
            <Route path="/strategies" element={<Strategies />} />
            <Route path="/filters" element={<SignalFilters />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/backtesting" element={<Backtesting />} />
            <Route path="/background-scanner" element={<BackgroundScanner />} />
            <Route path="/auto-trader" element={<AutoTrader />} />
            <Route path="/paper-trading" element={<PaperTrading />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/terminal" replace />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
