import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const PIE_COLORS = {
  positive: '#10b981',
  neutral:  '#f59e0b',
  negative: '#ef4444',
}

const sentimentLabel = (score) => {
  if (score >= 65) return { label: 'Positive', color: 'text-emerald-400' }
  if (score >= 45) return { label: 'Neutral / Mixed', color: 'text-amber-400' }
  return { label: 'Negative', color: 'text-red-400' }
}

const ScoreRing = ({ score = 50 }) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score || 0))))
  const { label, color } = sentimentLabel(safeScore)
  const radius = 52
  const circ   = 2 * Math.PI * radius
  const dash   = (safeScore / 100) * circ
  const ringColor = safeScore >= 65 ? '#10b981' : safeScore >= 45 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="65" cy="65" r={radius} fill="none" stroke={ringColor} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 65 65)" style={{ filter: `drop-shadow(0 0 8px ${ringColor})`, transition: 'stroke-dasharray 0.8s ease' }} />
        <text x="65" y="60" textAnchor="middle" fill="white" fontSize="26" fontWeight="800">{safeScore}</text>
        <text x="65" y="78" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">/ 100</text>
      </svg>
      <span className={`text-sm font-bold ${color}`}>{label}</span>
    </div>
  )
}

const EmotionRadar = ({ data }) => {
  if (!data) return null
  const chartData = Object.entries(data).map(([emotion, value]) => ({
    emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
    value: Math.round((value || 0) * 100),
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="emotion" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Emotions" dataKey="value" stroke="#818cf8" fill="#6366f1" fillOpacity={0.35} strokeWidth={2} />
        <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff' }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

const SentimentPie = ({ distribution }) => {
  if (!distribution) return null

  // Fallback to percent if counts are not populated
  const posVal = distribution.positiveCount ?? distribution.positivePercent ?? 0
  const neuVal = distribution.neutralCount ?? distribution.neutralPercent ?? 0
  const negVal = distribution.negativeCount ?? distribution.negativePercent ?? 0

  const data = [
    { name: 'Positive', value: posVal, pct: distribution.positivePercent ?? 0 },
    { name: 'Neutral',  value: neuVal, pct: distribution.neutralPercent ?? 0 },
    { name: 'Negative', value: negVal, pct: distribution.negativePercent ?? 0 },
  ].filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-white/40">
        No sentiment distribution data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
          dataKey="value" paddingAngle={3} strokeWidth={0}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={PIE_COLORS[entry.name.toLowerCase()]}
              style={{ filter: `drop-shadow(0 0 6px ${PIE_COLORS[entry.name.toLowerCase()]})` }} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, name, item) => [`${v} (${item.payload.pct}%)`, name]}
          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff' }}
        />
        <Legend formatter={(v) => <span className="text-white/70 text-xs">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

const AspectBar = ({ aspects }) => {
  if (!aspects?.length) return null
  const data = aspects.slice(0, 8).map(a => {
    const net = (a.positive || 0) - (a.negative || 0)
    const conf = a.avgConfidence || 0.75
    const score = a.sentiment === 'positive' ? Math.round(conf * 100) :
                  a.sentiment === 'negative' ? -Math.round(conf * 100) :
                  Math.round(net * 20)
    return {
      aspect: a.aspect,
      score: Math.max(-100, Math.min(100, score))
    }
  })

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis type="number" domain={[-100, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
        <YAxis type="category" dataKey="aspect" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} width={90} />
        <Tooltip formatter={(v) => `${v > 0 ? '+' : ''}${v}%`} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff' }} />
        <Bar dataKey="score" radius={[0, 6, 6, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.score >= 0 ? '#10b981' : '#ef4444'}
              style={{ filter: `drop-shadow(0 0 4px ${entry.score >= 0 ? '#10b981' : '#ef4444'})` }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export { ScoreRing, EmotionRadar, SentimentPie, AspectBar }
