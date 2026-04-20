import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Sun, Moon } from "lucide-react"
import api from "../services/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { TEAM } from "../constants/team"
import Logo from "../components/Logo"
import Avatar from "../components/ui/Avatar"

// ── Two palettes synced with ThemeContext ────────────────────────────────
const PALETTE = {
  dark: {
    bg:       "#0f172a",
    surface:  "rgba(30, 41, 59, 0.55)",
    surfaceH: "rgba(51, 65, 85, 0.7)",
    border:   "rgba(51, 65, 85, 0.6)",
    text:     "#f8fafc",
    textDim:  "#cbd5e1",
    textMute: "#94a3b8",
    inputBg:  "rgba(15, 23, 42, 0.7)",
    pine:     "#1a5c2e",
    emerald:  "#059669",
    danger:   "#f87171",
    blobA:    "#1a5c2e",
    blobB:    "#059669",
    blobC:    "rgba(26,92,46,0.55)",
    vignette: "rgba(15,23,42,0.6)",
    toggleBg: "rgba(30, 41, 59, 0.55)",
    toggleBgH:"rgba(51, 65, 85, 0.8)",
    shadow:   "0 20px 50px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
  },
  light: {
    bg:       "#f5f7fb",
    surface:  "rgba(255, 255, 255, 0.78)",
    surfaceH: "rgba(255, 255, 255, 0.95)",
    border:   "rgba(26, 92, 46, 0.18)",
    text:     "#111827",
    textDim:  "#374151",
    textMute: "#6b7280",
    inputBg:  "rgba(255, 255, 255, 0.95)",
    pine:     "#1a5c2e",
    emerald:  "#059669",
    danger:   "#dc2626",
    blobA:    "#1a5c2e",
    blobB:    "#059669",
    blobC:    "rgba(26,92,46,0.25)",
    vignette: "rgba(245,247,251,0.4)",
    toggleBg: "rgba(255,255,255,0.75)",
    toggleBgH:"rgba(255,255,255,0.95)",
    shadow:   "0 20px 50px -10px rgba(26,92,46,0.25), inset 0 1px 0 rgba(255,255,255,0.8)",
  },
}

export default function Login() {
  const { login }              = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate               = useNavigate()
  const isDark = theme === "dark"
  const C = isDark ? PALETTE.dark : PALETTE.light

  const [profiles, setProfiles] = useState(TEAM) // fallback to bundled constant
  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  // Sync profile list with backend users (so admin-created/deleted accounts appear/disappear)
  useEffect(() => {
    api.get("/api/auth/profiles")
      .then(res => {
        if (Array.isArray(res.data) && res.data.length) setProfiles(res.data)
      })
      .catch(() => { /* keep static TEAM fallback */ })
  }, [])

  async function handleLogin() {
    if (!selected || !password) return
    setLoading(true); setError("")
    try {
      await login(selected.nick, password)
      navigate("/eval")
    } catch {
      setError("Nick o contraseña incorrectos")
    } finally {
      setLoading(false)
    }
  }

  const onKey = e => { if (e.key === "Enter") handleLogin() }

  // Shared button styles
  const btnBase = {
    padding: "12px 18px", borderRadius: 12, border: "none",
    cursor: "pointer", fontSize: 14, fontWeight: 600,
    transition: "transform 0.15s, background 0.2s, opacity 0.2s, color 0.2s, border-color 0.2s",
  }

  return (
    <div style={{
      position: "relative", minHeight: "100vh", overflow: "hidden",
      background: C.bg, color: C.text,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
      transition: "background 0.25s ease, color 0.25s ease",
    }}>
      {/* ── Mesh gradient — blurred floating blobs ──────────────────── */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, overflow: "hidden", zIndex: 0,
      }}>
        <div style={{
          position: "absolute",
          top: "-15%", left: "-10%",
          width: 520, height: 520,
          background: `radial-gradient(circle, ${C.blobA} 0%, rgba(26,92,46,0) 65%)`,
          filter: "blur(110px)",
          opacity: isDark ? 0.85 : 0.35,
        }} />
        <div style={{
          position: "absolute",
          bottom: "-20%", right: "-15%",
          width: 600, height: 600,
          background: `radial-gradient(circle, ${C.blobB} 0%, rgba(5,150,105,0) 65%)`,
          filter: "blur(120px)",
          opacity: isDark ? 0.7 : 0.28,
        }} />
        <div style={{
          position: "absolute",
          top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 380, height: 380,
          background: `radial-gradient(circle, ${C.blobC} 0%, rgba(245,247,251,0) 70%)`,
          filter: "blur(90px)",
          opacity: 0.9,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, ${C.vignette} 100%)`,
        }} />
      </div>

      {/* ── Theme toggle (upper-right corner) ──────────────────────── */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        title={isDark ? "Modo claro" : "Modo oscuro"}
        onMouseEnter={e => { e.currentTarget.style.background = C.toggleBgH }}
        onMouseLeave={e => { e.currentTarget.style.background = C.toggleBg }}
        style={{
          position: "absolute", top: 20, right: 20, zIndex: 2,
          width: 40, height: 40, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: C.toggleBg,
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: `1px solid ${C.border}`,
          color: C.text, cursor: "pointer",
          transition: "background 0.2s, color 0.2s, border-color 0.2s",
        }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* ── Glassmorphism card ─────────────────────────────────────── */}
      <div className="login-card" style={{
        position: "relative", zIndex: 1,
        width: "100%",
        textAlign: "center",
      }}>

        {/* Logo + headline */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 24,
        }}>
          <Logo size={170} variant={isDark ? "light" : "default"} />
        </div>
        <h2 style={{
          fontSize: 18, fontWeight: 700, color: C.text,
          margin: "0 0 4px",
        }}>
          Equipo Contable y Tributario
        </h2>
        <p style={{ fontSize: 12, color: C.textMute, marginBottom: 22 }}>
          Sistema de Evaluación y Productividad
        </p>

        {/* Glass card */}
        <div style={{
          background: C.surface,
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: 24,
          boxShadow: C.shadow,
          transition: "background 0.25s, border-color 0.25s, box-shadow 0.25s",
        }}>
          {!selected ? (
            <>
              <p style={{
                fontSize: 13, fontWeight: 600, color: C.textDim,
                margin: "0 0 14px",
              }}>
                Selecciona tu perfil
              </p>
              <div className="login-profiles">
                {profiles.map(member => (
                  <button
                    key={member.nick}
                    className="login-profile-button"
                    onClick={() => { setSelected(member); setError(""); setPassword("") }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.surfaceH }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.surface }}
                    style={{
                      ...btnBase,
                      padding: "12px 14px",
                      background: C.surface,
                      color: C.text,
                      display: "flex", alignItems: "center", gap: 12,
                      textAlign: "left",
                      border: `1px solid ${C.border}`,
                      width: "100%",
                    }}
                  >
                    <span className="login-profile-avatar" style={{ display: "inline-flex", flexShrink: 0 }}>
                      <Avatar emoji={member.emoji} size={36} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="login-profile-name" style={{
                        fontWeight: 700, color: C.text, fontSize: 14,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {member.name}
                      </div>
                      <div className="login-profile-role" style={{
                        fontSize: 11, color: C.textMute,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {member.role}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <Avatar emoji={selected.emoji} size={64} />
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginTop: 10 }}>
                {selected.name}
              </div>
              <div style={{ fontSize: 12, color: C.textMute, marginBottom: 18 }}>
                {selected.role}
              </div>

              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError("") }}
                onKeyDown={onKey}
                placeholder="Contraseña"
                autoFocus
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: C.inputBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: C.text,
                  fontSize: 16, textAlign: "center",
                  outline: "none",
                  marginBottom: 10,
                  transition: "border-color 0.2s, background 0.2s, color 0.2s",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = C.emerald }}
                onBlur={e => { e.currentTarget.style.borderColor = C.border }}
              />

              {error && (
                <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || !password}
                onMouseEnter={e => {
                  if (!loading && password) e.currentTarget.style.background = `linear-gradient(135deg, ${C.pine}, ${C.emerald})`
                }}
                onMouseLeave={e => { e.currentTarget.style.background = C.pine }}
                style={{
                  ...btnBase,
                  width: "100%",
                  background: C.pine,
                  color: "#fff",
                  marginBottom: 8,
                  opacity: loading || !password ? 0.55 : 1,
                  boxShadow: "0 8px 24px -8px rgba(5,150,105,0.6)",
                }}
              >
                {loading ? "Verificando…" : "Entrar"}
              </button>
              <button
                onClick={() => { setSelected(null); setPassword(""); setError("") }}
                onMouseEnter={e => { e.currentTarget.style.color = C.text }}
                onMouseLeave={e => { e.currentTarget.style.color = C.textDim }}
                style={{
                  ...btnBase,
                  width: "100%",
                  background: "transparent",
                  color: C.textDim,
                  fontSize: 13,
                  border: `1px solid ${C.border}`,
                }}
              >
                ← Cambiar perfil
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: C.textMute }}>
          Cooperativa Central de Caficultores del Huila
        </div>
      </div>
    </div>
  )
}
