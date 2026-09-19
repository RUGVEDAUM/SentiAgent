import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

const STEPS = [
  { key: 'ingest',      label: 'Ingesting content',         emoji: '📥' },
  { key: 'preprocess',  label: 'Cleaning & chunking',       emoji: '🧹' },
  { key: 'analyze',     label: 'Analyzing sentiment',       emoji: '🔍' },
  { key: 'aggregate',   label: 'Aggregating results',       emoji: '📊' },
  { key: 'reflect',     label: 'Generating insights',       emoji: '💡' },
]

export default function ProgressBar({ progress }) {
  if (!progress) return null
  const { stage, message, percent = 0, currentItem, totalItems } = progress

  const currentIdx = STEPS.findIndex(s => s.key === stage)

  return (
    <div className="glass p-5 animate-fade-in">
      {/* Stage label */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
          <span className="text-sm font-semibold text-white">{message || 'Processing…'}</span>
        </div>
        {currentItem && totalItems && (
          <span className="text-xs text-white/50">{currentItem} / {totalItems}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }} />
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const done   = idx < currentIdx
          const active = idx === currentIdx
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-all duration-300 ${
                done   ? 'bg-emerald-500/20 border-emerald-500/50 step-done text-emerald-400' :
                active ? 'bg-brand-600/30 border-brand-500/60 step-active text-brand-300' :
                         'bg-white/5 border-white/15 text-white/30'}`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs">{idx + 1}</span>}
              </div>
              <span className={`text-xs text-center hidden sm:block transition-colors ${done ? 'text-emerald-400' : active ? 'text-brand-300' : 'text-white/30'}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
