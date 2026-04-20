import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import Layout from "../components/Layout"
import SectionCard from "../components/ui/SectionCard"
import Gauge from "../components/ui/Gauge"
import ThickBar from "../components/ui/ThickBar"
import ScoreChip from "../components/ui/ScoreChip"
import Button from "../components/ui/Button"
import ConfirmModal from "../components/ui/ConfirmModal"
import { SkeletonRow, SkeletonMetricCard } from "../components/ui/Skeleton"
import { TEAM } from "../constants/team"
import { colors, radius, shadows, typography, inputStyle, utilColor } from "../constants/tokens"
import {
  Target, TrendingUp, Clock, ListChecks, Plus, X,
  Users, User, Briefcase, CalendarClock, Hash,
  CheckCircle2, AlertTriangle, CircleDashed
} from "lucide-react"

const HM = 190
const FREQ_MULT = { diaria: 22, semanal: 4.33, mensual: 1 }

// Compliance-based weighting. hoursEstimated is the "weight" of each task;
// the status defines how much of that weight was delivered.
const STATUS_VALUE = { ON_TIME: 1.0, LATE: 0.5, PENDING: 0.0 }
const STATUS_LABELS = { ON_TIME: "A Tiempo", LATE: "Tarde", PENDING: "Pendiente" }
const STATUS_ICONS = { ON_TIME: CheckCircle2, LATE: AlertTriangle, PENDING: CircleDashed }
const STATUS_ORDER = ["ON_TIME", "LATE", "PENDING"]

function taskHours(t) {
  return (t.hoursEstimated ?? 0) * (FREQ_MULT[t.freq] ?? 1)
}
function taskCompletion(t) {
  const status = t.completionStatus ?? "PENDING"
  return taskHours(t) * (STATUS_VALUE[status] ?? 0)
}

// Compliance index: < 70 red, 70-89 yellow, 90-100 green.
function cumplColor(pct) {
  if (pct < 70) return "#e74c3c"
  if (pct < 90) return "#f1c40f"
  return "#27ae60"
}
// Status pill accent (for the active option).
function statusColor(s) {
  if (s === "ON_TIME") return "#27ae60"
  if (s === "LATE")    return "#f1c40f"
  return "#9ca3af"
}

const FREQ_LABELS = { diaria: "Diaria", semanal: "Semanal", mensual: "Mensual" }
const TYPE_LABELS  = { contable: "Contable", administrativa: "Administrativa", operativa: "Operativa", otra: "Otra" }
const TYPE_ICONS = { contable: Briefcase, administrativa: ListChecks, operativa: Target, otra: Hash }

export default function ProdPage() {
  const { user } = useAuth()
  const isCont = user?.isCont

  const [teamUsers, setTeamUsers]   = useState([])
  const [selectedId, setSelectedId] = useState(!isCont ? user?.userId : null)
  const [tasks, setTasks]           = useState([])
  const [teamTasks, setTeamTasks]   = useState({})
  const [loading, setLoading]       = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ title:"", freq:"mensual", type:"contable", hoursEstimated:1 })
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null)

  useEffect(() => {
    if (!isCont) return
    api.get("/api/users").then(res => {
      // Exclude Contadora (admin) — she isn't evaluated or measured for productivity.
      const nonCont = res.data.filter(u => !u.isCont)
      const sorted = nonCont.sort((a, b) => {
        const ai = TEAM.findIndex(t => t.nick === a.nick)
        const bi = TEAM.findIndex(t => t.nick === b.nick)
        return ai - bi
      })
      setTeamUsers(sorted)
      if (!selectedId && sorted.length) setSelectedId(sorted[0].id)
    })
  }, [isCont])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    api.get(`/api/tasks/${selectedId}`)
      .then(res => setTasks(res.data))
      .finally(() => setLoading(false))
  }, [selectedId])

  useEffect(() => {
    if (!isCont || !teamUsers.length) return
    Promise.all(teamUsers.map(u => api.get(`/api/tasks/${u.id}`).then(r => ({ id: u.id, tasks: r.data }))))
      .then(results => {
        const map = {}
        results.forEach(({ id, tasks }) => { map[id] = tasks })
        setTeamTasks(map)
      })
  }, [isCont, teamUsers])

  const totalEst        = tasks.reduce((s, t) => s + taskHours(t), 0)
  const totalCompletion = tasks.reduce((s, t) => s + taskCompletion(t), 0)
  // Índice de Cumplimiento: delivered weight over total weight.
  const cumplPct  = totalEst > 0 ? (totalCompletion / totalEst) * 100 : 0
  const estPct    = Math.min((totalEst / HM) * 100, 150)

  async function updateHours(taskId, field, value) {
    const num = Math.max(0, Number(value) || 0)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: num } : t))
    try { await api.put(`/api/tasks/${taskId}`, { [field]: num }) } catch { /* ignore */ }
  }

  async function updateStatus(taskId, status) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completionStatus: status } : t))
    try { await api.put(`/api/tasks/${taskId}`, { completionStatus: status }) } catch { /* ignore */ }
  }

  async function addTask() {
    if (!form.title.trim() || !selectedId) return
    try {
      const res = await api.post("/api/tasks", {
        ...form, userId: selectedId, hoursActual: 0, completionStatus: "PENDING",
      })
      setTasks(prev => [...prev, res.data])
      setForm({ title:"", freq:"mensual", type:"contable", hoursEstimated:1 })
      setShowForm(false)
    } catch { /* ignore */ }
  }

  async function deleteTask(taskId) {
    try {
      await api.delete(`/api/tasks/${taskId}`)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success("Tarea eliminada")
    } catch {
      toast.error("No se pudo eliminar la tarea")
    } finally {
      setConfirmDeleteTask(null)
    }
  }

  return (
    <Layout>
      <div style={{
        maxWidth: 960, margin: "0 auto",
        display: "flex", flexDirection: "column", gap: 20,
      }}>

        {/* Employee selector (contadora only) */}
        {isCont && (
          <SectionCard icon={Users} title="Empleado" style={{ padding: "16px 20px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 8,
            }}>
              {teamUsers.map(u => {
                const isActive = selectedId === u.id
                return (
                  <button key={u.id} onClick={() => setSelectedId(u.id)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                    width: "100%", justifyContent: "flex-start",
                    borderRadius: 12, cursor: "pointer", fontSize: 13,
                    border: `2px solid ${isActive ? colors.brandPine : colors.border}`,
                    background: isActive ? colors.brandPineLt : colors.bgCard,
                    // Active pill bg is light pastel — force dark text for AA contrast in any theme.
                    color: isActive ? "#111827" : colors.textBody,
                    fontWeight: isActive ? 700 : 500,
                    transition: "all 0.2s ease",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    <User size={14} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nick}</span>
                  </button>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* Summary metric cards — Bento grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}>
          {[
            {
              icon: Clock,
              label: "Horas Estimadas",
              value: `${totalEst.toFixed(1)}h`,
              sub: `${estPct.toFixed(0)}% de ${HM}h`,
              color: utilColor(estPct > 110 ? 55 : estPct > 90 ? 92 : 72),
            },
            {
              icon: TrendingUp,
              label: "Cumplimiento",
              value: `${cumplPct.toFixed(0)}%`,
              sub: `${totalCompletion.toFixed(1)}h entregadas`,
              color: cumplColor(cumplPct),
            },
            {
              icon: ListChecks,
              label: "Tareas Activas",
              value: tasks.length,
              sub: "registradas",
              color: colors.brandPine,
            },
          ].map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} style={{
              background: colors.bgCard,
              borderRadius: radius.xl,
              padding: "24px 20px",
              boxShadow: shadows.md,
              textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: radius.md,
                background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={20} color={color} strokeWidth={2.5} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
              <div style={{ ...typography.labelStyle }}>{label}</div>
              <div style={{ fontSize: 12, color: colors.textLabel }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Compliance gauge + bar */}
        <SectionCard icon={Target} title="Índice de Cumplimiento">
          <div style={{
            display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
          }}>
            <Gauge value={cumplPct} size={110} label="Cumplimiento" color={cumplColor(cumplPct)} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <ThickBar value={Math.min(cumplPct, 100)} color={cumplColor(cumplPct)} height={14} />
              <div style={{
                display: "flex", justifyContent: "space-between", marginTop: 8,
                fontSize: 12, color: colors.textLabel,
              }}>
                <span>Entregado {totalCompletion.toFixed(1)} h</span>
                <span>Estimado {totalEst.toFixed(1)} h</span>
                <span>{cumplPct.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Task list */}
        <SectionCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "18px 20px", borderBottom: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ListChecks size={20} color={colors.brandPine} strokeWidth={2.5} />
              <span style={{ fontWeight: 800, color: colors.textTitle, fontSize: 16 }}>Tareas</span>
              <span style={{
                background: colors.bgPrimary, padding: "2px 10px", borderRadius: 20,
                fontSize: 12, fontWeight: 700, color: colors.textLabel,
              }}>{tasks.length}</span>
            </div>
            {isCont && (
              <button
                type="button"
                onClick={() => setShowForm(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: radius.md,
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: showForm ? colors.danger + "15" : colors.brandPine + "12",
                  color: showForm ? colors.danger : colors.brandPine,
                  transition: "all 0.2s",
                }}
              >
                {showForm ? <X size={14} /> : <Plus size={14} />}
                {showForm ? "Cancelar" : "Agregar"}
              </button>
            )}
          </div>

          {showForm && isCont && (
            <div style={{
              padding: "16px 20px", background: colors.bgSecondary,
              borderBottom: `1px solid ${colors.border}`,
              display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end",
            }}>
              <div style={{ flex: "2 1 180px" }}>
                <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Título</div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nombre..." style={{ ...inputStyle }} />
              </div>
              <div style={{ flex: "1 1 110px" }}>
                <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Frecuencia</div>
                <select value={form.freq} onChange={e => setForm(f => ({ ...f, freq: e.target.value }))} style={{ ...inputStyle }}>
                  {Object.entries(FREQ_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ flex: "1 1 110px" }}>
                <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Tipo</div>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle }}>
                  {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ flex: "0 1 90px" }}>
                <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Horas est.</div>
                <input type="number" min="0.5" step="0.5" value={form.hoursEstimated}
                  onChange={e => setForm(f => ({ ...f, hoursEstimated: Number(e.target.value) }))}
                  style={{ ...inputStyle }} />
              </div>
              <button
                type="button"
                onClick={addTask}
                style={{
                  padding: "10px 20px", borderRadius: radius.md,
                  border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700,
                  background: colors.brandPine, color: "#fff",
                }}
              >
                Guardar
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ padding: "8px 0" }}>
              <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: colors.textLabel, fontSize: 14 }}>
              Sin tareas registradas
            </div>
          ) : (
            tasks.map((t, idx) => {
              const mult = FREQ_MULT[t.freq] ?? 1
              const estH = (t.hoursEstimated ?? 0) * mult
              const status = t.completionStatus ?? "PENDING"
              const delivered = estH * (STATUS_VALUE[status] ?? 0)
              const pct = estH > 0 ? (delivered / estH) * 100 : 0
              const TypeIcon = TYPE_ICONS[t.type] || Hash
              return (
                <div key={t.id} style={{
                  padding: "14px 20px",
                  borderBottom: idx < tasks.length - 1 ? `1px solid ${colors.borderLight}` : "none",
                  display: "flex", alignItems: "center", gap: 14,
                  transition: "background 0.15s",
                }}>
                  {/* Type icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: radius.sm,
                    background: `${colors.brandPine}10`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <TypeIcon size={16} color={colors.brandPine} />
                  </div>

                  {/* Task info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: colors.textTitle,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {t.title || t.type}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textLabel, marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <CalendarClock size={11} />
                      <span>{FREQ_LABELS[t.freq] ?? t.freq}</span>
                      <span style={{ color: colors.border }}>|</span>
                      <span>{TYPE_LABELS[t.type] ?? t.type}</span>
                      <span style={{ color: colors.border }}>|</span>
                      <span>{estH.toFixed(1)} h/mes peso</span>
                      <span style={{ color: colors.border }}>|</span>
                      <span style={{ fontWeight: 600, color: cumplColor(pct) }}>
                        {STATUS_LABELS[status]} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <ThickBar value={Math.min(pct, 100)} color={cumplColor(pct)} height={5} showLabel={false} />
                    </div>
                  </div>

                  {/* Status pill selector + (optional) estimated hours editor */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                    {isCont && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ ...typography.labelStyle, marginBottom: 3, fontSize: 10 }}>Est</div>
                        <input type="number" min="0" step="0.5" value={t.hoursEstimated ?? 0}
                          onChange={e => updateHours(t.id, "hoursEstimated", e.target.value)}
                          style={{ ...inputStyle, width: 58, textAlign: "center", padding: "6px 4px", fontSize: 13 }} />
                      </div>
                    )}
                    <div
                      role="group"
                      aria-label="Estado de cumplimiento"
                      style={{
                        display: "inline-flex",
                        background: colors.bgSecondary,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 999,
                        padding: 3,
                        gap: 2,
                      }}
                    >
                      {STATUS_ORDER.map(s => {
                        const Icon = STATUS_ICONS[s]
                        const active = status === s
                        const accent = statusColor(s)
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateStatus(t.id, s)}
                            title={STATUS_LABELS[s]}
                            className={`status-pill${active ? " active" : ""}`}
                            // Remount the element when active flips so the CSS
                            // keyframe re-fires (otherwise it runs only once).
                            data-pop-key={`${t.id}-${status}`}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "6px 12px", borderRadius: 999,
                              border: "none", cursor: "pointer",
                              fontSize: 12, fontWeight: 700,
                              background: active ? accent : "transparent",
                              color: active ? "#fff" : colors.textLabel,
                            }}
                          >
                            <Icon size={13} strokeWidth={2.5} />
                            <span>{STATUS_LABELS[s]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {isCont && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteTask(t.id)}
                      title="Eliminar"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: colors.textLabel, padding: 4, borderRadius: radius.sm,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = colors.danger}
                      onMouseLeave={e => e.currentTarget.style.color = colors.textLabel}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </SectionCard>

        {/* Team compliance (contadora view) */}
        {isCont && Object.keys(teamTasks).length > 0 && (
          <SectionCard icon={Users} title="Cumplimiento del Equipo">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {teamUsers.map(u => {
                const uTasks = teamTasks[u.id] ?? []
                const est    = uTasks.reduce((s, t) => s + taskHours(t), 0)
                const deliv  = uTasks.reduce((s, t) => s + taskCompletion(t), 0)
                const pct    = est > 0 ? (deliv / est) * 100 : 0
                const isSelected = u.id === selectedId
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "10px 14px", borderRadius: radius.md,
                      border: `2px solid ${isSelected ? colors.brandPine : "transparent"}`,
                      background: isSelected ? colors.brandPineLt : "transparent",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: colors.bgPrimary, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <User size={16} color={colors.brandPine} />
                    </div>
                    <div style={{
                      width: 80, fontSize: 13,
                      // Force dark text on light pastel selected bg for contrast in any theme.
                      color: isSelected ? "#111827" : colors.textTitle,
                      fontWeight: 600, textAlign: "left",
                    }}>
                      {u.nick}
                    </div>
                    <div style={{ flex: 1 }}>
                      <ThickBar value={Math.min(pct, 100)} color={cumplColor(pct)} height={8} showLabel={false} />
                    </div>
                    <div style={{
                      width: 50, textAlign: "right", fontSize: 13,
                      fontWeight: 700, color: cumplColor(pct),
                    }}>
                      {pct.toFixed(0)}%
                    </div>
                    <div style={{
                      width: 80, textAlign: "right", fontSize: 11, color: colors.textLabel,
                    }}>
                      {deliv.toFixed(0)}/{est.toFixed(0)} h
                    </div>
                  </button>
                )
              })}
            </div>
          </SectionCard>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDeleteTask}
        title="Eliminar tarea"
        message="¿Eliminar esta tarea permanentemente? No se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => deleteTask(confirmDeleteTask)}
        onCancel={() => setConfirmDeleteTask(null)}
      />
    </Layout>
  )
}
