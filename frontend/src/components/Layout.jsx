import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import {
  BarChart2, Zap, CheckSquare, Coffee, Trophy, Users, Calendar,
  LogOut, Lock, ChevronDown, Sun, Moon, Menu, X, LayoutDashboard,
} from "lucide-react"
import Logo from "./Logo"
import Avatar from "./ui/Avatar"
import ChangePasswordModal from "./ui/ChangePasswordModal"
import { colors, shadows, radius } from "../constants/tokens"

const TABS = [
  { path: "/eval",     label: "Evaluación",    icon: BarChart2   },
  { path: "/prod",     label: "Productividad", icon: Zap         },
  { path: "/board",    label: "Tareas",        icon: CheckSquare },
  { path: "/calendar", label: "Calendario",    icon: Calendar    },
  { path: "/quiz",     label: "Quiz",          icon: Coffee      },
  { path: "/ranking",  label: "Ranking",       icon: Trophy      },
]
// Admin-only tabs. Dashboard is placed first so GG/Admin lands on the
// Vista Ejecutiva naturally when navigating the admin section.
const ADMIN_TABS = [
  { path: "/dashboard", label: "Vista Ejecutiva", icon: LayoutDashboard },
  { path: "/team",      label: "Equipo",          icon: Users },
]

const PAGE_META = {
  "/eval":      { title: "Evaluaciones",       subtitle: "Desempeño del equipo" },
  "/prod":      { title: "Productividad",      subtitle: "Métricas y tareas" },
  "/board":     { title: "Tablero de Tareas",  subtitle: "Gestión de actividades" },
  "/calendar":  { title: "Calendario",         subtitle: "Vencimientos y eventos" },
  "/quiz":      { title: "Quiz Mensual",       subtitle: "Evaluación de conocimiento" },
  "/ranking":   { title: "Ranking Anual",      subtitle: "Clasificación del equipo" },
  "/team":      { title: "Gestión de Equipo",  subtitle: "Administración de miembros" },
  "/dashboard": { title: "Vista Ejecutiva",    subtitle: "Matriz de talento" },
}

export default function Layout({ children }) {
  const { user, logout }     = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate             = useNavigate()
  const { pathname }         = useLocation()

  const [sidebarOpen,   setSidebarOpen]   = useState(false)
  const [dropdownOpen,  setDropdownOpen]  = useState(false)
  const [showChangePwd, setShowChangePwd] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  function handleLogout() { logout(); navigate("/login") }

  const tabs     = user?.isCont ? [...TABS, ...ADMIN_TABS] : TABS
  const pageMeta = PAGE_META[pathname] ?? { title: "Coocentral", subtitle: "" }
  const isDark   = theme === "dark"

  // ── Shared hover helpers (inline style handlers) ──────────────────
  const navBtnHover = (e, active) => {
    if (!active) e.currentTarget.style.background = "var(--bg-primary)"
  }
  const navBtnLeave = (e, active) => {
    if (!active) e.currentTarget.style.background = "transparent"
  }
  const menuBtnHover = e => { e.currentTarget.style.background = "var(--bg-primary)" }
  const menuBtnLeave = e => { e.currentTarget.style.background = "transparent" }

  return (
    <div className="app-shell">

      {/* ── Mobile overlay ─────────────────────────────────────────── */}
      <div
        className={`sidebar-overlay${sidebarOpen ? " open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>

        {/* Logo */}
        <div style={{
          padding: "18px 16px 14px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <Logo size={140} variant={isDark ? "light" : "auto"} />
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {tabs.map(t => {
            const isActive = pathname === t.path
            const Icon     = t.icon
            return (
              <button
                key={t.path}
                type="button"
                onClick={() => navigate(t.path)}
                onMouseEnter={e => navBtnHover(e, isActive)}
                onMouseLeave={e => navBtnLeave(e, isActive)}
                style={{
                  display: "flex", alignItems: "center", gap: 11,
                  width: "100%", padding: "10px 12px",
                  borderRadius: radius.md, border: "none",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  marginBottom: 2, textAlign: "left",
                  background: isActive ? colors.brandPine : "transparent",
                  color:      isActive ? "#fff" : "var(--text-body)",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* User section (bottom) */}
        {user && (
          <div className="sidebar-user" ref={dropdownRef}>

            {/* Avatar trigger */}
            <button
              type="button"
              onClick={() => setDropdownOpen(v => !v)}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-primary)" }}
              onMouseLeave={e => { e.currentTarget.style.background = dropdownOpen ? "var(--bg-primary)" : "transparent" }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "10px 12px",
                borderRadius: radius.md, border: "none",
                cursor: "pointer", textAlign: "left",
                background: dropdownOpen ? "var(--bg-primary)" : "transparent",
                transition: "background 0.15s",
              }}
            >
              <Avatar emoji={user.emoji} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: "var(--text-title)", lineHeight: 1.2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-label)" }}>
                  {user.isCont ? "Contadora" : user.role}
                </div>
              </div>
              <ChevronDown
                size={14}
                color="var(--text-label)"
                style={{
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  flexShrink: 0,
                }}
              />
            </button>

            {/* Dropdown — opens upward */}
            {dropdownOpen && (
              <div style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 10, right: 10,
                background: "var(--bg-card)",
                borderRadius: radius.md,
                boxShadow: shadows.lg,
                border: "1px solid var(--border)",
                zIndex: 200,
                overflow: "hidden",
              }}>
                {/* Dark / Light toggle */}
                <button
                  type="button"
                  onClick={() => { toggleTheme(); setDropdownOpen(false) }}
                  onMouseEnter={menuBtnHover}
                  onMouseLeave={menuBtnLeave}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "11px 16px",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 13, color: "var(--text-body)",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isDark
                      ? <Sun  size={15} color="var(--text-label)" />
                      : <Moon size={15} color="var(--text-label)" />
                    }
                    {isDark ? "Modo claro" : "Modo oscuro"}
                  </div>
                  {/* Toggle pill */}
                  <div style={{
                    width: 32, height: 18, borderRadius: 9, flexShrink: 0,
                    background: isDark ? colors.brandPine : "var(--border)",
                    position: "relative", transition: "background 0.2s",
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: "50%",
                      background: "#fff",
                      position: "absolute", top: 3,
                      left: isDark ? 17 : 3,
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                    }} />
                  </div>
                </button>

                <div style={{ height: 1, background: "var(--border)" }} />

                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); setShowChangePwd(true) }}
                  onMouseEnter={menuBtnHover}
                  onMouseLeave={menuBtnLeave}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "11px 16px",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 13, color: "var(--text-body)",
                    transition: "background 0.15s",
                  }}
                >
                  <Lock size={15} color="var(--text-label)" />
                  Cambiar contraseña
                </button>

                <div style={{ height: 1, background: "var(--border)" }} />

                <button
                  type="button"
                  onClick={handleLogout}
                  onMouseEnter={e => { e.currentTarget.style.background = `${colors.danger}12` }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "11px 16px",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 13, color: colors.danger,
                    transition: "background 0.15s",
                  }}
                >
                  <LogOut size={15} color={colors.danger} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Main area ──────────────────────────────────────────────── */}
      <div className="main-area">

        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            type="button"
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", padding: 4,
              color: "var(--text-title)",
            }}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Logo size={120} variant={isDark ? "light" : "auto"} />
          {/* Spacer to center logo */}
          <div style={{ width: 30 }} />
        </div>

        {/* Desktop page header (breadcrumb) */}
        <div className="page-header">
          <div>
            <div style={{
              fontSize: 17, fontWeight: 800,
              color: "var(--text-title)", lineHeight: 1.2,
            }}>
              {pageMeta.title}
            </div>
            {pageMeta.subtitle && (
              <div style={{ fontSize: 11, color: "var(--text-label)", marginTop: 1 }}>
                {pageMeta.subtitle}
              </div>
            )}
          </div>
          {/* Breadcrumb */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, color: "var(--text-label)",
          }}>
            <span>Coocentral</span>
            <span>/</span>
            <span style={{ color: "var(--text-body)", fontWeight: 600 }}>
              {pageMeta.title}
            </span>
          </div>
        </div>

        {/* Page content */}
        <div className="page-content">
          {children}
        </div>
      </div>

      {/* Global modals */}
      <ChangePasswordModal open={showChangePwd} onClose={() => setShowChangePwd(false)} />
    </div>
  )
}
