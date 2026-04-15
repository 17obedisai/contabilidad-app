import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Logo from "./Logo"
import Avatar from "./ui/Avatar"
import Button from "./ui/Button"
import { G, DG, BG, BD } from "../constants/theme"

const TABS = [
  { path: "/eval",    label: "📊 Evaluación"    },
  { path: "/prod",    label: "⚡ Productividad"  },
  { path: "/board",   label: "📌 Tareas"          },
  { path: "/quiz",    label: "☕ Quiz"           },
  { path: "/ranking", label: "🏆 Ranking"        },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: BG,
        color: "#1a1a1a",
        minHeight: "100vh",
        padding: "16px 12px",
        maxWidth: 960,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <style>{`* { box-sizing: border-box } select option { background: #fff } textarea { font-family: inherit } input[type=range] { accent-color: ${G} }`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <Logo size={140} />
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar emoji={user.emoji} size={36} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: DG }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{user.isCont ? "Contadora" : "Equipo"}</div>
            </div>
            <Button onClick={handleLogout} style={{ padding: "6px 14px", fontSize: 12 }}>
              Salir
            </Button>
          </div>
        )}
      </div>

      {/* Nav tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Button
            key={t.path}
            active={pathname === t.path}
            onClick={() => navigate(t.path)}
            style={{ flex: "1 1 auto", minWidth: 0 }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {children}

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 24, padding: 14, borderTop: `1px solid ${BD}` }}>
        <Logo size={100} />
        <div style={{ fontSize: 10, color: "#ccc", marginTop: 4 }}>
          Cooperativa Central de Caficultores del Huila · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
