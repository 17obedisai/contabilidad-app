import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { TEAM } from "../constants/team"
import Logo from "../components/Logo"
import Avatar from "../components/ui/Avatar"

// ── Login palette (forced dark, independent of global theme) ─────────────
const C = {
  bg:       "#0f172a",
  surface:  "rgba(30, 41, 59, 0.55)",
  border:   "rgba(51, 65, 85, 0.6)",
  text:     "#f8fafc",
  textDim:  "#cbd5e1",
  textMute: "#94a3b8",
  pine:     "#1a5c2e",
  pineSoft: "rgba(26, 92, 46, 0.35)",
  emerald:  "#059669",
  danger:   "#f87171",
}

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    if (!selected || !password) return
    setLoading(true); setError("")
    try {
      const u = await login(selected.nick, password)
      navigate(u.isCont ? "/eval" : "/eval")
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
    transition: "transform 0.15s, background 0.2s, opacity 0.2s",
  }

  return (
    <div style={{
      position: "relative", minHeight: "100vh", overflow: "hidden",
      background: C.bg, color: C.text,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      {/* ── Mesh gradient — blurred floating blobs ──────────────────── */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, overflow: "hidden", zIndex: 0,
      }}>
        {/* Top-left PINE blob */}
        <div style={{
          position: "absolute",
          top: "-15%", left: "-10%",
          width: 520, height: 520,
          background: "radial-gradient(circle, #1a5c2e 0%, rgba(26,92,46,0) 65%)",
          filter: "blur(110px)",
          opacity: 0.85,
        }} />
        {/* Bottom-right emerald blob */}
        <div style={{
          position: "absolute",
          bottom: "-20%", right: "-15%",
          width: 600, height: 600,
          background: "radial-gradient(circle, #059669 0%, rgba(5,150,105,0) 65%)",
          filter: "blur(120px)",
          opacity: 0.7,
        }} />
        {/* Center accent — softer pine pulse */}
        <div style={{
          position: "absolute",
          top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 380, height: 380,
          background: "radial-gradient(circle, rgba(26,92,46,0.55) 0%, rgba(15,23,42,0) 70%)",
          filter: "blur(90px)",
          opacity: 0.9,
        }} />
        {/* Subtle vignette to deepen edges */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, rgba(15,23,42,0) 50%, rgba(15,23,42,0.6) 100%)",
        }} />
      </div>

      {/* ── Glassmorphism card ─────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 420,
        textAlign: "center",
      }}>

        {/* Logo + headline */}
        <div style={{ marginBottom: 24 }}>
          <Logo size={170} variant="light" />
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
          boxShadow:
            "0 20px 50px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          {!selected ? (
            <>
              <p style={{
                fontSize: 13, fontWeight: 600, color: C.textDim,
                margin: "0 0 14px",
              }}>
                Selecciona tu perfil
              </p>
              <div style={{
                display: "grid", gap: 8,
                maxHeight: 360, overflowY: "auto",
                paddingRight: 4,
              }}>
                {TEAM.map(member => (
                  <button
                    key={member.nick}
                    onClick={() => { setSelected(member); setError(""); setPassword("") }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(51, 65, 85, 0.6)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(30, 41, 59, 0.55)" }}
                    style={{
                      ...btnBase,
                      padding: "12px 14px",
                      background: "rgba(30, 41, 59, 0.55)",
                      color: C.text,
                      display: "flex", alignItems: "center", gap: 12,
                      textAlign: "left",
                      border: `1px solid ${C.border}`,
                      width: "100%",
                    }}
                  >
                    <Avatar emoji={member.emoji} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMute }}>{member.role}</div>
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
                  background: "rgba(15, 23, 42, 0.7)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: C.text,
                  fontSize: 16, textAlign: "center",
                  outline: "none",
                  marginBottom: 10,
                  transition: "border-color 0.2s, background 0.2s",
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
