import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Users, User, Trash2, Calendar as CalendarIcon, Clock, CheckCircle2, ListTodo, Flame, Layers, Inbox } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import Layout from "../components/Layout"
import Card from "../components/ui/Card"
import SectionCard from "../components/ui/SectionCard"
import Button from "../components/ui/Button"
import ConfirmModal from "../components/ui/ConfirmModal"
import { SkeletonCard } from "../components/ui/Skeleton"
import { G, DG, LG, BD, inputStyle } from "../constants/theme"
import { colors } from "../constants/tokens"
import { TEAM } from "../constants/team"

const STATUSES = [
  { key:"pendiente",    label:"Pendiente",    short:"Pend.",  color:"#95a5a6", icon: ListTodo },
  { key:"en_progreso",  label:"En progreso",  short:"Progreso", color:"#3498db", icon: Clock },
  { key:"completada",   label:"Completada",   short:"Hechas",  color:"#27ae60", icon: CheckCircle2 },
]

const PRIORITIES = {
  alta:  { label:"Alta",  color:"#e74c3c" },
  media: { label:"Media", color:"#e67e22" },
  baja:  { label:"Baja",  color:"#27ae60" },
}

// "All" pseudo-column for mobile pills.
const MOBILE_FILTERS = [
  { key:"all",         label:"Todas",      icon: Layers },
  { key:"pendiente",   label:"Pendientes", icon: ListTodo },
  { key:"en_progreso", label:"En curso",   icon: Clock },
  { key:"completada",  label:"Hechas",     icon: CheckCircle2 },
]

// Status → auto-progress rules
function autoProgress(status) {
  if (status === "pendiente")   return 0
  if (status === "completada")  return 100
  if (status === "en_progreso") return 40
  return null
}

export default function BoardPage() {
  const { user } = useAuth()
  const isCont = user?.isCont

  const [items, setItems]         = useState([])
  const [teamUsers, setTeamUsers] = useState([])
  // Admin picks an employee via pill selector; regular users are locked to themselves.
  const [selectedId, setSelectedId] = useState(!isCont ? user?.userId : null)
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [expandedHistory, setExpandedHistory] = useState({})
  const [form, setForm] = useState({ title:"", desc:"", priority:"media", deadline:"" })
  const [editObs, setEditObs]     = useState({})  // itemId → obs string
  const [saving, setSaving]       = useState({})  // itemId → true while saving
  const [confirmDelete, setConfirmDelete] = useState(null)  // itemId to delete
  const [mobileFilter, setMobileFilter] = useState("all")    // mobile-only column filter
  // Native HTML5 drag & drop — tracks which column is being hovered over to highlight it.
  const [draggingId, setDraggingId]   = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  // Load team list (admin only). Includes the Contadora herself so she can
  // manage her own tasks; sorted with Contadora first, rest by TEAM order.
  useEffect(() => {
    if (!isCont) return
    api.get("/api/users").then(res => {
      const sorted = [...res.data].sort((a, b) => {
        if (a.isCont && !b.isCont) return -1
        if (!a.isCont && b.isCont) return 1
        const ai = TEAM.findIndex(t => t.nick === a.nick)
        const bi = TEAM.findIndex(t => t.nick === b.nick)
        return ai - bi
      })
      setTeamUsers(sorted)
      if (!selectedId && sorted.length) setSelectedId(sorted[0].id)
    })
  }, [isCont])

  // Fetch only the selected user's board items — backend enforces ownership.
  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    api.get(`/api/board/${selectedId}`)
      .then(res => setItems(res.data))
      .finally(() => setLoading(false))
  }, [selectedId])

  async function updateItem(itemId, patch) {
    try {
      const res = await api.put(`/api/board/${itemId}`, patch)
      setItems(prev => prev.map(it => it.id === itemId ? res.data : it))
    } catch (err) {
      console.error("Error updating board item:", err?.response?.data || err.message)
    }
  }

  async function changeStatus(item, newStatus) {
    if (item.status === newStatus) return
    setSaving(prev => ({ ...prev, [item.id]: true }))
    const patch = { status: newStatus }
    const auto  = autoProgress(newStatus)
    if (auto !== null) patch.progress = auto
    // Optimistic update for instant feedback
    setItems(prev => prev.map(it =>
      it.id === item.id ? { ...it, status: newStatus, progress: auto ?? it.progress } : it
    ))
    try {
      const res = await api.put(`/api/board/${item.id}`, patch)
      setItems(prev => prev.map(it => it.id === item.id ? res.data : it))
    } catch (err) {
      console.error("Error changing status:", err?.response?.data || err.message)
      // Revert on failure
      setItems(prev => prev.map(it =>
        it.id === item.id ? { ...it, status: item.status, progress: item.progress } : it
      ))
    } finally {
      setSaving(prev => { const n = { ...prev }; delete n[item.id]; return n })
    }
  }

  async function savePriority(item, newPriority) {
    if (item.priority === newPriority) return
    setSaving(prev => ({ ...prev, [item.id]: true }))
    const prevPriority = item.priority
    // Optimistic update for instant feedback
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, priority: newPriority } : it))
    try {
      const res = await api.put(`/api/board/${item.id}`, { priority: newPriority })
      setItems(prev => prev.map(it => it.id === item.id ? res.data : it))
      toast.success("Prioridad actualizada")
    } catch (err) {
      console.error("Error updating priority:", err?.response?.data || err.message)
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, priority: prevPriority } : it))
      toast.error("No se pudo actualizar la prioridad")
    } finally {
      setSaving(prev => { const n = { ...prev }; delete n[item.id]; return n })
    }
  }

  async function saveDeadline(item, newDeadline) {
    // Accept empty string as "no deadline"; backend stores whatever is sent.
    const next = newDeadline || null
    if ((item.deadline ?? null) === next) return
    setSaving(prev => ({ ...prev, [item.id]: true }))
    const prevDeadline = item.deadline
    // Optimistic update for instant feedback
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, deadline: next } : it))
    try {
      const res = await api.put(`/api/board/${item.id}`, { deadline: next })
      setItems(prev => prev.map(it => it.id === item.id ? res.data : it))
      toast.success("Fecha límite actualizada")
    } catch (err) {
      console.error("Error updating deadline:", err?.response?.data || err.message)
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, deadline: prevDeadline } : it))
      toast.error("No se pudo actualizar la fecha")
    } finally {
      setSaving(prev => { const n = { ...prev }; delete n[item.id]; return n })
    }
  }

  async function saveObservation(item) {
    const obs = editObs[item.id]
    if (obs == null) return
    await updateItem(item.id, { observations: obs })
    setEditObs(prev => { const n = { ...prev }; delete n[item.id]; return n })
  }

  async function addItem() {
    if (!form.title.trim() || !selectedId) return
    try {
      const today = new Date().toISOString().slice(0, 10)
      // Default deadline: last day of the current month if user did not pick one.
      const now = new Date()
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const defaultDeadline = lastDay.toISOString().slice(0, 10)
      const deadline = form.deadline?.trim() ? form.deadline : defaultDeadline
      // Admin creates tasks for the currently-selected employee.
      // Employee creates tasks for themselves (selectedId === user.userId).
      const res = await api.post("/api/board", {
        ...form, deadline, userId: selectedId, status:"pendiente", progress:0,
        observations:"", date: today,
      })
      setItems(prev => [...prev, res.data])
      setForm({ title:"", desc:"", priority:"media", deadline:"" })
      setShowForm(false)
    } catch (err) {
      console.error("Error creating board item:", err?.response?.data || err.message)
    }
  }

  async function deleteItem(itemId) {
    try {
      await api.delete(`/api/board/${itemId}`)
      setItems(prev => prev.filter(it => it.id !== itemId))
      toast.success("Ítem eliminado")
    } catch (err) {
      console.error("Error deleting board item:", err?.response?.data || err.message)
      toast.error("No se pudo eliminar el ítem")
    } finally {
      setConfirmDelete(null)
    }
  }

  // Sort by `position` asc; items without position fall back to end, preserving
  // their natural order via index tiebreaker (stable sort in modern browsers).
  const sortedItems = [...items]
    .map((it, i) => ({ it, i }))
    .sort((a, b) => {
      const ap = a.it.position ?? Number.POSITIVE_INFINITY
      const bp = b.it.position ?? Number.POSITIVE_INFINITY
      if (ap !== bp) return ap - bp
      return a.i - b.i
    })
    .map(x => x.it)

  const columns = STATUSES.map(s => ({
    ...s,
    items: sortedItems.filter(it => it.status === s.key),
  }))

  // Reorder within a column: place dragged task before `targetId` (or at end if null).
  // Assigns sequential positions 100, 200, 300... and persists in one bulk call.
  async function reorderWithin(colKey, draggedId, targetId) {
    const colItems = columns.find(c => c.key === colKey)?.items || []
    const dragged = colItems.find(it => it.id === draggedId)
    if (!dragged) return
    const without = colItems.filter(it => it.id !== draggedId)
    const targetIdx = targetId ? without.findIndex(it => it.id === targetId) : without.length
    const insertAt = targetIdx < 0 ? without.length : targetIdx
    const newOrder = [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)]
    // If nothing changed, skip the API call.
    const sameOrder = newOrder.every((it, i) => it.id === colItems[i]?.id)
    if (sameOrder) return
    const reassigned = newOrder.map((it, i) => ({ ...it, position: (i + 1) * 100 }))
    // Optimistic update
    setItems(prev => prev.map(it => {
      const r = reassigned.find(x => x.id === it.id)
      return r ? { ...it, position: r.position } : it
    }))
    try {
      await api.put("/api/board/reorder", {
        items: reassigned.map(r => ({ id: r.id, position: r.position })),
      })
    } catch (err) {
      console.error("Error reordering:", err?.response?.data || err.message)
      toast.error("No se pudo reordenar")
    }
  }

  function toggleHistory(id) {
    setExpandedHistory(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const canEdit = (item) => {
    if (isCont) return true
    return item.userId === user?.userId
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Employee selector — admin only. Scaled up for parity with other pages. */}
        {isCont && teamUsers.length > 0 && (
          <SectionCard icon={Users} title="Empleado" style={{ padding: "16px 20px", marginBottom: 14 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 8,
            }}>
              {teamUsers.map(u => {
                const isActive = selectedId === u.id
                const isSelf = u.isCont && u.id === user?.userId
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
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isSelf ? "Mis Tareas (Contadora)" : u.nick}
                    </span>
                  </button>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* Add form toggle — admin only (employees can edit but not create). */}
        <div style={{ marginBottom: 16, display:"flex", justifyContent:"flex-end" }}>
          {isCont && selectedId && (
            <Button onClick={() => setShowForm(v => !v)} style={{ padding:"12px 22px", fontSize: 14, minHeight: 44, fontWeight: 700 }}>
              {showForm ? "Cancelar" : "+ Agregar ítem"}
            </Button>
          )}
        </div>

        {showForm && isCont && (
          <Card style={{ marginBottom: 16, padding: 20 }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap: 14 }}>
              <div style={{ flex:"2 1 220px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-label)", marginBottom: 6 }}>Título *</div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nombre del ítem..." style={{ ...inputStyle, width:"100%", fontSize: 14, padding: "10px 14px" }} />
              </div>
              <div style={{ flex:"3 1 280px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-label)", marginBottom: 6 }}>Descripción</div>
                <input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                  placeholder="Descripción opcional..." style={{ ...inputStyle, width:"100%", fontSize: 14, padding: "10px 14px" }} />
              </div>
              <div style={{ flex:"1 1 120px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-label)", marginBottom: 6 }}>Prioridad</div>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  style={{ ...inputStyle, width:"100%", fontSize: 14, padding: "10px 14px" }}>
                  {Object.entries(PRIORITIES).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
              <div style={{ flex:"1 1 160px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-label)", marginBottom: 6 }}>Fecha límite</div>
                <input type="date" value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  style={{ ...inputStyle, width:"100%", fontSize: 14, padding: "10px 14px" }} />
                <div style={{ fontSize: 10, color: "var(--text-label)", marginTop: 4 }}>
                  Por defecto: fin del mes actual
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"flex-end" }}>
                <Button onClick={addItem} style={{ padding:"12px 22px", fontSize: 14, minHeight: 44, fontWeight: 700 }}>Guardar</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Mobile column filter — visible only on mobile via .kanban-mobile-filter */}
        <div className="kanban-mobile-filter" style={{
          gap: 8,
          marginBottom: 12,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          paddingBottom: 4,
        }}>
          {MOBILE_FILTERS.map(f => {
            const isActive = mobileFilter === f.key
            const count = f.key === "all" ? items.length : items.filter(it => it.status === f.key).length
            const Icon = f.icon
            const accent = STATUSES.find(s => s.key === f.key)?.color || colors.brandPine
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setMobileFilter(f.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 13, fontWeight: isActive ? 700 : 600,
                  border: `1.5px solid ${isActive ? accent : "var(--border)"}`,
                  background: isActive ? accent : "var(--bg-card)",
                  color: isActive ? "#fff" : "var(--text-body)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  boxShadow: isActive ? `0 4px 14px -6px ${accent}80` : "none",
                  transition: "all 0.18s ease",
                }}
              >
                <Icon size={14} />
                <span>{f.label}</span>
                <span style={{
                  background: isActive ? "rgba(255,255,255,0.25)" : "var(--bg-secondary)",
                  color:      isActive ? "#fff" : "var(--text-label)",
                  fontSize: 11, fontWeight: 700,
                  padding: "1px 8px", borderRadius: 999,
                  fontVariantNumeric: "tabular-nums",
                }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Kanban board */}
        {loading ? (
          <div className="kanban-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 16 }}>
            {[0,1,2].map(col => (
              <div key={col} className="kanban-column">
                <div style={{ height: 42, borderRadius:"10px 10px 0 0", background: "var(--border)", marginBottom: 10 }} className="skeleton-shimmer" />
                <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
                  <SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="kanban-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 16 }}>
            {columns.map(col => {
              const isDraggingOver = dragOverCol === col.key
              return (
              <div
                key={col.key}
                className="kanban-column"
                data-mobile-hidden={mobileFilter !== "all" && mobileFilter !== col.key ? "true" : "false"}
                onDragOver={e => { e.preventDefault() }}
                onDragEnter={e => { e.preventDefault(); setDragOverCol(col.key) }}
                onDragLeave={e => {
                  // Only clear when we actually leave the column, not a child element.
                  if (e.currentTarget.contains(e.relatedTarget)) return
                  setDragOverCol(prev => (prev === col.key ? null : prev))
                }}
                onDrop={e => {
                  e.preventDefault()
                  const taskId = e.dataTransfer.getData("taskId")
                  const fromStatus = e.dataTransfer.getData("fromStatus")
                  setDragOverCol(null)
                  setDraggingId(null)
                  if (!taskId || fromStatus === col.key) return
                  const dropped = items.find(it => it.id === taskId)
                  if (!dropped) return
                  // Respect existing permission model — don't move another user's task.
                  if (!canEdit(dropped)) return
                  changeStatus(dropped, col.key)
                }}
                style={{
                  borderRadius: 16,
                  transition: "background 0.18s ease, outline-color 0.18s ease",
                  background: isDraggingOver ? `${col.color}12` : "transparent",
                  outline: isDraggingOver ? `2px dashed ${col.color}` : "2px dashed transparent",
                  outlineOffset: -4,
                }}
              >
                {/* Column header — hidden on mobile (filter pills replace it) */}
                <div className="kanban-column-header" style={{
                  display:"flex", alignItems:"center", gap: 10,
                  padding:"14px 18px", borderRadius: 14,
                  background: `linear-gradient(135deg, ${col.color}, ${col.color}DD)`,
                  color:"#fff", fontWeight: 700, fontSize: 15,
                  boxShadow: `0 8px 20px -8px ${col.color}80`,
                  marginBottom: 12,
                }}>
                  <col.icon size={16} strokeWidth={2.5} />
                  <span>{col.label}</span>
                  <span style={{
                    marginLeft:"auto",
                    background:"rgba(255,255,255,0.22)",
                    borderRadius: 999,
                    padding:"3px 10px", fontSize: 12, fontWeight: 700,
                    minWidth: 26, textAlign: "center",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {col.items.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display:"flex", flexDirection:"column", gap: 10, padding:"10px 0" }}>
                  {col.items.length === 0 && (
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 8, padding: "28px 16px",
                      borderRadius: 14,
                      border: "2px dashed var(--border)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-label)",
                      textAlign: "center",
                    }}>
                      <Inbox size={28} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                      <div style={{ fontSize: 13, fontWeight: 600 }}>¡Todo limpio por aquí!</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>No hay tareas en esta columna</div>
                    </div>
                  )}
                  {col.items.map(item => {
                    const prio = PRIORITIES[item.priority] ?? PRIORITIES.media
                    const statusMeta = STATUSES.find(s => s.key === item.status) ?? STATUSES[0]
                    const editable = canEdit(item)
                    const hasHistory = item.changes?.length > 0
                    const histExpanded = expandedHistory[item.id]
                    const obsValue = editObs[item.id] ?? item.observations ?? ""

                    // Deadline urgency for visual cue
                    let dlDiff = null, dlIsPast = false, dlIsSoon = false
                    if (item?.deadline) {
                      const dl = new Date(item.deadline + "T00:00:00")
                      const t  = new Date(); t.setHours(0,0,0,0)
                      dlDiff = Math.round((dl.getTime() - t.getTime()) / 86400000)
                      dlIsPast = dlDiff < 0 && item.status !== "completada"
                      dlIsSoon = dlDiff >= 0 && dlDiff <= 3 && item.status !== "completada"
                    }
                    const dlColor = dlIsPast ? colors.danger : (dlIsSoon ? colors.warning : "var(--text-body)")
                    const dlBg    = dlIsPast ? `${colors.danger}1A` : (dlIsSoon ? `${colors.warning}1A` : "var(--bg-secondary)")
                    const dlBorder = dlIsPast ? `${colors.danger}55` : (dlIsSoon ? `${colors.warning}55` : "var(--border)")

                    const isBeingDragged = draggingId === item.id
                    return (
                      <div key={item.id}
                        draggable={editable}
                        onDragStart={e => {
                          if (!editable) { e.preventDefault(); return }
                          e.dataTransfer.setData("taskId", item.id)
                          e.dataTransfer.setData("fromStatus", item.status)
                          e.dataTransfer.effectAllowed = "move"
                          setDraggingId(item.id)
                        }}
                        onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                        onDragOver={e => {
                          // Only intercept same-column drags; let others bubble to the column.
                          const dragging = items.find(it => it.id === draggingId)
                          if (dragging && dragging.status === item.status && dragging.id !== item.id) {
                            e.preventDefault()
                            e.stopPropagation()
                            e.dataTransfer.dropEffect = "move"
                          }
                        }}
                        onDrop={e => {
                          const taskId     = e.dataTransfer.getData("taskId")
                          const fromStatus = e.dataTransfer.getData("fromStatus")
                          // Only handle same-column drop here; let column handler deal with moves.
                          if (!taskId || taskId === item.id || fromStatus !== item.status) return
                          e.preventDefault()
                          e.stopPropagation()
                          const dropped = items.find(it => it.id === taskId)
                          if (!dropped || !canEdit(dropped)) return
                          setDraggingId(null)
                          setDragOverCol(null)
                          const rect = e.currentTarget.getBoundingClientRect()
                          const dropBefore = (e.clientY - rect.top) < rect.height / 2
                          const colItems = columns.find(c => c.key === item.status)?.items || []
                          const visible = colItems.filter(it => it.id !== taskId)
                          const targetIdx = visible.findIndex(it => it.id === item.id)
                          const beforeId = dropBefore ? item.id : (visible[targetIdx + 1]?.id ?? null)
                          reorderWithin(item.status, taskId, beforeId)
                        }}
                        style={{
                        // Premium Bento card — soft tinted gradient bg by priority, colored accent.
                        background: `linear-gradient(160deg, ${prio.color}0D 0%, var(--bg-card) 60%)`,
                        borderRadius: 16,
                        boxShadow: "var(--shadow-md)",
                        border: `1px solid ${prio.color}33`,
                        padding: 0,
                        overflow: "hidden",
                        transition: "transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s ease",
                        position: "relative",
                        cursor: editable ? "grab" : "default",
                        opacity: isBeingDragged ? 0.5 : 1,
                      }}
                        onMouseEnter={e => { if (isBeingDragged) return; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)" }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-md)" }}
                      >
                        {/* Accent bar — gradient from priority → status */}
                        <div style={{
                          height: 4,
                          background: `linear-gradient(90deg, ${prio.color}, ${statusMeta.color})`,
                        }} />

                        <div style={{ padding: 16 }}>
                          {/* Title row */}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap: 8 }}>
                            <div style={{ display:"flex", alignItems:"center", gap: 8, flex: 1, minWidth: 0 }}>
                              <span style={{
                                width: 30, height: 30, borderRadius: 10,
                                background: `${prio.color}1F`,
                                border: `1px solid ${prio.color}44`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: prio.color,
                                flexShrink: 0,
                              }}>
                                <Flame size={14} strokeWidth={2.5} />
                              </span>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-title)", flex: 1, lineHeight: 1.35 }}>{item.title}</div>
                            </div>
                            {isCont && (
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(item.id)}
                                title="Eliminar"
                                style={{
                                  background:"var(--bg-secondary)", border:"1px solid var(--border)",
                                  cursor:"pointer", color: colors.danger,
                                  width: 30, height: 30, borderRadius: 10,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0,
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${colors.danger}1A`; e.currentTarget.style.borderColor = `${colors.danger}55` }}
                                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.borderColor = "var(--border)" }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {item.desc && (
                            <div style={{ fontSize: 12, color: "var(--text-body)", marginTop: 8, lineHeight: 1.5 }}>{item.desc}</div>
                          )}

                          {/* Priority + deadline chips */}
                          <div style={{ display:"flex", gap: 6, marginTop: 12, flexWrap:"wrap", alignItems:"center" }}>
                            {editable ? (
                              <label
                                title="Cambiar prioridad"
                                draggable={false}
                                onMouseDown={e => e.stopPropagation()}
                                onDragStart={e => e.stopPropagation()}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  fontSize: 10, fontWeight: 700, color: prio.color,
                                  background: `${prio.color}1F`,
                                  padding:"4px 10px", borderRadius: 999,
                                  textTransform: "uppercase", letterSpacing: 0.4,
                                  border: `1px solid ${prio.color}44`,
                                  cursor: "pointer", position: "relative",
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: prio.color }} />
                                {prio.label}
                                <select
                                  value={item.priority}
                                  onChange={e => savePriority(item, e.target.value)}
                                  onMouseDown={e => e.stopPropagation()}
                                  style={{
                                    position: "absolute", inset: 0,
                                    width: "100%", height: "100%",
                                    opacity: 0, cursor: "pointer",
                                    padding: 0, margin: 0, border: "none",
                                  }}
                                >
                                  {Object.entries(PRIORITIES).map(([v, { label }]) => (
                                    <option key={v} value={v}>{label}</option>
                                  ))}
                                </select>
                              </label>
                            ) : (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                fontSize: 10, fontWeight: 700, color: prio.color,
                                background: `${prio.color}1F`,
                                padding:"4px 10px", borderRadius: 999,
                                textTransform: "uppercase", letterSpacing: 0.4,
                                border: `1px solid ${prio.color}44`,
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: prio.color }} />
                                {prio.label}
                              </span>
                            )}
                            {(item?.deadline || editable) && (
                              editable ? (
                                <label
                                  title="Editar fecha límite"
                                  draggable={false}
                                  onMouseDown={e => e.stopPropagation()}
                                  onPointerDown={e => e.stopPropagation()}
                                  onClick={e => e.stopPropagation()}
                                  onDragStart={e => { e.preventDefault(); e.stopPropagation() }}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: 4,
                                    fontSize: 10, fontWeight: 700, color: dlColor,
                                    background: dlBg,
                                    padding: "4px 10px", borderRadius: 999,
                                    border: `1px solid ${dlBorder}`,
                                    textTransform: "uppercase", letterSpacing: 0.4,
                                    cursor: "pointer", position: "relative",
                                  }}
                                >
                                  <CalendarIcon size={10} />
                                  {item?.deadline
                                    ? new Date(item.deadline + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
                                    : "Sin fecha"}
                                  {dlIsPast && " · Vencida"}
                                  {dlIsSoon && ` · ${dlDiff === 0 ? "Hoy" : dlDiff === 1 ? "Mañana" : `${dlDiff}d`}`}
                                  <input
                                    type="date"
                                    draggable={false}
                                    value={item.deadline || ""}
                                    onChange={e => saveDeadline(item, e.target.value)}
                                    onMouseDown={e => e.stopPropagation()}
                                    onPointerDown={e => e.stopPropagation()}
                                    onClick={e => {
                                      e.stopPropagation()
                                      // Force-open the native picker — works around draggable parent
                                      // intercepting the first click on Chromium.
                                      if (typeof e.currentTarget.showPicker === "function") {
                                        try { e.currentTarget.showPicker() } catch { /* not supported */ }
                                      }
                                    }}
                                    onDragStart={e => { e.preventDefault(); e.stopPropagation() }}
                                    style={{
                                      position: "absolute", inset: 0,
                                      width: "100%", height: "100%",
                                      opacity: 0, cursor: "pointer",
                                      padding: 0, margin: 0, border: "none",
                                    }}
                                  />
                                </label>
                              ) : (
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  fontSize: 10, fontWeight: 700, color: dlColor,
                                  background: dlBg,
                                  padding:"4px 10px", borderRadius: 999,
                                  border: `1px solid ${dlBorder}`,
                                  textTransform: "uppercase", letterSpacing: 0.4,
                                }}>
                                  <CalendarIcon size={10} />
                                  {new Date(item.deadline + "T00:00:00").toLocaleDateString("es-CO", { day:"2-digit", month:"short" })}
                                  {dlIsPast && " · Vencida"}
                                  {dlIsSoon && ` · ${dlDiff === 0 ? "Hoy" : dlDiff === 1 ? "Mañana" : `${dlDiff}d`}`}
                                </span>
                              )
                            )}
                          </div>

                        {/* Status selector */}
                        {editable && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-label)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Estado</div>
                            <div style={{ display:"flex", gap: 6 }}>
                              {STATUSES.filter(s => s.key !== item.status).map(s => {
                                const isSaving = saving[item.id]
                                const SIcon = s.icon
                                return (
                                  <button
                                    type="button"
                                    key={s.key}
                                    disabled={isSaving}
                                    onClick={() => changeStatus(item, s.key)}
                                    title={`Mover a ${s.label}`}
                                    style={{
                                      flex: 1, padding:"8px 4px", fontSize: 11, borderRadius: 10,
                                      border: `1.5px solid ${s.color}55`,
                                      background: `${s.color}14`,
                                      color: s.color,
                                      cursor: isSaving ? "wait" : "pointer",
                                      fontWeight: 700,
                                      opacity: isSaving ? 0.6 : 1,
                                      transition: "all 0.2s ease",
                                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${s.color}, ${s.color}DD)`; e.currentTarget.style.color = "#fff"; e.currentTarget.style.boxShadow = `0 4px 12px -4px ${s.color}80` }}
                                    onMouseLeave={e => { e.currentTarget.style.background = `${s.color}14`; e.currentTarget.style.color = s.color; e.currentTarget.style.boxShadow = "none" }}
                                  >
                                    <SIcon size={12} />
                                    {s.short}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Progress bar */}
                        <div style={{ marginTop: 14 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-label)", textTransform: "uppercase", letterSpacing: 0.5 }}>Progreso</span>
                            <span style={{ fontSize: 12, color: "var(--text-title)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{item.progress ?? 0}%</span>
                          </div>
                          {editable ? (
                            <input type="range" min="0" max="100" step="5"
                              value={item.progress ?? 0}
                              onChange={e => updateItem(item.id, { progress: Number(e.target.value) })}
                              style={{ width:"100%", accentColor: G }} />
                          ) : (
                            <div style={{ height: 6, background: "var(--border)", borderRadius: 3 }}>
                              <div style={{
                                height: 6, borderRadius: 3,
                                width:`${item.progress ?? 0}%`,
                                background: G,
                              }} />
                            </div>
                          )}
                        </div>

                        {/* Observations */}
                        <div style={{ marginTop: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-label)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Observaciones</div>
                          {editable ? (
                            <div>
                              <textarea
                                value={obsValue}
                                onChange={e => setEditObs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                onBlur={() => saveObservation(item)}
                                rows={2}
                                style={{ ...inputStyle, width:"100%", resize:"vertical", fontSize: 12 }}
                              />
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "var(--text-body)", whiteSpace:"pre-wrap" }}>
                              {item.observations || <span style={{ color: "var(--text-label)" }}>Sin observaciones</span>}
                            </div>
                          )}
                        </div>

                        {/* Change history */}
                        {hasHistory && (
                          <div style={{ marginTop: 14 }}>
                            <button onClick={() => toggleHistory(item.id)} style={{
                              background:"none", border:"none", cursor:"pointer",
                              fontSize: 11, color: "var(--text-label)", padding: 0,
                              fontWeight: 600,
                            }}>
                              {histExpanded ? "▲" : "▼"} Historial ({item.changes.length})
                            </button>
                            {histExpanded && (
                              <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-body)", maxHeight: 120, overflowY:"auto" }}>
                                {[...item.changes].reverse().map((h, i) => (
                                  <div key={i} style={{ padding:"3px 0", borderBottom:`1px solid ${BD}` }}>
                                    <span style={{ color: "var(--text-label)" }}>{new Date(h.date).toLocaleDateString("es-CO")}</span>
                                    {" · "}<strong>{h.field}</strong>:{" "}
                                    <span style={{ color: "var(--text-body)" }}>{h.old_value}</span>
                                    {" → "}<span style={{ color: DG }}>{h.new_value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar ítem"
        message="¿Estás seguro de que quieres eliminar este ítem? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => deleteItem(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
