import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import Navbar from './components/Navbar.jsx'
import AuthModal from './components/AuthModal.jsx'
import LandingPage from './pages/LandingPage.jsx'
import AnalyzerView from './pages/AnalyzerView.jsx'
import CompareView from './pages/CompareView.jsx'
import HistoryView from './pages/HistoryView.jsx'

const THEME_KEY = 'sentiagent-theme'

function AppShell() {
  const { user, loading } = useAuth()
  const [view,      setView]      = useState('landing')
  const [showAuth,  setShowAuth]  = useState(false)
  const [theme,     setTheme]     = useState(() => localStorage.getItem(THEME_KEY) || 'dark')

  // Apply theme class to <html>
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.classList.add(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // Redirect to analyzer if logged in and on landing
  useEffect(() => {
    if (!loading && user && view === 'landing') setView('analyzer')
  }, [user, loading, view])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 text-sm animate-pulse">Starting SentiAgent…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-surface-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Navbar
        onShowAuth={() => setShowAuth(true)}
        currentView={view}
        onNavigate={setView}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main>
        {view === 'landing'   && <LandingPage onShowAuth={() => setShowAuth(true)} onNavigate={setView} />}
        {view === 'analyzer'  && <AnalyzerView onShowAuth={() => setShowAuth(true)} />}
        {view === 'compare'   && <CompareView  onShowAuth={() => setShowAuth(true)} />}
        {view === 'history'   && <HistoryView  onShowAuth={() => setShowAuth(true)} />}
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  )
}
