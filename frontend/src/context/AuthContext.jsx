import { createContext, useContext, useState } from "react"
import api from "../services/api"
import { TEAM } from "../constants/team"

const AuthContext = createContext(null)

function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user")
    return stored ? JSON.parse(stored) : null
  })

  async function login(nick, password) {
    const res = await api.post("/api/auth/login", { nick, password })
    const access_token = res.data.access_token

    const payload = decodeJwt(access_token)
    const profile = TEAM.find((m) => m.nick === payload.nick) ?? {}
    const userInfo = { ...profile, userId: payload.userId, isCont: payload.isCont }

    localStorage.setItem("token", access_token)
    localStorage.setItem("user", JSON.stringify(userInfo))
    setToken(access_token)
    setUser(userInfo)
    return userInfo
  }

  function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
