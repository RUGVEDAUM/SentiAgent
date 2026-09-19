import { useState, useEffect } from 'react'
import { BarChart3, Trash2, Clock, TrendingUp, TrendingDown, Minus, FileText, Globe, Youtube, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { getHistory, deleteAnalysis as apiDelete } from '../utils/api.js'
import ResultsDashboard from '../components/ResultsDashboard.jsx'

const ICONS = { text: <FileText className="w-4 h-4" />, url: <Globe className="w-4 h-4" />, youtube: <Youtube className="w-4 h-4" />, csv: <BarChart3 className="w-4 h-4" /> }

export default function HistoryView({ onShowAuth }) {
  const { user }    = useAuth()
  const toast       = useToast()
  const [analyses,  setAnalyses]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getHistory()
      .then(r => setAnalyses(r.data.analyses))
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false))
  }, [user])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    try {
      await apiDelete(id)
      setAnalyses(prev => prev.filter(a => a.id !== id))
      if (selected?.id === id) setSelected(null)
      toast('Deleted', 'info')
    } catch { toast('Failed to delete', 'error') }
  }

  const exportAllCSV = () => {
    const rows = [['ID', 'Title', 'Type', 'Score', 'Positive%', 'Negative%', 'Sarcasm%', 'Items', 'Date']]
    analyses.forEach(a => rows.push([
      a.id, a.title || '', a.inputType, Math.round(a.overallScore),
      a.distribution?.positivePercent || 0, a.distribution?.negativePercent || 0,
      a.sarcasmRate || 0, a.totalItems || 1, new Date(a.createdAt).toLocaleDateString()
    ]))
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'sentiagent-history.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-white mb-2">Sign in to view history</h2>
        <p className="text-white/50 text-sm mb-6">Your analyses are saved securely per account</p>
        <button onClick={onShowAuth} className="btn-primary">Sign In</button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-brand-400" />My History
          </h1>
          <p className="text-sm text-white/50 mt-1">{analyses.length} analyses stored</p>
        </div>
        {analyses.length > 0 && (
          <button onClick={exportAllCSV} className="btn-secondary py-2 px-4 text-sm">
            <Download className="w-4 h-4" />Export All CSV
          </button>
        )}
      </div>

      {loading && (
        <div className="glass p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && <div className="glass border border-red-500/30 p-4 text-red-400 text-sm">{error}</div>}

      {!loading && !error && analyses.length === 0 && (
        <div className="glass p-16 text-center text-white/30">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No analyses yet</p>
          <p className="text-xs mt-1">Run your first analysis on the Analyzer page</p>
        </div>
      )}

      {!loading && analyses.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
          {/* Left list */}
          <div className="xl:col-span-2 flex flex-col gap-2">
            {analyses.map(a => {
              const s = Math.round(a.overallScore)
              const scoreColor = s >= 65 ? 'text-emerald-400' : s >= 45 ? 'text-white/60' : 'text-red-400'
              return (
                <div key={a.id} onClick={() => setSelected(a)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${selected?.id === a.id ? 'border-brand-500/50 bg-brand-600/10' : 'border-white/5 hover:border-white/15 hover:bg-white/5'}`}>
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
                    {ICONS[a.inputType] || <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{a.title || 'Untitled'}</p>
                    <p className="text-xs text-white/40 mt-0.5">{new Date(a.createdAt).toLocaleDateString()} · {a.totalItems} items</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-lg font-extrabold ${scoreColor}`}>{s}</span>
                    <button onClick={(e) => handleDelete(a.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right detail */}
          <div className="xl:col-span-3">
            {selected
              ? <ResultsDashboard analysis={selected} onExportCSV={() => {
                  const rows = [['Field','Value'],['Title',selected.title||''],['Score',selected.overallScore]]
                  const csv = rows.map(r=>r.join(',')).join('\n')
                  const blob = new Blob([csv],{type:'text/csv'})
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a');a.href=url;a.download='analysis.csv';a.click();URL.revokeObjectURL(url)
                }} />
              : (
                <div className="glass p-12 text-center text-white/30 border-dashed border border-white/10">
                  <div className="text-3xl mb-3">👈</div>
                  <p className="text-sm font-medium">Select an analysis to view details</p>
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  )
}
