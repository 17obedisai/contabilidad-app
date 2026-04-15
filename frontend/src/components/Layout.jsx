import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { BarChart2, Zap, CheckSquare, Coffee, Trophy, Users, LogOut, Lock, ChevronDown } from "lucide-react"
import Logo from "./Logo"
import Avatar from "./ui/Avatar"
import ChangePasswordModal from "./ui/ChangePasswordModal"
import { colors, radius, shadows } from "../constants/tokens"
import { G, DG, BD } from "../constants/theme"

const TABS = [
  { path: "/eval",    label: "Evaluación",   icon: BarChart2  },
  { path: "/prod",    label: "Productividad", icon: Zap        },
  { path: "/board",   label: "Tareas",       icon: CheckSquare },
  { path: "/quiz",    label: "Quiz",         icon: Coffee     },
  { path: "/ranking", label: "Ranking",      icon: Trophy     },
]

const ADMIN_TAB = { path: "/team", label: "Equipo", icon: Users }

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showChangePwd, setShowChangePwd] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleLogout() {
    logout()
    navigate("/login")
  }

  const tabs = user?.isCont ? [...TABS, ADMIN_TAB] : TABS

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: colors.bgPrimary,
        color: colors.textTitle,
        minHeight: "100vh",
        padding: "16px 12px",
        maxWidth: 1100,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <style>{`* { box-sizing: border-box } select option { background: #fff } textarea { font-family: inherit } input[type=range] { accent-color: ${G} }`}</style>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, flexWrap: "wrap", gap: 8,
      }}>
        <Logo size={140} />
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Avatar dropdown */}
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setDropdownOpen(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: colors.bgCard, border: `1px solid ${colors.border}`,
                  borderRadius: radius.md, padding: "6px 12px",
                  cursor: "pointer", boxShadow: shadows.sm,
                  transition: "box-shadow 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = shadows.md}
                onMouseLeave={e => e.currentTarget.style.boxShadow = shadows.sm}
              >
                <Avatar emoji={user.emoji} size={32} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DG, lineHeight: 1.2 }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{user.isCont ? "Contadora" : user.role}</div>
                </div>
                <ChevronDown
                  size={14}
                  color={colors.textLabel}
                  style={{
                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0,
                  background: colors.bgCard, borderRadius: radius.md,
                  boxShadow: shadows.lg, border: `1px solid ${colors.border}`,
                  minWidth: 180, zIndex: 200, overflow: "hidden",
                }}>
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(false); setShowChangePwd(true) }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "11px 16px", background: "none",
                      border: "none", cursor: "pointer", fontSize: 14,
                      color: colors.textBody, transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = colors.bgPrimary}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <Lock size={15} color={colors.textLabel} />
                    Cambiar contraseña
                  </button>
                  <div style={{ height: 1, background: colors.border }} />
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "11px 16px", background: "none",
                      border: "none", cursor: "pointer", fontSize: 14,
                      color: colors.danger, transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${colors.danger}08`}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <LogOut size={15} color={colors.danger} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nav tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((t) => {
          const isActive = pathname === t.path
          const Icon = t.icon
          return (
            <button
              key={t.path}
              type="button"
              onClick={() => navigate(t.path)}
              style={{
                flex: "1 1 auto", minWidth: 0,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 14px", borderRadius: radius.md,
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: isActive ? colors.brandPine : colors.bgCard,
                color: isActive ? "#fff" : colors.textBody,
                boxShadow: isActive ? "none" : shadows.sm,
                transition: "all 0.2s",
              }}
            >
              <Icon size={15} strokeWidth={2.5} />
              {t.label}
            </button>
          )
        })}
      </div>

      {children}

      {/* Footer */}
      <div style={{
        textAlign: "center", marginTop: 32, padding: 14,
        borderTop: `1px solid ${colors.border}`,
      }}>
        <Logo size={100} />
        <div style={{ fontSize: 10, color: "#ccc", marginTop: 4 }}>
          Cooperativa Central de Caficultores del Huila · {new Date().getFullYear()}
        </div>
      </div>

      {/* Global modals */}
      <ChangePasswordModal open={showChangePwd} onClose={() => setShowChangePwd(false)} />
    </div>
  )
}
