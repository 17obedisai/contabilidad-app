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
  Users, ChevronDown, User, Briefcase, CalendarClock, Hash
} from "lucide-react"

const HM = 190
const FREQ_MULT = { diaria: 22, semanal: 4.33, mensual: 1 }

function taskHours(t) {
  return (t.hoursEstimated ?? 0) * (FREQ_MULT[t.freq] ?? 1)
}
function taskActual(t) {
  return (t.hoursActual ?? t.hoursEstimated ?? 0) * (FREQ_MULT[t.freq] ?? 1)
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
      const sorted = res.data.sort((a, b) => {
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

  const totalEst    = tasks.reduce((s, t) => s + taskHours(t), 0)
  const totalActual = tasks.reduce((s, t) => s + taskActual(t), 0)
  const utilPct     = Math.min((totalActual / HM) * 100, 150)
  const estPct      = Math.min((totalEst / HM) * 100, 150)

  async function updateHours(taskId, field, value) {
    const num = Math.max(0, Number(value) || 0)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: num } : t))
    try { await api.put(`/api/tasks/${taskId}`, { [field]: num }) } catch { /* ignore */ }
  }

  async function addTask() {
    if (!form.title.trim() || !selectedId) return
    try {
      const res = await api.post("/api/tasks", { ...form, userId: selectedId, hoursActual: 0 })
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

  const selectedProfile = teamUsers.length
    ? TEAM.find(t => t.nick === teamUsers.find(u => u.id === selectedId)?.nick)
    : TEAM.find(t => t.nick === user?.nick)

  return (
    <Layout>
      <div style={{
        maxWidth: 960, margin: "0 auto",
        display: "flex", flexDirection: "column", gap: 20,
      }}>

        {/* Employee selector (contadora only) */}
        {isCont && (
          <SectionCard icon={Users} title="Empleado" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {teamUsers.map(u => {
                const p = TEAM.find(t => t.nick === u.nick)
                const isActive = selectedId === u.id
                return (
                  <button key={u.id} onClick={() => setSelectedId(u.id)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                    borderRadius: 20, cursor: "pointer", fontSize: 13,
                    border: `2px solid ${isActive ? colors.brandPine : colors.border}`,
                    background: isActive ? colors.brandPineLt : colors.bgCard,
                    color: isActive ? colors.brandPine : colors.textBody,
                    fontWeight: isActive ? 700 : 500,
                    transition: "all 0.2s ease",
                  }}>
                    <User size={14} />
                    <span>{u.nick}</span>
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
              label: "Horas Reales",
              value: `${totalActual.toFixed(1)}h`,
              sub: `${utilPct.toFixed(0)}% utilización`,
              color: utilColor(utilPct),
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

        {/* Utilization gauge + bar */}
        <SectionCard icon={Target} title="Utilización del mes">
          <div style={{
            display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
          }}>
            <Gauge value={utilPct} size={110} label="Utilización" color={utilColor(utilPct)} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <ThickBar value={Math.min(utilPct, 100)} color={utilColor(utilPct)} height={14} />
              <div style={{
                display: "flex", justifyContent: "space-between", marginTop: 8,
                fontSize: 12, color: colors.textLabel,
              }}>
                <span>Base {HM} h/mes</span>
                <span>Real {totalActual.toFixed(1)} h</span>
                <span>Estimado {totalEst.toFixed(1)} h</span>
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
              const actH = (t.hoursActual ?? t.hoursEstimated ?? 0) * mult
              const pct  = estH > 0 ? Math.min((actH / estH) * 100, 150) : 100
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
                    <div style={{ fontSize: 12, color: colors.textLabel, marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                      <CalendarClock size={11} />
                      <span>{FREQ_LABELS[t.freq] ?? t.freq}</span>
                      <span style={{ color: colors.border }}>|</span>
                      <span>{TYPE_LABELS[t.type] ?? t.type}</span>
                      <span style={{ color: colors.border }}>|</span>
                      <span>{estH.toFixed(1)} h/mes est</span>
                      <span style={{ color: colors.border }}>|</span>
                      <span style={{ fontWeight: 600, color: utilColor(pct) }}>{actH.toFixed(1)} h/mes real</span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <ThickBar value={Math.min(pct, 100)} color={utilColor(pct)} height={5} showLabel={false} />
                    </div>
                  </div>

                  {/* Hour inputs */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {isCont && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ ...typography.labelStyle, marginBottom: 3, fontSize: 10 }}>Est</div>
                        <input type="number" min="0" step="0.5" value={t.hoursEstimated ?? 0}
                          onChange={e => updateHours(t.id, "hoursEstimated", e.target.value)}
                          style={{ ...inputStyle, width: 58, textAlign: "center", padding: "6px 4px", fontSize: 13 }} />
                      </div>
                    )}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ ...typography.labelStyle, marginBottom: 3, fontSize: 10 }}>Real</div>
                      <input type="number" min="0" step="0.5" value={t.hoursActual ?? 0}
                        onChange={e => updateHours(t.id, "hoursActual", e.target.value)}
                        style={{ ...inputStyle, width: 58, textAlign: "center", padding: "6px 4px", fontSize: 13 }} />
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

        {/* Team utilization (contadora view) */}
        {isCont && Object.keys(teamTasks).length > 0 && (
          <SectionCard icon={Users} title="Utilización del Equipo">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {teamUsers.map(u => {
                const uTasks = teamTasks[u.id] ?? []
                const act    = uTasks.reduce((s, t) => s + taskActual(t), 0)
                const pct    = Math.min((act / HM) * 100, 150)
                const p      = TEAM.find(t => t.nick === u.nick)
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
                      width: 80, fontSize: 13, color: colors.textTitle,
                      fontWeight: 600, textAlign: "left",
                    }}>
                      {u.nick}
                    </div>
                    <div style={{ flex: 1 }}>
                      <ThickBar value={Math.min(pct, 100)} color={utilColor(pct)} height={8} showLabel={false} />
                    </div>
                    <div style={{
                      width: 50, textAlign: "right", fontSize: 13,
                      fontWeight: 700, color: utilColor(pct),
                    }}>
                      {pct.toFixed(0)}%
                    </div>
                    <div style={{
                      width: 70, textAlign: "right", fontSize: 11, color: colors.textLabel,
                    }}>
                      {act.toFixed(0)}/{HM} h
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
