import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe, login as apiLogin, signup as apiSignup, logout as apiLogout } from '../utils/api.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  useEffect(() => {
    getMe()
      .then(r => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const r = await apiLogin({ email, password })
    setUser(r.data.user)
    setToken(r.data.token)
    return r.data.user
  }, [])

  const signup = useCallback(async (name, email, password) => {
    const r = await apiSignup({ name, email, password })
    setUser(r.data.user)
    setToken(r.data.token)
    return r.data.user
  }, [])

  const logout = useCallback(async () => {
    await apiLogout().catch(() => { })
    setUser(null)
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
