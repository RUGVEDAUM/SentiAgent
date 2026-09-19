import { useState } from 'react'
import { GitCompare, ArrowLeftRight, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { compareTexts } from '../utils/api.js'
import { ScoreRing } from '../components/Charts.jsx'

const ScoreDiff = ({ delta }) => {
  if (Math.abs(delta) <= 5) return <span className="badge-neutral"><Minus className="w-3 h-3" /> Tie</span>
  if (delta > 0) return <span className="badge-positive"><TrendingUp className="w-3 h-3" />A wins +{delta.toFixed(1)}</span>
  return <span className="badge-negative"><TrendingDown className="w-3 h-3" />B wins +{Math.abs(delta).toFixed(1)}</span>
}

export default function CompareView({ onShowAuth }) {
  const { user } = useAuth()
  const toast    = useToast()

  const [textA,    setTextA]    = useState('')
  const [textB,    setTextB]    = useState('')
  const [titleA,   setTitleA]   = useState('Version A')
  const [titleB,   setTitleB]   = useState('Version B')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')

  const handleCompare = async (e) => {
    e.preventDefault()
    if (!user) { onShowAuth(); return }
    if (!textA.trim() || !textB.trim()) {
      setError('Please provide text for both versions.')
      return
    }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await compareTexts({ textA, textB, titleA: titleA || 'Version A', titleB: titleB || 'Version B' })
      setResult(r.data.comparison)
      toast('Comparison complete!', 'success')
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Comparison failed'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <GitCompare className="w-7 h-7 text-brand-400" />Compare Mode
        </h1>
        <p className="text-sm text-white/50 mt-1">Analyze two pieces of content side-by-side and find the winner</p>
      </div>

      <form onSubmit={handleCompare} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Version A */}
          <div className="glass p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-xs font-bold text-brand-300">A</div>
              <input type="text" value={titleA} onChange={e => setTitleA(e.target.value)}
                className="input-field py-1.5 text-sm font-semibold" placeholder="Version A title" />
            </div>
            <textarea id="compare-text-a" rows={10} value={textA} onChange={e => setTextA(e.target.value)}
              placeholder="Paste your first text here…"
              className="input-field resize-none text-sm leading-relaxed font-mono" required />
          </div>

          {/* Version B */}
          <div className="glass p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300">B</div>
              <input type="text" value={titleB} onChange={e => setTitleB(e.target.value)}
                className="input-field py-1.5 text-sm font-semibold" placeholder="Version B title" />
            </div>
            <textarea id="compare-text-b" rows={10} value={textB} onChange={e => setTextB(e.target.value)}
              placeholder="Paste your second text here…"
              className="input-field resize-none text-sm leading-relaxed font-mono" required />
          </div>
        </div>

        {error && (
          <div className="glass border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button id="compare-btn" type="submit" disabled={loading} className="btn-primary justify-center py-3 text-base font-bold">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Comparing…</> : <><ArrowLeftRight className="w-5 h-5" />Compare Now</>}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* Winner banner */}
          <div className="glass p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="section-label">Comparison Result</span>
              <h2 className="text-xl font-extrabold text-white mt-1">
                Winner: <span className="gradient-text">{result.winner}</span>
              </h2>
            </div>
            <ScoreDiff delta={result.scoreDelta} />
          </div>

          {/* Side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { data: result.analysisA, label: titleA || 'Version A', accent: 'brand' },
              { data: result.analysisB, label: titleB || 'Version B', accent: 'purple' },
            ].map(({ data, label, accent }) => data && (
              <div key={label} className="glass p-5 flex flex-col gap-4">
                <h3 className={`font-bold text-${accent}-300`}>{label}</h3>
                <ScoreRing score={data.overallScore || 50} />
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { l: 'Positive', v: `${data.distribution?.positivePercent || 0}%`, c: 'text-emerald-400' },
                    { l: 'Neutral',  v: `${data.distribution?.neutralPercent  || 0}%`, c: 'text-white/50'   },
                    { l: 'Negative', v: `${data.distribution?.negativePercent || 0}%`, c: 'text-red-400'    },
                  ].map(s => (
                    <div key={s.l} className="bg-white/5 rounded-xl p-2">
                      <p className={`text-sm font-bold ${s.c}`}>{s.v}</p>
                      <p className="text-xs text-white/40">{s.l}</p>
                    </div>
                  ))}
                </div>
                {data.executiveSummary && (
                  <p className="text-xs text-white/55 leading-relaxed line-clamp-4">{data.executiveSummary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
