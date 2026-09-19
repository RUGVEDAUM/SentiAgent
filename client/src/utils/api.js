import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// ── Auth ──────────────────────────────────────────
export const signup = (data) => api.post('/auth/signup', data)
export const login = (data) => api.post('/auth/login', data)
export const logout = () => api.post('/auth/logout')
export const getMe = () => api.get('/auth/me')

// ── Status ────────────────────────────────────────
export const getStatus = () => api.get('/status')

// ── Analyses ──────────────────────────────────────
export const analyzeSync = (data) => api.post('/analyses', data)
export const getHistory = () => api.get('/analyses')
export const getAnalysis = (id) => api.get(`/analyses/${id}`)
export const deleteAnalysis = (id) => api.delete(`/analyses/${id}`)
export const compareTexts = (data) => api.post('/analyses/compare', data)

// ── SSE Streaming Helper ───────────────────────────
export const streamAnalysis = ({ inputType, rawInput, title, token, onProgress, onComplete, onError }) => {
  const controller = new AbortController()

  const run = async () => {
    try {
      const body = JSON.stringify({ inputType, rawInput, title })
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/analyses/stream', {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
        credentials: 'include',
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Stream request failed' }))
        onError(err.error || 'Analysis stream failed')
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop()

        for (const block of blocks) {
          if (!block.trim()) continue
          const eventMatch = block.match(/^event:\s*(.+)$/m)
          const dataMatch = block.match(/^data:\s*(.+)$/m)
          if (!dataMatch) continue

          const eventName = eventMatch ? eventMatch[1].trim() : 'message'
          const data = JSON.parse(dataMatch[1].trim())

          if (eventName === 'progress') onProgress(data)
          else if (eventName === 'complete') onComplete(data.analysis)
          else if (eventName === 'error') onError(data.error)
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') onError(err.message || 'Stream connection failed')
    }
  }

  run()
  return () => controller.abort()
}

export default api
