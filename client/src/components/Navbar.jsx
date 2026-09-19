import { useState, useEffect } from 'react'
import { Brain, Sun, Moon, History, GitCompare, Zap, User, LogOut, Menu, X, Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { getStatus } from '../utils/api.js'

export default function Navbar({ onShowAuth, onShowHistory, currentView, onNavigate, theme, onToggleTheme }) {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [features, setFeatures] = useState(null)

  useEffect(() => {
    getStatus().then(r => setFeatures(r.data.features)).catch(() => {})
  }, [])

  const navLinks = [
    { id: 'analyzer', label: 'Analyzer', icon: <Zap className="w-4 h-4" /> },
    { id: 'compare',  label: 'Compare',  icon: <GitCompare className="w-4 h-4" /> },
    { id: 'history',  label: 'History',  icon: <History className="w-4 h-4" /> },
  ]

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    onNavigate('landing')
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-surface-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-glow">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg gradient-text hidden sm:block">SentiAgent</span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => onNavigate(l.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentView === l.id ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                {l.icon}{l.label}
              </button>
            ))}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Status pill */}
            {features && (
              <div className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${features.gemini.available ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                <Activity className="w-3 h-3" />
                {features.gemini.available ? 'Gemini Flash' : 'HF Fallback'}
              </div>
            )}

            {/* Theme toggle */}
            <button id="theme-toggle" onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Auth */}
            {user ? (
              <div className="relative">
                <button id="user-menu-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-hover">
                  <div className="w-7 h-7 rounded-lg bg-brand-600/40 border border-brand-500/40 flex items-center justify-center">
                    <span className="text-sm font-bold text-brand-300">{user.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-white/80 max-w-[100px] truncate">{user.name}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 glass shadow-glass rounded-xl py-2 animate-slide-up">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-xs text-white/40">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                    </div>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <LogOut className="w-4 h-4" />Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button id="signin-btn" onClick={onShowAuth} className="btn-primary py-1.5 px-4 text-sm">
                <User className="w-4 h-4" />Sign In
              </button>
            )}

            {/* Mobile menu */}
            <button id="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-3 border-t border-white/10 animate-slide-up">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => { onNavigate(l.id); setMobileOpen(false) }}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${currentView === l.id ? 'text-brand-300 bg-brand-600/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
                {l.icon}{l.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
