import { Brain, Zap, BarChart3, GitCompare, History, ArrowRight, CheckCircle2, Shield, Globe, Youtube } from 'lucide-react'

const FEATURES = [
  { icon: <Zap className="w-6 h-6 text-brand-400" />,         title: 'Real-time Streaming',   desc: 'Watch the AI agent progress through 5 stages live via Server-Sent Events.' },
  { icon: <BarChart3 className="w-6 h-6 text-purple-400" />,   title: 'Rich Analytics',         desc: 'Emotion radar, sentiment distribution, aspect-based analysis and more.' },
  { icon: <GitCompare className="w-6 h-6 text-emerald-400" />, title: 'Compare Mode',           desc: 'Side-by-side analysis to compare two versions of content.' },
  { icon: <Shield className="w-6 h-6 text-amber-400" />,       title: 'Sarcasm Detection',      desc: 'Advanced AI flags irony and sarcasm so you get true sentiment.' },
  { icon: <Globe className="w-6 h-6 text-sky-400" />,          title: 'Multi-source Ingestion', desc: 'Text, URLs, CSV files, and YouTube comment threads.' },
  { icon: <History className="w-6 h-6 text-rose-400" />,       title: 'Persistent History',     desc: 'All analyses are saved and searchable for each account.' },
]

const PIPELINE = [
  { step: 1, stage: 'Ingest',     desc: 'Detects input type and extracts content',          color: 'text-brand-400' },
  { step: 2, stage: 'Preprocess', desc: 'Cleans, detects language, chunks long content',    color: 'text-purple-400' },
  { step: 3, stage: 'Analyze',    desc: 'Gemini AI scores sentiment, emotion & sarcasm',    color: 'text-sky-400' },
  { step: 4, stage: 'Aggregate',  desc: 'Merges scores, themes, and aspect breakdowns',     color: 'text-emerald-400' },
  { step: 5, stage: 'Reflect',    desc: 'Executive summary + 3 recommended actions',        color: 'text-amber-400' },
]

export default function LandingPage({ onShowAuth, onNavigate }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="hero-bg relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-1/3 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 py-24 sm:py-36 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-brand-600/20 border border-brand-500/30 text-brand-300 mb-8">
            <Brain className="w-3.5 h-3.5" />Powered by Google Gemini AI
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
            Understand the <span className="gradient-text">emotion behind</span> every word
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            SentiAgent is an AI-powered sentiment intelligence platform. Analyze text, articles, CSV datasets, and YouTube comments — and turn raw feedback into executive-ready insights in seconds.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button id="hero-cta-primary" onClick={onShowAuth}
              className="btn-primary text-base py-3 px-8">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </button>
            <button id="hero-cta-secondary" onClick={() => onNavigate('analyzer')}
              className="btn-secondary text-base py-3 px-8">
              Try Demo
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-16 flex-wrap">
            {[
              { val: '6',    label: 'Emotions tracked' },
              { val: '5',    label: 'Pipeline stages' },
              { val: '100%', label: 'Free to use' },
              { val: '∞',    label: 'Analyses stored' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="text-3xl font-extrabold gradient-text">{s.val}</span>
                <span className="text-xs text-white/40 mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Input types */}
      <section className="bg-surface-950 py-16 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-center text-2xl font-bold text-white mb-10">Analyze any type of content</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '📝', label: 'Plain Text',    desc: 'Reviews, posts, feedback' },
              { icon: '🔗', label: 'Web URLs',      desc: 'Articles, blog posts' },
              { icon: '📊', label: 'CSV Datasets',  desc: 'Bulk review analysis' },
              { icon: '▶️', label: 'YouTube',       desc: 'Comment sentiment' },
            ].map(item => (
              <div key={item.label} className="glass-hover p-5 text-center group">
                <div className="text-4xl mb-3">{item.icon}</div>
                <p className="font-bold text-white text-sm">{item.label}</p>
                <p className="text-xs text-white/40 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-surface-900/50 py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-center text-2xl font-bold text-white mb-3">Everything you need</h2>
          <p className="text-center text-white/50 text-sm mb-12">Production-grade sentiment intelligence in a single platform</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="glass-hover p-5 flex gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="bg-surface-950 py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-center text-2xl font-bold text-white mb-3">The AI Agent Pipeline</h2>
          <p className="text-center text-white/50 text-sm mb-12">5 explicit stages streamed in real-time to your dashboard</p>
          <div className="flex flex-col gap-0">
            {PIPELINE.map((p, i) => (
              <div key={p.step} className="flex items-start gap-5">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-sm font-bold ${p.color}`}>
                    {p.step}
                  </div>
                  {i < PIPELINE.length - 1 && <div className="w-px h-10 bg-white/10 mt-1" />}
                </div>
                <div className="pb-8">
                  <p className={`font-bold text-sm ${p.color}`}>{p.stage}</p>
                  <p className="text-white/55 text-sm mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface-900 py-16 border-t border-white/5">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-extrabold text-white mb-4">Ready to analyze sentiment?</h2>
          <p className="text-white/50 mb-8 text-sm">Create a free account and run your first analysis in under a minute.</p>
          <button id="cta-signup-btn" onClick={onShowAuth} className="btn-primary text-base py-3 px-10">
            Create Free Account <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-950 border-t border-white/5 py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-brand-500" />
            <span className="text-sm font-bold gradient-text">SentiAgent</span>
          </div>
          <p className="text-xs text-white/30">Built with React + Vite + Express + Google Gemini</p>
        </div>
      </footer>
    </div>
  )
}
