import { useState, useCallback, useRef } from 'react'
import { History } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { streamAnalysis, getHistory, deleteAnalysis as apiDelete } from '../utils/api.js'
import AnalyzerPanel from '../components/AnalyzerPanel.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import ResultsDashboard from '../components/ResultsDashboard.jsx'
import HistoryDrawer from '../components/HistoryDrawer.jsx'

// ── CSV Export Helper ──────────────────────────────────────────────────────────
const exportCSV = (analysis) => {
  const rows = [
    ['Field', 'Value'],
    ['Title', analysis.title || ''],
    ['Input Type', analysis.inputType],
    ['Overall Score', analysis.overallScore],
    ['Positive %', analysis.distribution?.positivePercent || 0],
    ['Negative %', analysis.distribution?.negativePercent || 0],
    ['Neutral %', analysis.distribution?.neutralCount || 0],
    ['Sarcasm Count', analysis.sarcasmCount || 0],
    ['Total Items', analysis.totalItems || 1],
    ['Executive Summary', (analysis.executiveSummary || '').replace(/,/g, ';')],
  ]
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `sentiagent-${(analysis.title || 'analysis').replace(/\s+/g, '-')}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── PDF Export via print ───────────────────────────────────────────────────────
const exportPDF = () => window.print()

export default function AnalyzerView({ onShowAuth }) {
  const { user } = useAuth()
  const toast    = useToast()

  const [loading,       setLoading]       = useState(false)
  const [progress,      setProgress]      = useState(null)
  const [result,        setResult]        = useState(null)
  const [error,         setError]         = useState('')
  const [showHistory,   setShowHistory]   = useState(false)
  const [histories,     setHistories]     = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const stopFnRef = useRef(null)

  const openHistory = async () => {
    if (!user) { onShowAuth(); return }
    if (!historyLoaded) {
      try {
        const r = await getHistory()
        setHistories(r.data.analyses)
        setHistoryLoaded(true)
      } catch { toast('Failed to load history', 'error') }
    }
    setShowHistory(true)
  }

  const handleSubmit = useCallback(async ({ inputType, rawInput, title }) => {
    if (!user) { onShowAuth(); return }

    // Abort any in-progress stream
    if (stopFnRef.current) { stopFnRef.current(); stopFnRef.current = null }

    setLoading(true); setProgress(null); setResult(null); setError('')

    // For CSV file input – use FormData
    if (inputType === 'csv' && rawInput instanceof File) {
      try {
        const { analyzeSync } = await import('../utils/api.js')
        const fd = new FormData()
        fd.append('file', rawInput)
        fd.append('inputType', 'csv')
        if (title) fd.append('title', title)
        const r = await analyzeSync(fd)
        setResult(r.data.analysis)
        setHistoryLoaded(false) // Invalidate cache
        toast('Analysis complete! 🎉', 'success')
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Analysis failed')
        toast('Analysis failed', 'error')
      } finally {
        setLoading(false)
      }
      return
    }

    // SSE Streaming
    const stop = streamAnalysis({
      inputType,
      rawInput: typeof rawInput === 'string' ? rawInput : String(rawInput),
      title,
      onProgress: (p) => setProgress(p),
      onComplete: (analysis) => {
        setResult(analysis)
        setLoading(false)
        setProgress(null)
        setHistoryLoaded(false)
        toast('Analysis complete! 🎉', 'success')
        stopFnRef.current = null
      },
      onError: (msg) => {
        setError(msg || 'Analysis failed')
        setLoading(false)
        setProgress(null)
        toast(msg || 'Analysis failed', 'error')
        stopFnRef.current = null
      }
    })

    stopFnRef.current = stop
  }, [user, onShowAuth, toast])

  const handleHistorySelect = (a) => {
    setResult(a)
    setShowHistory(false)
    setError('')
  }

  const handleDelete = async (id) => {
    try {
      await apiDelete(id)
      setHistories(prev => prev.filter(a => a.id !== id))
      if (result?.id === id) setResult(null)
      toast('Analysis deleted', 'info')
    } catch { toast('Failed to delete', 'error') }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Page title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Sentiment Analyzer</h1>
          <p className="text-sm text-white/50 mt-1">Submit content to analyze sentiment, emotions, sarcasm, and themes</p>
        </div>
        <button id="history-btn" onClick={openHistory} className="btn-secondary py-2 px-4">
          <History className="w-4 h-4" />History
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        {/* Left: Input */}
        <div className="xl:col-span-2">
          <AnalyzerPanel onSubmit={handleSubmit} loading={loading} />
        </div>

        {/* Right: Progress + Results */}
        <div className="xl:col-span-3 flex flex-col gap-5">
          {loading && progress && <ProgressBar progress={progress} />}
          {loading && !progress && (
            <div className="glass p-8 flex flex-col items-center gap-4 text-white/50">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Connecting to analysis pipeline…</p>
            </div>
          )}
          {error && (
            <div className="glass border border-red-500/30 bg-red-500/10 p-5 rounded-2xl animate-fade-in">
              <p className="text-red-400 font-semibold text-sm">⚠️ {error}</p>
            </div>
          )}
          {result && (
            <ResultsDashboard
              analysis={result}
              onExportCSV={() => exportCSV(result)}
              onExportPDF={exportPDF}
            />
          )}
          {!loading && !result && !error && (
            <div className="glass p-12 text-center text-white/30 border-dashed border border-white/10">
              <div className="text-4xl mb-3">🧠</div>
              <p className="text-sm font-medium">Results will appear here after analysis</p>
              <p className="text-xs mt-1">Supports text, URLs, CSV files, and YouTube links</p>
            </div>
          )}
        </div>
      </div>

      {showHistory && (
        <HistoryDrawer
          analyses={histories}
          onClose={() => setShowHistory(false)}
          onSelect={handleHistorySelect}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
