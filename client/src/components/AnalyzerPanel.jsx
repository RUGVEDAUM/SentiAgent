import { useState, useRef } from 'react'
import { Type, Link2, FileText, Youtube, Upload, Send, Loader2, ChevronDown } from 'lucide-react'

const TABS = [
  { id: 'text',    label: 'Text',    icon: <Type    className="w-4 h-4" /> },
  { id: 'url',     label: 'URL',     icon: <Link2   className="w-4 h-4" /> },
  { id: 'csv',     label: 'CSV',     icon: <FileText className="w-4 h-4" /> },
  { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4" /> },
]

export default function AnalyzerPanel({ onSubmit, loading }) {
  const [activeTab, setActiveTab]   = useState('text')
  const [text, setText]             = useState('')
  const [url, setUrl]               = useState('')
  const [ytUrl, setYtUrl]           = useState('')
  const [maxComments, setMaxComments] = useState(50)
  const [csvFile, setCsvFile]       = useState(null)
  const [dragOver, setDragOver]     = useState(false)
  const [title, setTitle]           = useState('')
  const fileRef                     = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    let rawInput, inputType, finalTitle = title

    switch (activeTab) {
      case 'text':
        if (!text.trim()) return
        rawInput = text.trim()
        inputType = 'text'
        finalTitle = title || text.substring(0, 60) + '…'
        break
      case 'url':
        if (!url.trim()) return
        rawInput = url.trim()
        inputType = 'url'
        finalTitle = title || url
        break
      case 'csv':
        if (!csvFile) return
        rawInput = csvFile
        inputType = 'csv'
        finalTitle = title || csvFile.name
        break
      case 'youtube':
        if (!ytUrl.trim()) return
        rawInput = ytUrl.trim() + (maxComments ? `|${maxComments}` : '')
        inputType = 'youtube'
        finalTitle = title || ytUrl
        break
    }
    onSubmit({ inputType, rawInput, title: finalTitle })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) setCsvFile(file)
  }

  return (
    <div className="glass animate-fade-in">
      {/* Tabs */}
      <div className="flex border-b border-white/10 p-1.5 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === t.id ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        {/* Optional title */}
        <input type="text" placeholder="Optional label / title for this analysis" value={title}
          onChange={e => setTitle(e.target.value)} className="input-field text-sm" />

        {/* Tab content */}
        {activeTab === 'text' && (
          <textarea id="text-input" rows={7} value={text} onChange={e => setText(e.target.value)}
            placeholder="Paste your text here — customer reviews, feedback, articles, social media posts…"
            className="input-field resize-none font-mono text-sm leading-relaxed" required />
        )}
        {activeTab === 'url' && (
          <div className="flex flex-col gap-2">
            <label className="section-label">Article or Web Page URL</label>
            <input id="url-input" type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/article" className="input-field" required />
            <p className="text-xs text-white/40">We'll fetch and extract the main text content from this URL.</p>
          </div>
        )}
        {activeTab === 'csv' && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-brand-400 bg-brand-600/10' : 'border-white/20 hover:border-brand-500/50 hover:bg-white/5'}`}>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => setCsvFile(e.target.files?.[0])} />
            <Upload className="w-10 h-10 text-white/30 mx-auto mb-3" />
            {csvFile ? (
              <div>
                <p className="font-semibold text-white">{csvFile.name}</p>
                <p className="text-xs text-white/50 mt-1">{(csvFile.size / 1024).toFixed(1)} KB — Click to change</p>
              </div>
            ) : (
              <div>
                <p className="text-white/60 font-medium">Drop CSV here or click to upload</p>
                <p className="text-xs text-white/40 mt-1">CSV with a "review" or "comment" column (max 10 MB)</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'youtube' && (
          <div className="flex flex-col gap-3">
            <label className="section-label">YouTube Video URL</label>
            <input id="yt-input" type="url" value={ytUrl} onChange={e => setYtUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." className="input-field" required />
            <div className="flex items-center gap-3">
              <label className="section-label whitespace-nowrap">Max comments</label>
              <select value={maxComments} onChange={e => setMaxComments(Number(e.target.value))}
                className="input-field text-sm py-2">
                {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} comments</option>)}
              </select>
            </div>
          </div>
        )}

        <button id="analyze-btn" type="submit" disabled={loading}
          className="btn-primary justify-center py-3 text-base font-bold">
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing…</>
            : <><Send className="w-5 h-5" /> Analyze Sentiment</>}
        </button>
      </form>
    </div>
  )
}
