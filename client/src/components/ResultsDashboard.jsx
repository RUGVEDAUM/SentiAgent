import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle, Lightbulb,
  ChevronDown, ChevronUp, Download, Tag, Star, ThumbsDown, ThumbsUp, ShieldAlert
} from 'lucide-react'
import { ScoreRing, EmotionRadar, SentimentPie, AspectBar } from './Charts.jsx'

const priorityColors = {
  High:   'bg-red-500/20 text-red-400 border border-red-500/30',
  Medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  Low:    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
}

const SentimentBadge = ({ s }) => {
  const cfg = {
    positive: { cls: 'badge-positive', icon: <ThumbsUp className="w-3 h-3" />, label: 'Positive' },
    negative: { cls: 'badge-negative', icon: <ThumbsDown className="w-3 h-3" />, label: 'Negative' },
    neutral:  { cls: 'badge-neutral', icon: <Minus className="w-3 h-3" />, label: 'Neutral' },
  }
  const c = cfg[s?.toLowerCase()] || cfg.neutral
  return <span className={c.cls}>{c.icon}{c.label}</span>
}

export default function ResultsDashboard({ analysis, onExportCSV, onExportPDF }) {
  const [showAllKeyPhrases, setShowAllKeyPhrases] = useState(false)
  const [expandedAction, setExpandedAction] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)

  if (!analysis) return null

  const {
    title, inputType, createdAt,
    emotionRadar = {},
    topPositiveThemes = [], topNegativeThemes = [], aspectBreakdown = [],
    executiveSummary, keyInsights = [], recommendedActions = [],
    modelUsed = 'AI Model', language
  } = analysis

  // Resiliently resolve properties
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(analysis.overallScore ?? 50))))

  const rawDist = analysis.distribution || analysis.sentimentDistribution || {}
  const distribution = {
    positiveCount: rawDist.positiveCount ?? 0,
    neutralCount: rawDist.neutralCount ?? 0,
    negativeCount: rawDist.negativeCount ?? 0,
    positivePercent: typeof rawDist.positivePercent === 'number' ? rawDist.positivePercent : 0,
    neutralPercent: typeof rawDist.neutralPercent === 'number' ? rawDist.neutralPercent : 0,
    negativePercent: typeof rawDist.negativePercent === 'number' ? rawDist.negativePercent : 0,
  }

  const itemsList = Array.isArray(analysis.perItemResults) && analysis.perItemResults.length > 0
    ? analysis.perItemResults
    : (Array.isArray(analysis.items) ? analysis.items : [])

  const totalItems = analysis.totalItems || analysis.itemCount || (itemsList.length > 0 ? itemsList.length : 1)
  const sarcasmCount = typeof analysis.sarcasmCount === 'number'
    ? analysis.sarcasmCount
    : itemsList.filter(i => i.sarcasm).length
  const sarcasmRate = typeof analysis.sarcasmRate === 'number'
    ? analysis.sarcasmRate
    : (totalItems > 0 ? Math.round((sarcasmCount / totalItems) * 100) : 0)

  const kpis = [
    {
      label: 'Overall Score',
      value: `${safeScore}/100`,
      sub: distribution.positivePercent ? `${distribution.positivePercent}% positive sentiment` : 'Calibrated index',
      icon: <Star className="w-5 h-5 text-brand-400" />,
      glow: 'shadow-glow'
    },
    {
      label: 'Items Analyzed',
      value: totalItems,
      sub: sarcasmCount > 0 ? `${sarcasmCount} sarcastic (${sarcasmRate}%)` : 'No sarcasm detected',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      glow: ''
    },
    {
      label: 'Positive Share',
      value: `${distribution.positivePercent}%`,
      sub: `${distribution.positiveCount} of ${totalItems} items`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      glow: 'shadow-glow-green'
    },
    {
      label: 'Negative Share',
      value: `${distribution.negativePercent}%`,
      sub: `${distribution.negativeCount} of ${totalItems} items`,
      icon: <TrendingDown className="w-5 h-5 text-red-400" />,
      glow: 'shadow-glow-red'
    },
  ]

  const allKeyPhrases = [...topPositiveThemes.map(p => ({ p, type: 'positive' })), ...topNegativeThemes.map(p => ({ p, type: 'negative' }))]
  const visiblePhrases = showAllKeyPhrases ? allKeyPhrases : allKeyPhrases.slice(0, 12)

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="glass p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <span className="section-label">{inputType?.toUpperCase()} ANALYSIS</span>
          <h2 className="text-xl font-bold text-white line-clamp-1">{title || 'Untitled Analysis'}</h2>
          <div className="flex items-center gap-3 text-xs text-white/40 flex-wrap">
            <span>Model: <span className="text-white/60 font-mono">{modelUsed}</span></span>
            {language && <span>Language: <span className="text-white/60">{language}</span></span>}
            {createdAt && <span>{new Date(createdAt).toLocaleString()}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {onExportCSV && (
            <button id="export-csv-btn" onClick={onExportCSV} className="btn-secondary py-1.5 px-3 text-sm">
              <Download className="w-4 h-4" />CSV
            </button>
          )}
          {onExportPDF && (
            <button id="export-pdf-btn" onClick={onExportPDF} className="btn-secondary py-1.5 px-3 text-sm">
              <Download className="w-4 h-4" />PDF
            </button>
          )}
        </div>
      </div>

      {/* Sarcasm Alert Banner if detected */}
      {sarcasmCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 animate-fade-in shadow-glow">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-amber-300">
              ⚡ Sarcasm & Irony Detected ({sarcasmCount} item{sarcasmCount > 1 ? 's' : ''} • {sarcasmRate}%)
            </span>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              The AI agent detected sarcastic, ironic, or mock-polite phrasing. Scores and sentiment classifications have been adjusted to reflect genuine sentiment rather than literal surface words.
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`kpi-card ${k.glow}`}>
            <div className="flex items-center justify-between">
              <span className="section-label">{k.label}</span>
              {k.icon}
            </div>
            <span className="text-2xl font-extrabold text-white">{k.value}</span>
            {k.sub && <span className="text-xs text-white/40">{k.sub}</span>}
          </div>
        ))}
      </div>

      {/* Score + Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Ring */}
        <div className="glass p-5 flex flex-col items-center justify-center gap-2">
          <h3 className="section-label">Calibrated Score</h3>
          <ScoreRing score={safeScore} />
          {sarcasmCount > 0 && (
            <div className="badge-sarcasm mt-1 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {sarcasmRate}% sarcasm detected
            </div>
          )}
        </div>

        {/* Sentiment Distribution */}
        <div className="glass p-5">
          <h3 className="section-label mb-2">Distribution</h3>
          <SentimentPie distribution={distribution} />
        </div>

        {/* Emotion Radar */}
        <div className="glass p-5">
          <h3 className="section-label mb-2">Emotion Profile</h3>
          <EmotionRadar data={emotionRadar} />
        </div>
      </div>

      {/* Aspect breakdown */}
      {aspectBreakdown.length > 0 && (
        <div className="glass p-5">
          <h3 className="section-label mb-4">Aspect-Based Sentiment</h3>
          <AspectBar aspects={aspectBreakdown} />
        </div>
      )}

      {/* Key Themes */}
      {allKeyPhrases.length > 0 && (
        <div className="glass p-5">
          <h3 className="section-label mb-3">Key Themes</h3>
          <div className="flex flex-wrap gap-2">
            {visiblePhrases.map(({ p, type }, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
                type === 'positive' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' :
                                     'bg-red-500/10 border-red-500/25 text-red-300'}`}>
                <Tag className="w-3 h-3 opacity-70" />{p}
              </span>
            ))}
            {allKeyPhrases.length > 12 && (
              <button onClick={() => setShowAllKeyPhrases(!showAllKeyPhrases)}
                className="px-3 py-1 rounded-full text-xs text-white/50 hover:text-white border border-white/15 hover:border-white/30 transition-colors">
                {showAllKeyPhrases ? 'Show less' : `+${allKeyPhrases.length - 12} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Executive Summary + Insights */}
      {executiveSummary && (
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white">AI Executive Summary</h3>
          </div>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{executiveSummary}</p>
          {keyInsights.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {keyInsights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/65">{ins}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommended Actions */}
      {recommendedActions.length > 0 && (
        <div className="glass p-5">
          <h3 className="section-label mb-3">Recommended Actions</h3>
          <div className="flex flex-col gap-3">
            {recommendedActions.map((action, i) => (
              <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedAction(expandedAction === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityColors[action.priority] || priorityColors.Medium}`}>
                      {action.priority}
                    </span>
                    <span className="text-sm font-semibold text-white text-left">{action.title}</span>
                  </div>
                  {expandedAction === i ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                </button>
                {expandedAction === i && (
                  <div className="px-4 pb-4 flex flex-col gap-2 animate-fade-in">
                    <p className="text-sm text-white/65">{action.action}</p>
                    {action.expectedImpact && (
                      <p className="text-xs text-brand-300 bg-brand-600/10 border border-brand-500/20 rounded-lg p-2">
                        💡 Expected: {action.expectedImpact}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Per-item breakdown (visible for 1 or more items) */}
      {itemsList.length > 0 && (
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-label">
              Detailed Item Analysis ({itemsList.length} item{itemsList.length > 1 ? 's' : ''})
            </h3>
            <span className="text-xs text-white/40">Click any item for full analysis</span>
          </div>

          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
            {itemsList.map((item, i) => {
              const itemScore = Math.max(0, Math.min(100, Math.round(Number(item.score ?? (item.sentiment === 'positive' ? 85 : item.sentiment === 'negative' ? 15 : 50)))))
              const isExpanded = expandedItem === i

              return (
                <div key={i}
                  onClick={() => setExpandedItem(isExpanded ? null : i)}
                  className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="text-xs text-white/40 font-mono mt-0.5 w-6 flex-shrink-0">#{item.id || i + 1}</span>
                      <p className={`text-sm text-white/85 ${isExpanded ? '' : 'line-clamp-2'} leading-relaxed`}>
                        {item.text || item.input || '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                        itemScore >= 65 ? 'bg-emerald-500/20 text-emerald-300' :
                        itemScore >= 45 ? 'bg-amber-500/20 text-amber-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {itemScore}/100
                      </span>
                      <SentimentBadge s={item.sentiment} />
                    </div>
                  </div>

                  {/* Sarcasm flag & reason */}
                  {item.sarcasm && (
                    <div className="flex flex-col gap-1 ml-8 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Sarcasm Detected</span>
                      </div>
                      {item.sarcasmReason && (
                        <p className="text-amber-200/75 leading-normal">{item.sarcasmReason}</p>
                      )}
                    </div>
                  )}

                  {/* Expanded aspects and keywords */}
                  {isExpanded && (
                    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/10 ml-8 text-xs">
                      {item.aspects?.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white/40">Aspects:</span>
                          {item.aspects.map((asp, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-white/10 text-white/70">
                              {asp.aspect}: <strong className={asp.sentiment === 'positive' ? 'text-emerald-400' : asp.sentiment === 'negative' ? 'text-red-400' : 'text-amber-400'}>{asp.sentiment}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                      {item.confidence && (
                        <span className="text-white/40">
                          Confidence: <strong className="text-white/70">{(item.confidence * 100).toFixed(0)}%</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
