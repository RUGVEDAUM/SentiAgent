import { useState, useEffect, createContext, useContext } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) setTimeout(() => removeToast(id), duration)
    return id
  }

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
  const colors = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-500/40 bg-red-500/10 text-red-300',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    info: 'border-brand-500/40 bg-brand-500/10 text-brand-300',
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-glass animate-slide-up ${colors[t.type] || colors.info}`}
          >
            <span className="text-lg flex-shrink-0">{icons[t.type]}</span>
            <p className="text-sm flex-1 font-medium">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
