import { useState } from 'react'
import { X, Clock, Trash2, TrendingUp, TrendingDown, Minus, Search, ChevronRight, BarChart3 } from 'lucide-react'

const ScoreBadge = ({ score }) => {
  const s = Math.round(score)
  if (s >= 65) return <span className="badge-positive">{s}</span>
  if (s >= 45) return <span className="badge-neutral">{s}</span>
  return <span className="badge-negative">{s}</span>
}

const inputTypeIcon = {
  text:    '📝',
  url:     '🔗',
  csv:     '📊',
  youtube: '▶️',
}

export default function HistoryDrawer({ analyses, onClose, onSelect, onDelete }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = analyses.filter(a => {
    const matchSearch = !search || (a.title || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ||
      (filter === 'positive' && a.overallScore >= 65) ||
      (filter === 'negative' && a.overallScore < 45) ||
      (filter === 'neutral'  && a.overallScore >= 45 && a.overallScore < 65)
    return matchSearch && matchFilter
  })

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-full max-w-md h-full bg-surface-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-glass animate-slide-in-right"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            <h2 className="font-bold text-white">Analysis History</h2>
            <span className="text-xs bg-white/10 text-white/50 rounded-full px-2 py-0.5">{analyses.length}</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="text" placeholder="Search history…" value={search}
              onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm" />
          </div>
          <div className="flex gap-1">
            {['all', 'positive', 'neutral', 'negative'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{search || filter !== 'all' ? 'No results found' : 'No analyses yet'}</p>
            </div>
          ) : (
            filtered.map(a => (
              <div key={a.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/15 hover:bg-white/5 transition-all duration-200 group">
                <span className="text-xl flex-shrink-0">{inputTypeIcon[a.inputType] || '📝'}</span>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(a)}>
                  <p className="text-sm font-semibold text-white truncate">{a.title || 'Untitled'}</p>
                  <p className="text-xs text-white/40 mt-0.5">{new Date(a.createdAt).toLocaleDateString()} · {a.totalItems} items</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ScoreBadge score={a.overallScore} />
                  <button onClick={() => onDelete(a.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors cursor-pointer" onClick={() => onSelect(a)} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
