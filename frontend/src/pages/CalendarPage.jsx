import { useState, useEffect, useMemo } from "react"
import { ChevronLeft, ChevronRight, Users, User, Calendar as CalendarIcon, AlertCircle, Cake, Plus, Trash2, StickyNote, Building2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import Layout from "../components/Layout"
import SectionCard from "../components/ui/SectionCard"
import Modal from "../components/ui/Modal"
import { colors, radius, inputStyle } from "../constants/tokens"
import { TEAM } from "../constants/team"

// Spanish month + day labels.
const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
]
const DOW = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]

// 7-year window (configurable)
const YEAR_MIN = 2024
const YEAR_MAX = 2030

// Color palette for "Cambiar color del día" — using brand-friendly hex tokens.
const REMINDER_COLORS = [
  { hex: "#1a5c2e", name: "Pino" },
  { hex: "#3498db", name: "Azul" },
  { hex: "#e67e22", name: "Naranja" },
  { hex: "#e74c3c", name: "Rojo" },
  { hex: "#9b59b6", name: "Morado" },
  { hex: "#16a34a", name: "Verde" },
]

const PRIORITY_TINT = {
  alta:  { bg: "rgba(231, 76, 60, 0.18)",  border: "rgba(231, 76, 60, 0.45)",  text: "#b03a2e" },
  media: { bg: "rgba(230, 126, 34, 0.18)", border: "rgba(230, 126, 34, 0.45)", text: "#a15518" },
  baja:  { bg: "rgba(39, 174, 96, 0.18)",  border: "rgba(39, 174, 96, 0.45)",  text: "#1e8449" },
}

// "YYYY-MM-DD" → local Date avoiding TZ shift.
function parseISO(d) {
  if (!d || typeof d !== "string") return null
  const [y, m, day] = d.slice(0, 10).split("-").map(Number)
  if (!y || !m || !day) return null
  return new Date(y, m - 1, day)
}
function ymd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// Build a 6×7 grid (Mon-first) for a given year/month — pads with prev/next month days.
function buildMonthGrid(year, month /* 0-11 */) {
  const first = new Date(year, month, 1)
  // Convert JS Sunday-first (0..6) to Mon-first (0=Mon..6=Sun)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - startOffset)
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push(d)
  }
  return cells
}

export default function CalendarPage() {
  const { user } = useAuth()
  const isCont = user?.isCont

  const today = useMemo(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }, [])

  const [items, setItems]         = useState([])
  const [teamUsers, setTeamUsers] = useState([])
  const [allUsers, setAllUsers]   = useState([]) // for birthdays panel — visible to everyone
  const [reminders, setReminders] = useState([]) // personal reminders for current user
  // For admin (Contadora), "corporate" shows all tasks + all reminders and
  // new reminders are created as isGlobal=true. For regular users, selectedId
  // is locked to their own userId.
  const [selectedId, setSelectedId] = useState(isCont ? "corporate" : user?.userId)
  const isCorporate = isCont && selectedId === "corporate"
  const isAdminSelf = isCont && selectedId === user?.userId
  const [loading, setLoading]     = useState(true)
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // Day-detail modal state
  const [openDay, setOpenDay] = useState(null) // "YYYY-MM-DD" | null
  const [newText, setNewText] = useState("")
  const [newColor, setNewColor] = useState("")
  const [saving, setSaving]   = useState(false)

  // Load every user (any role) so the birthdays panel works for both admin and employee.
  useEffect(() => {
    api.get("/api/users")
      .then(res => setAllUsers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAllUsers([]))
  }, [])

  // Load reminders scoped to the current selection.
  // - Employee: GET /api/reminders → backend returns own + all globals.
  // - Admin corporate view: GET /api/reminders → backend returns everything.
  // - Admin viewing a specific user: GET /api/reminders?userId=X → that user + globals.
  function loadReminders() {
    const qs = (isCont && selectedId && selectedId !== "corporate")
      ? `?userId=${encodeURIComponent(selectedId)}`
      : ""
    api.get(`/api/reminders${qs}`)
      .then(res => setReminders(Array.isArray(res.data) ? res.data : []))
      .catch(() => setReminders([]))
  }
  useEffect(() => { loadReminders() }, [selectedId, isCont])

  // Admin: load team (non-Contadora employees). The admin's own "Mi Calendario"
  // and the "Calendario Corporativo" options are rendered separately in the UI.
  useEffect(() => {
    if (!isCont) return
    api.get("/api/users").then(res => {
      const nonCont = res.data.filter(u => !u.isCont)
      const sorted = nonCont.sort((a, b) => {
        const ai = TEAM.findIndex(t => t.nick === a.nick)
        const bi = TEAM.findIndex(t => t.nick === b.nick)
        return ai - bi
      })
      setTeamUsers(sorted)
    })
  }, [isCont])

  // Fetch tasks depending on selection.
  // - "corporate": GET /api/board → all items across the org (admin-only endpoint).
  // - userId: GET /api/board/{userId} → that user's board (admin or owner).
  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    const url = selectedId === "corporate" ? "/api/board" : `/api/board/${selectedId}`
    api.get(url)
      .then(res => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [selectedId])

  // Group tasks by deadline ymd. Skip items without deadline (legacy safety via ?.).
  const byDay = useMemo(() => {
    const map = {}
    for (const it of items) {
      const dl = it?.deadline
      if (!dl) continue
      const key = String(dl).slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(it)
    }
    return map
  }, [items])

  // Upcoming events: items with deadline >= today, sorted ascending, top 8.
  const upcoming = useMemo(() => {
    const future = items
      .filter(it => {
        const d = parseISO(it?.deadline)
        return d && d.getTime() >= today.getTime()
      })
      .sort((a, b) => (a.deadline > b.deadline ? 1 : -1))
    return future.slice(0, 8)
  }, [items, today])

  // Birthdays for the side panel — all members of the visible month + next month.
  // Status (passed / today / upcoming) is computed against today's date dynamically.
  const sidePanelBirthdays = useMemo(() => {
    const todayMs = today.getTime()
    // Build profile array
    const profiles = allUsers
      .filter(u => u?.birthday && /^\d{4}-\d{2}-\d{2}$/.test(u.birthday))
      .map(u => {
        const profile = TEAM.find(t => t.nick === u.nick)
        return {
          id: u.id,
          nick: u.nick,
          name: u.name,
          role: u.role,
          emoji: u.emoji || profile?.emoji || "🎂",
          bMonth: Number(u.birthday.slice(5, 7)),  // 1-12
          bDay:   Number(u.birthday.slice(8, 10)),
        }
      })

    // Helper: build entries for a (year, month0) bucket
    const buildBucket = (y, m0, label) => {
      const month1 = m0 + 1
      return profiles
        .filter(p => p.bMonth === month1)
        .map(p => {
          const occurrence = new Date(y, m0, p.bDay)
          const diff = Math.round((occurrence.getTime() - todayMs) / 86400000)
          let status, statusColor
          if (diff > 0)      { status = `Faltan ${diff} día${diff === 1 ? "" : "s"}`; statusColor = colors.brandPine }
          else if (diff === 0) { status = "¡Es hoy!";          statusColor = colors.brandPine }
          else                 { status = "Ya pasó";           statusColor = colors.textLabel }
          return { ...p, occurrence, diff, status, statusColor, bucket: label }
        })
        .sort((a, b) => a.bDay - b.bDay)
    }

    // Visible month + next month (handle year rollover)
    const nextMonth0 = month === 11 ? 0 : month + 1
    const nextYear   = month === 11 ? year + 1 : year

    return {
      current: buildBucket(year, month, MONTHS[month]),
      next:    buildBucket(nextYear, nextMonth0, MONTHS[nextMonth0]),
    }
  }, [allUsers, today, year, month])

  // Group reminders by ymd for fast lookup in cells / modal.
  const remindersByDay = useMemo(() => {
    const map = {}
    for (const r of reminders) {
      const k = String(r?.date || "").slice(0, 10)
      if (!k) continue
      if (!map[k]) map[k] = []
      map[k].push(r)
    }
    return map
  }, [reminders])

  // Group birthdays by "MM-DD" for fast lookup in cells.
  const birthdaysByMD = useMemo(() => {
    const map = {}
    for (const u of allUsers) {
      if (!u?.birthday || !/^\d{4}-\d{2}-\d{2}$/.test(u.birthday)) continue
      const md = u.birthday.slice(5) // "MM-DD"
      if (!map[md]) map[md] = []
      const profile = TEAM.find(t => t.nick === u.nick)
      map[md].push({
        id: u.id,
        nick: u.nick,
        name: u.name,
        emoji: u.emoji || profile?.emoji || "🎂",
      })
    }
    return map
  }, [allUsers])

  // First non-null reminder color for a given day (used to tint the cell).
  function dayColor(key) {
    const list = remindersByDay[key] ?? []
    const r = list.find(x => x?.color)
    return r?.color || null
  }

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])

  function goPrev() {
    let m = month - 1
    let y = year
    if (m < 0) { m = 11; y -= 1 }
    if (y < YEAR_MIN) return
    setYear(y); setMonth(m)
  }
  function goNext() {
    let m = month + 1
    let y = year
    if (m > 11) { m = 0; y += 1 }
    if (y > YEAR_MAX) return
    setYear(y); setMonth(m)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  const todayKey = ymd(today)
  const atMin = year === YEAR_MIN && month === 0
  const atMax = year === YEAR_MAX && month === 11

  // Modal handlers
  function openDayModal(key) {
    setOpenDay(key)
    setNewText("")
    setNewColor("")
  }
  function closeDayModal() {
    setOpenDay(null)
    setNewText("")
    setNewColor("")
  }
  async function saveReminder() {
    const text = newText.trim()
    if (!text || !openDay) return
    setSaving(true)
    try {
      await api.post("/api/reminders", {
        date: openDay,
        text,
        color: newColor || null,
        // Corporate view auto-flags new reminders as global.
        isGlobal: isCorporate,
      })
      toast.success(isCorporate ? "Recordatorio corporativo guardado" : "Recordatorio guardado")
      setNewText("")
      setNewColor("")
      loadReminders()
    } catch (err) {
      toast.error(err?.response?.data?.detail?.[0]?.msg || "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }
  async function deleteReminder(id) {
    try {
      await api.delete(`/api/reminders/${id}`)
      toast.success("Recordatorio eliminado")
      loadReminders()
    } catch {
      toast.error("No se pudo eliminar")
    }
  }

  // Build modal day-context once per opening
  const modalDayInfo = useMemo(() => {
    if (!openDay) return null
    const d = parseISO(openDay)
    if (!d) return null
    const md = openDay.slice(5)
    return {
      date: d,
      label: d.toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
      tasks: byDay[openDay] ?? [],
      birthdays: birthdaysByMD[md] ?? [],
      reminders: remindersByDay[openDay] ?? [],
    }
  }, [openDay, byDay, birthdaysByMD, remindersByDay])

  return (
    <Layout>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Calendar selector — admin only. Corporate + own calendar + employees. */}
        {isCont && (
          <SectionCard icon={Users} title="Calendarios" style={{ padding: "16px 20px", marginBottom: 14 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 8,
            }}>
              {/* Corporate (all) */}
              {(() => {
                const isActive = selectedId === "corporate"
                return (
                  <button onClick={() => setSelectedId("corporate")} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 18px", minHeight: 44, width: "100%",
                    borderRadius: 14, cursor: "pointer", fontSize: 14,
                    justifyContent: "flex-start",
                    border: `2px solid ${isActive ? colors.brandPine : colors.border}`,
                    background: isActive ? colors.brandPineLt : colors.bgCard,
                    color: isActive ? "#111827" : colors.textBody,
                    fontWeight: isActive ? 700 : 500,
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "var(--shadow-sm)" : "none",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    <Building2 size={16} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Calendario Corporativo (Todos)</span>
                  </button>
                )
              })()}
              {/* Admin's own calendar */}
              {user?.userId && (() => {
                const isActive = selectedId === user.userId
                return (
                  <button onClick={() => setSelectedId(user.userId)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 18px", minHeight: 44, width: "100%",
                    borderRadius: 14, cursor: "pointer", fontSize: 14,
                    justifyContent: "flex-start",
                    border: `2px solid ${isActive ? colors.brandPine : colors.border}`,
                    background: isActive ? colors.brandPineLt : colors.bgCard,
                    color: isActive ? "#111827" : colors.textBody,
                    fontWeight: isActive ? 700 : 500,
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "var(--shadow-sm)" : "none",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    <User size={16} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Mi Calendario ({user?.name || "Contadora"})</span>
                  </button>
                )
              })()}
              {/* Employees */}
              {teamUsers.map(u => {
                const isActive = selectedId === u.id
                return (
                  <button key={u.id} onClick={() => setSelectedId(u.id)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 18px", minHeight: 44, width: "100%",
                    borderRadius: 14, cursor: "pointer", fontSize: 14,
                    justifyContent: "flex-start",
                    border: `2px solid ${isActive ? colors.brandPine : colors.border}`,
                    background: isActive ? colors.brandPineLt : colors.bgCard,
                    color: isActive ? "#111827" : colors.textBody,
                    fontWeight: isActive ? 700 : 500,
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "var(--shadow-sm)" : "none",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    <User size={16} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nick}</span>
                  </button>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* Calendar + side panel responsive layout */}
        <div className="calendar-layout" style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 16,
          alignItems: "start",
        }}>

          {/* ── Main calendar card ─────────────────────────────── */}
          <SectionCard style={{ padding: 20 }}>

            {/* Header: month nav + year selector + today button */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, marginBottom: 16, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={goPrev}
                  disabled={atMin}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: atMin ? "var(--text-label)" : "var(--text-title)",
                    cursor: atMin ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: atMin ? 0.4 : 1,
                  }}
                  aria-label="Mes anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <div style={{
                  fontSize: 18, fontWeight: 800, color: "var(--text-title)",
                  minWidth: 180, textAlign: "center",
                }}>
                  {MONTHS[month]} {year}
                </div>
                <button
                  onClick={goNext}
                  disabled={atMax}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: atMax ? "var(--text-label)" : "var(--text-title)",
                    cursor: atMax ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: atMax ? 0.4 : 1,
                  }}
                  aria-label="Mes siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  style={{
                    fontSize: 14, fontWeight: 600,
                    padding: "8px 12px", borderRadius: 10,
                    border: "2px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-title)",
                    cursor: "pointer",
                  }}
                >
                  {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  style={{
                    fontSize: 14, fontWeight: 600,
                    padding: "8px 12px", borderRadius: 10,
                    border: "2px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-title)",
                    cursor: "pointer",
                  }}
                >
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <button
                  onClick={goToday}
                  style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: `2px solid ${colors.brandPine}`,
                    background: colors.brandPineLt,
                    color: "#111827",
                    cursor: "pointer",
                  }}
                >
                  Hoy
                </button>
              </div>
            </div>

            {/* Day-of-week headers */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6,
            }}>
              {DOW.map(d => (
                <div key={d} style={{
                  textAlign: "center", fontSize: 11, fontWeight: 700,
                  color: "var(--text-label)", textTransform: "uppercase", letterSpacing: 0.6,
                  padding: "6px 0",
                }}>{d}</div>
              ))}
            </div>

            {/* Day cells (6 weeks × 7 days = 42) */}
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-label)" }}>
                Cargando tareas…
              </div>
            ) : (
              <div className="calendar-grid" style={{
                display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6,
              }}>
                {cells.map((d, i) => {
                  const inMonth = d.getMonth() === month
                  const key = ymd(d)
                  const isToday = key === todayKey
                  const dayTasks = byDay[key] ?? []
                  const dayRems  = remindersByDay[key] ?? []
                  const dayBdays = birthdaysByMD[key.slice(5)] ?? []
                  const tint     = dayColor(key) // hex from a reminder, or null
                  // Background priority: today > tinted reminder > default
                  const cellBg = isToday
                    ? colors.brandPineLt
                    : (tint ? `${tint}1F` /* ~12% alpha */ : "var(--bg-card)")
                  const cellBorder = isToday
                    ? colors.brandPine
                    : (tint ? tint : "var(--border)")
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openDayModal(key)}
                      className="calendar-cell"
                      style={{
                        textAlign: "left",
                        minHeight: 92,
                        borderRadius: radius.md,
                        border: `1px solid ${cellBorder}`,
                        background: cellBg,
                        padding: 6,
                        opacity: inMonth ? 1 : 0.5,
                        display: "flex", flexDirection: "column", gap: 4,
                        overflow: "hidden",
                        cursor: "pointer",
                        font: "inherit",
                        color: "inherit",
                      }}
                      aria-label={`Día ${d.getDate()}`}
                    >
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4,
                      }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", overflow: "hidden" }}>
                          {dayBdays.length > 0 && (
                            <span title={dayBdays.map(b => b.name).join(", ")} style={{ fontSize: 12, lineHeight: 1 }}>🎂</span>
                          )}
                          {dayRems.length > 0 && (
                            <span title={`${dayRems.length} recordatorio(s)`} style={{
                              fontSize: 9, lineHeight: 1, padding: "2px 5px",
                              borderRadius: 999,
                              background: tint || colors.brandPine,
                              color: "#fff", fontWeight: 700,
                            }}>{dayRems.length}</span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 12, fontWeight: 700,
                          color: isToday ? "#111827" : (inMonth ? "var(--text-title)" : "var(--text-label)"),
                          textAlign: "right",
                        }}>
                          {d.getDate()}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                        {dayTasks.slice(0, 2).map(t => {
                          const tt = PRIORITY_TINT[t?.priority] ?? PRIORITY_TINT.media
                          return (
                            <div key={t.id} title={t.title} style={{
                              fontSize: 10, fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: tt.bg,
                              border: `1px solid ${tt.border}`,
                              color: tt.text,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {t.title}
                            </div>
                          )
                        })}
                        {dayRems.slice(0, 1).map(r => (
                          <div key={r.id} title={r.text} style={{
                            fontSize: 10, fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: r.color ? `${r.color}26` : "var(--bg-secondary)",
                            border: `1px solid ${r.color || "var(--border)"}`,
                            color: r.color || "var(--text-body)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            display: "flex", alignItems: "center", gap: 4,
                          }}>
                            <StickyNote size={9} /> {r.text}
                          </div>
                        ))}
                        {(dayTasks.length + dayRems.length) > 3 && (
                          <div style={{ fontSize: 10, color: "var(--text-label)", fontWeight: 600 }}>
                            +{(dayTasks.length + dayRems.length) - 3} más
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* ── Side panel: Próximos eventos + cumpleaños ──────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <SectionCard icon={AlertCircle} title="Próximos vencimientos" style={{ padding: 20 }}>
              {loading ? (
                <div style={{ color: "var(--text-label)", fontSize: 13 }}>Cargando…</div>
              ) : upcoming.length === 0 ? (
                <div style={{ color: "var(--text-label)", fontSize: 13 }}>
                  Sin tareas con fecha próxima.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {upcoming.map(t => {
                    const d = parseISO(t?.deadline)
                    if (!d) return null
                    const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
                    const tint = PRIORITY_TINT[t?.priority] ?? PRIORITY_TINT.media
                    const urgent = diff <= 3
                    return (
                      <div key={t.id} style={{
                        padding: 12, borderRadius: radius.md,
                        border: "1px solid var(--border)",
                        background: "var(--bg-secondary)",
                        display: "flex", flexDirection: "column", gap: 4,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                          <div style={{
                            fontSize: 13, fontWeight: 700, color: "var(--text-title)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            flex: 1, minWidth: 0,
                          }}>{t.title}</div>
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            padding: "2px 8px", borderRadius: 999,
                            background: tint.bg, border: `1px solid ${tint.border}`, color: tint.text,
                            textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0,
                          }}>{t.priority}</span>
                        </div>
                        <div style={{ fontSize: 11, color: urgent ? colors.danger : "var(--text-label)", fontWeight: 600 }}>
                          {d.toLocaleDateString("es-CO", { day: "2-digit", month: "long" })}
                          {" · "}
                          {diff === 0 ? "Hoy"
                            : diff === 1 ? "Mañana"
                            : `En ${diff} días`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard icon={Cake} title="Cumpleaños" style={{ padding: 20 }}>
              {sidePanelBirthdays.current.length === 0 && sidePanelBirthdays.next.length === 0 ? (
                <div style={{ color: "var(--text-label)", fontSize: 13 }}>
                  No hay cumpleaños registrados.
                  <div style={{ fontSize: 11, marginTop: 6, color: "var(--text-label)" }}>
                    Registra la fecha desde Equipo → Editar miembro.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { key: "current", title: MONTHS[month], list: sidePanelBirthdays.current },
                    { key: "next",    title: MONTHS[month === 11 ? 0 : month + 1], list: sidePanelBirthdays.next },
                  ].map(group => (
                    <div key={group.key}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: 0.6, color: "var(--text-label)",
                        marginBottom: 8,
                      }}>{group.title}</div>
                      {group.list.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--text-label)", fontStyle: "italic" }}>
                          Sin cumpleaños este mes.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {group.list.map(m => {
                            const passed = m.diff < 0
                            const isToday = m.diff === 0
                            return (
                              <div key={m.id || m.nick} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: 10, borderRadius: radius.md,
                                background: isToday ? colors.brandPineLt : "var(--bg-secondary)",
                                border: `1px solid ${isToday ? colors.brandPine : "var(--border)"}`,
                                opacity: passed ? 0.6 : 1,
                              }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: "50%",
                                  background: colors.brandPineLt,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 18, flexShrink: 0,
                                }}>{m.emoji}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 13, fontWeight: 700,
                                    color: "var(--text-title)",
                                    textDecoration: passed ? "line-through" : "none",
                                    textDecorationColor: "var(--text-label)",
                                  }}>{m.name}</div>
                                  <div style={{ fontSize: 11, color: "var(--text-label)" }}>
                                    {String(m.bDay).padStart(2, "0")} de {MONTHS[m.bMonth - 1].toLowerCase()}
                                  </div>
                                </div>
                                <div style={{
                                  fontSize: 10, fontWeight: 700,
                                  padding: "3px 8px", borderRadius: 999,
                                  background: isToday ? colors.brandPine : (passed ? "var(--bg-card)" : `${colors.brandPine}1A`),
                                  color:      isToday ? "#fff" : m.statusColor,
                                  border:     isToday ? "none" : `1px solid ${passed ? "var(--border)" : colors.brandPine}`,
                                  whiteSpace: "nowrap",
                                  textTransform: "uppercase", letterSpacing: 0.4,
                                }}>
                                  {m.status}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

        </div>
      </div>

      {/* ── Day-detail modal ──────────────────────────────────────── */}
      <Modal
        open={!!openDay}
        onClose={closeDayModal}
        title={modalDayInfo ? modalDayInfo.label : ""}
        maxWidth={520}
      >
        {modalDayInfo && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Tasks */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 0.5, color: "var(--text-label)", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <CalendarIcon size={12} /> Tareas que vencen ({modalDayInfo.tasks.length})
              </div>
              {modalDayInfo.tasks.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-label)" }}>Sin tareas con vencimiento.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {modalDayInfo.tasks.map(t => {
                    const tt = PRIORITY_TINT[t?.priority] ?? PRIORITY_TINT.media
                    return (
                      <div key={t.id} style={{
                        padding: "8px 10px", borderRadius: radius.sm,
                        background: tt.bg, border: `1px solid ${tt.border}`,
                        color: tt.text, fontSize: 13, fontWeight: 600,
                      }}>{t.title}</div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Birthdays */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 0.5, color: "var(--text-label)", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Cake size={12} /> Cumpleaños
              </div>
              {modalDayInfo.birthdays.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-label)" }}>Nadie cumple este día.</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {modalDayInfo.birthdays.map(b => (
                    <span key={b.id || b.nick} style={{
                      fontSize: 12, fontWeight: 700,
                      padding: "4px 10px", borderRadius: 999,
                      background: colors.brandPineLt, color: colors.brandPineDk,
                      border: `1px solid ${colors.brandPine}`,
                    }}>{b.emoji} {b.name}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Existing reminders */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 0.5, color: "var(--text-label)", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <StickyNote size={12} /> Recordatorios ({modalDayInfo.reminders.length})
              </div>
              {modalDayInfo.reminders.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-label)" }}>Aún no hay recordatorios para este día.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {modalDayInfo.reminders.map(r => {
                    // Only admins may delete global reminders; owners or admins may delete personal ones.
                    const canDelete = isCont || (!r.isGlobal && r.userId === user?.userId)
                    return (
                      <div key={r.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: radius.sm,
                        background: r.color ? `${r.color}26` : "var(--bg-secondary)",
                        border: `1px solid ${r.color || "var(--border)"}`,
                      }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: r.color || "var(--text-label)", flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, fontSize: 13, color: "var(--text-title)", minWidth: 0, wordBreak: "break-word" }}>
                          {r.text}
                          {r.isGlobal && (
                            <span style={{
                              marginLeft: 8,
                              display: "inline-flex", alignItems: "center", gap: 3,
                              fontSize: 9, fontWeight: 800,
                              padding: "2px 6px", borderRadius: 999,
                              background: `${colors.brandPine}26`,
                              color: colors.brandPine,
                              border: `1px solid ${colors.brandPine}66`,
                              textTransform: "uppercase", letterSpacing: 0.4,
                              verticalAlign: "middle",
                            }}>
                              <Building2 size={9} /> Global
                            </span>
                          )}
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => deleteReminder(r.id)}
                            title="Eliminar"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: colors.danger, padding: 4,
                              display: "flex", alignItems: "center",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* New reminder form — hidden when admin is viewing another employee's
                calendar (read-only scope). Corporate view and admin-self allow creation. */}
            {(!isCont || isCorporate || isAdminSelf) && (
            <div style={{
              borderTop: `1px solid ${colors.border}`,
              paddingTop: 14,
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 0.5, color: "var(--text-label)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Plus size={12} /> Nuevo recordatorio
                {isCorporate && (
                  <span style={{
                    marginLeft: 6,
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: 9, fontWeight: 800,
                    padding: "2px 7px", borderRadius: 999,
                    background: colors.brandPine,
                    color: "#fff",
                    letterSpacing: 0.4,
                  }}>
                    <Building2 size={9} /> CORPORATIVO
                  </span>
                )}
              </div>
              <input
                type="text"
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="Ej: Llamar al proveedor…"
                maxLength={280}
                style={{ ...inputStyle, fontSize: 14 }}
                onKeyDown={e => { if (e.key === "Enter" && newText.trim()) saveReminder() }}
              />
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: "var(--text-label)",
                  marginBottom: 6,
                }}>Color del día (opcional)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setNewColor("")}
                    title="Sin color"
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      border: `2px solid ${newColor === "" ? colors.brandPine : "var(--border)"}`,
                      background: "var(--bg-secondary)",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: "var(--text-label)",
                    }}
                  >∅</button>
                  {REMINDER_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewColor(c.hex)}
                      title={c.name}
                      style={{
                        width: 28, height: 28, borderRadius: "50%",
                        border: `2px solid ${newColor === c.hex ? colors.textTitle : "transparent"}`,
                        background: c.hex,
                        cursor: "pointer",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={closeDayModal}
                  style={{
                    padding: "8px 14px", borderRadius: radius.sm,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-body)", fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >Cerrar</button>
                <button
                  type="button"
                  onClick={saveReminder}
                  disabled={saving || !newText.trim()}
                  style={{
                    padding: "8px 16px", borderRadius: radius.sm,
                    border: `1px solid ${colors.brandPine}`,
                    background: colors.brandPine,
                    color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: (saving || !newText.trim()) ? "not-allowed" : "pointer",
                    opacity: (saving || !newText.trim()) ? 0.6 : 1,
                  }}
                >{saving ? "Guardando…" : "Guardar"}</button>
              </div>
            </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  )
}
