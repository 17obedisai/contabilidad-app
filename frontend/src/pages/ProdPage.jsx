import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import Layout from "../components/Layout"
import ProgressBar from "../components/ui/ProgressBar"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import { G, DG, LG, BD, GO, scoreColor, inputStyle } from "../constants/theme"
import { TEAM } from "../constants/team"

const HM = 190
const FREQ_MULT = { diaria: 22, semanal: 4.33, mensual: 1 }

function taskHours(t) {
  return (t.hoursEstimated ?? 0) * (FREQ_MULT[t.freq] ?? 1)
}
function taskActual(t) {
  return (t.hoursActual ?? t.hoursEstimated ?? 0) * (FREQ_MULT[t.freq] ?? 1)
}
function utilColor(pct) {
  if (pct >= 90) return "#27ae60"
  if (pct >= 70) return GO
  return "#e74c3c"
}

const FREQ_LABELS = { diaria: "Diaria", semanal: "Semanal", mensual: "Mensual" }
const TYPE_LABELS  = { contable: "Contable", administrativa: "Administrativa", operativa: "Operativa", otra: "Otra" }

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
    if (!window.confirm("¿Eliminar esta tarea?")) return
    try {
      await api.delete(`/api/tasks/${taskId}`)
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch { /* ignore */ }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {isCont && (
          <Card style={{ marginBottom: 16, padding: "12px 16px" }}>
            <div style={{ fontSize: 12, color:"#888", marginBottom: 8 }}>Empleado</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap: 8 }}>
              {teamUsers.map(u => {
                const p = TEAM.find(t => t.nick === u.nick)
                return (
                  <button key={u.id} onClick={() => setSelectedId(u.id)} style={{
                    display:"flex", alignItems:"center", gap: 6, padding:"6px 14px",
                    borderRadius: 20, border:`2px solid ${selectedId===u.id ? G : BD}`,
                    background: selectedId===u.id ? LG : "#fff", cursor:"pointer",
                    fontSize: 13, color: selectedId===u.id ? DG : "#555",
                  }}>
                    <span>{p?.emoji}</span><span>{u.nick}</span>
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label:"Horas Estimadas", value:`${totalEst.toFixed(1)} h`, sub:`${estPct.toFixed(0)}% de ${HM}h`, color: scoreColor(estPct > 110 ? 60 : estPct > 90 ? 90 : 70) },
            { label:"Horas Reales",    value:`${totalActual.toFixed(1)} h`, sub:`${utilPct.toFixed(0)}% utilización`, color: utilColor(utilPct) },
            { label:"Tareas Activas",  value: tasks.length, sub:"registradas", color: DG },
          ].map(({ label, value, sub, color }) => (
            <Card key={label} style={{ textAlign:"center", padding:"16px 12px" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: DG, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 11, color:"#888" }}>{sub}</div>
            </Card>
          ))}
        </div>

        <Card style={{ marginBottom: 16, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: DG }}>Utilización del mes</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: utilColor(utilPct) }}>{utilPct.toFixed(1)}%</span>
          </div>
          <ProgressBar value={Math.min(utilPct, 100)} color={utilColor(utilPct)} />
          <div style={{ fontSize: 11, color:"#888", marginTop: 4 }}>
            Base {HM} h/mes · Real {totalActual.toFixed(1)} h · Estimado {totalEst.toFixed(1)} h
          </div>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderBottom:`1px solid ${BD}` }}>
            <span style={{ fontWeight: 700, color: DG }}>Tareas</span>
            {isCont && (
              <Button onClick={() => setShowForm(v => !v)} style={{ padding:"8px 14px", fontSize:12, minHeight:32 }}>
                {showForm ? "Cancelar" : "+ Agregar"}
              </Button>
            )}
          </div>

          {showForm && isCont && (
            <div style={{ padding:"12px 16px", background: LG, borderBottom:`1px solid ${BD}`, display:"flex", flexWrap:"wrap", gap: 8, alignItems:"flex-end" }}>
              <div style={{ flex:"2 1 180px" }}>
                <div style={{ fontSize: 11, color:"#888", marginBottom: 3 }}>Título</div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nombre..." style={{ ...inputStyle, width:"100%" }} />
              </div>
              <div style={{ flex:"1 1 110px" }}>
                <div style={{ fontSize: 11, color:"#888", marginBottom: 3 }}>Frecuencia</div>
                <select value={form.freq} onChange={e => setForm(f => ({ ...f, freq: e.target.value }))} style={{ ...inputStyle, width:"100%" }}>
                  {Object.entries(FREQ_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ flex:"1 1 110px" }}>
                <div style={{ fontSize: 11, color:"#888", marginBottom: 3 }}>Tipo</div>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, width:"100%" }}>
                  {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ flex:"0 1 90px" }}>
                <div style={{ fontSize: 11, color:"#888", marginBottom: 3 }}>Horas est.</div>
                <input type="number" min="0.5" step="0.5" value={form.hoursEstimated}
                  onChange={e => setForm(f => ({ ...f, hoursEstimated: Number(e.target.value) }))}
                  style={{ ...inputStyle, width:"100%" }} />
              </div>
              <Button onClick={addTask}>Guardar</Button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:"center", padding: 32, color:"#888" }}>Cargando...</div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign:"center", padding: 32, color:"#aaa", fontSize: 14 }}>Sin tareas registradas</div>
          ) : (
            tasks.map(t => {
              const mult = FREQ_MULT[t.freq] ?? 1
              const estH = (t.hoursEstimated ?? 0) * mult
              const actH = (t.hoursActual ?? t.hoursEstimated ?? 0) * mult
              const pct  = estH > 0 ? Math.min((actH / estH) * 100, 150) : 100
              return (
                <div key={t.id} style={{ padding:"10px 16px", borderBottom:`1px solid ${BD}`, display:"flex", alignItems:"center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: DG }}>{t.title}</div>
                    <div style={{ fontSize: 11, color:"#888", marginTop: 2 }}>
                      {FREQ_LABELS[t.freq] ?? t.freq} · {TYPE_LABELS[t.type] ?? t.type} ·{" "}
                      {estH.toFixed(1)} h/mes est · {actH.toFixed(1)} h/mes real
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <ProgressBar value={Math.min(pct, 100)} color={utilColor(pct)} height={4} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap: 6, alignItems:"center" }}>
                    {isCont && (
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize: 10, color:"#aaa", marginBottom: 2 }}>Est</div>
                        <input type="number" min="0" step="0.5" value={t.hoursEstimated ?? 0}
                          onChange={e => updateHours(t.id, "hoursEstimated", e.target.value)}
                          style={{ ...inputStyle, width: 60, textAlign:"center" }} />
                      </div>
                    )}
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize: 10, color:"#aaa", marginBottom: 2 }}>Real</div>
                      <input type="number" min="0" step="0.5" value={t.hoursActual ?? 0}
                        onChange={e => updateHours(t.id, "hoursActual", e.target.value)}
                        style={{ ...inputStyle, width: 60, textAlign:"center" }} />
                    </div>
                  </div>
                  {isCont && (
                    <button onClick={() => deleteTask(t.id)} style={{
                      background:"none", border:"none", cursor:"pointer", color:"#ccc", fontSize: 16, padding:"4px 6px"
                    }} title="Eliminar">✕</button>
                  )}
                </div>
              )
            })
          )}
        </Card>

        {isCont && Object.keys(teamTasks).length > 0 && (
          <Card>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${BD}`, fontWeight: 700, color: DG }}>
              Utilización del Equipo
            </div>
            <div style={{ padding: 16, display:"flex", flexDirection:"column", gap: 10 }}>
              {teamUsers.map(u => {
                const uTasks = teamTasks[u.id] ?? []
                const act    = uTasks.reduce((s, t) => s + taskActual(t), 0)
                const pct    = Math.min((act / HM) * 100, 150)
                const p      = TEAM.find(t => t.nick === u.nick)
                return (
                  <div key={u.id} style={{ display:"flex", alignItems:"center", gap: 12 }}>
                    <div style={{ width: 28, textAlign:"center", fontSize: 20 }}>{p?.emoji}</div>
                    <div style={{ width: 80, fontSize: 13, color: DG, fontWeight: 600 }}>{u.nick}</div>
                    <div style={{ flex: 1 }}>
                      <ProgressBar value={Math.min(pct, 100)} color={utilColor(pct)} height={8} />
                    </div>
                    <div style={{ width: 50, textAlign:"right", fontSize: 13, fontWeight: 700, color: utilColor(pct) }}>
                      {pct.toFixed(0)}%
                    </div>
                    <div style={{ width: 70, textAlign:"right", fontSize: 11, color:"#888" }}>
                      {act.toFixed(0)}/{HM} h
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

      </div>
    </Layout>
  )
}
