import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { TEAM } from "../constants/team"
import Logo from "../components/Logo"
import Avatar from "../components/ui/Avatar"
import { G, DG, LG, BG, BD, inputStyle, cardStyle } from "../constants/theme"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [selected, setSelected] = useState(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const btnBase = {
    padding: "12px 20px", borderRadius: 12, border: "none",
    cursor: "pointer", fontSize: 14, fontWeight: 600,
    transition: "all 0.2s", minHeight: 44,
  }
  const btnPrimary = { ...btnBase, background: G, color: "#fff", width: "100%" }
  const btnSecondary = { ...btnBase, background: "#f0f4f0", color: "#666", width: "100%", fontSize: 13 }
  const btnProfile = { ...btnBase, background: "#f0f4f0", color: "#1a1a1a", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", textAlign: "left", width: "100%" }

  async function handleLogin() {
    if (!selected || !password) return
    setLoading(true)
    setError("")
    try {
      const user = await login(selected.nick, password)
      navigate(user.isCont ? "/eval" : "/eval")
    } catch {
      setError("Nick o contraseña incorrectos")
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleLogin()
  }

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: `linear-gradient(145deg, ${BG}, #e8f0e8)`,
        color: "#1a1a1a",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <style>{`* { box-sizing: border-box }`}</style>

      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <Logo size={180} />
        <div style={{ height: 8 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: DG, margin: "0 0 4px" }}>
          Equipo Contable y Tributario
        </h2>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 24 }}>
          Sistema de Evaluación y Productividad
        </p>

        <div style={{ ...cardStyle, padding: 24 }}>
          {!selected ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, color: DG, marginBottom: 16 }}>
                Selecciona tu perfil
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {TEAM.map((member) => (
                  <button
                    key={member.nick}
                    onClick={() => { setSelected(member); setError(""); setPassword("") }}
                    style={btnProfile}
                  >
                    <Avatar emoji={member.emoji} size={40} />
                    <div>
                      <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: 15 }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#888" }}>{member.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <Avatar emoji={selected.emoji} size={64} />
              <div style={{ fontSize: 18, fontWeight: 700, color: DG, marginTop: 8 }}>
                {selected.name}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>{selected.role}</div>

              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError("") }}
                onKeyDown={handleKeyDown}
                placeholder="Contraseña"
                autoFocus
                style={{ ...inputStyle, marginBottom: 8, textAlign: "center", fontSize: 16 }}
              />

              {error && (
                <div style={{ color: "#e74c3c", fontSize: 13, marginBottom: 8 }}>{error}</div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || !password}
                style={{ ...btnPrimary, marginBottom: 8, opacity: loading || !password ? 0.7 : 1 }}
              >
                {loading ? "Verificando…" : "Entrar"}
              </button>
              <button
                onClick={() => { setSelected(null); setPassword(""); setError("") }}
                style={btnSecondary}
              >
                ← Cambiar perfil
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 16, fontSize: 10, color: "#ccc" }}>
          ☕ Cooperativa Central de Caficultores del Huila
        </div>
      </div>
    </div>
  )
}
