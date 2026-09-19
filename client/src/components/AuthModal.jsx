import { useState } from 'react'
import { X, Brain, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './Toast.jsx'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, signup } = useAuth()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        toast('Welcome back! 👋', 'success')
      } else {
        if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return }
        await signup(name, email, password)
        toast('Account created successfully! 🎉', 'success')
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass w-full max-w-md shadow-glass animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-brand-400" />
            </div>
            <span className="font-bold text-lg gradient-text">SentiAgent</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-6 pb-0 gap-2">
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === m ? 'bg-brand-600 text-white shadow-glow' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input id="auth-name" type="text" placeholder="Full name" value={name}
                onChange={e => setName(e.target.value)} required className="input-field pl-10" />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input id="auth-email" type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)} required className="input-field pl-10" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input id="auth-password" type={showPw ? 'text' : 'password'} placeholder="Password (min 6 chars)"
              value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="input-field pl-10 pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button id="auth-submit" type="submit" disabled={loading} className="btn-primary justify-center py-3 mt-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
