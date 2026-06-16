import AppShell from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useTradingStore } from '@/stores/tradingStore'
import { useState } from 'react'
import { Eye, EyeOff, Sparkles } from 'lucide-react'

export default function Settings() {
  const geminiApiKey = useTradingStore((s) => s.geminiApiKey)
  const setGeminiApiKey = useTradingStore((s) => s.setGeminiApiKey)
  
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey)
  const [showGeminiSecret, setShowGeminiSecret] = useState(false)

  const handleSave = () => {
    setGeminiApiKey(localGeminiKey)
    alert('Saved!')
  }

  return (
    <AppShell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Settings
            </CardTitle>
            <Badge variant="info">Gemini</Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-purple-400" /> Gemini AI Key
                </label>
                <div className="relative">
                  <input
                    type={showGeminiSecret ? 'text' : 'password'}
                    value={localGeminiKey}
                    onChange={(e) => setLocalGeminiKey(e.target.value)}
                    placeholder="Enter your Gemini API Key"
                    className="h-10 w-full rounded border border-slate-800 bg-slate-900 px-3 text-sm font-mono text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiSecret(!showGeminiSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showGeminiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-md bg-amber-500/10 p-3 border border-amber-500/20">
                <p className="text-[11px] text-amber-200 leading-relaxed">
                  <strong>Security Note:</strong> This key is stored in app state (session only). Refreshing clears it.
                </p>
              </div>

              <Button 
                variant="primary" 
                onClick={handleSave}
                className="w-full h-10 font-bold shadow-lg shadow-cyan-900/20"
              >
                Save Keys
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
