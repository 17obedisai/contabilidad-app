import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import Layout from "../components/Layout"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import { G, DG, LG, BD, inputStyle } from "../constants/theme"
import { TEAM } from "../constants/team"

const STATUSES = [
  { key:"pendiente",    label:"Pendiente",    color:"#95a5a6" },
  { key:"en_progreso",  label:"En progreso",  color:"#3498db" },
  { key:"completada",   label:"Completada",   color:"#27ae60" },
]

const PRIORITIES = {
  alta:  { label:"Alta",  color:"#e74c3c" },
  media: { label:"Media", color:"#e67e22" },
  baja:  { label:"Baja",  color:"#27ae60" },
}

// Status → auto-progress rules
function autoProgress(status) {
  if (status === "pendiente")   return 0
  if (status === "completada")  return 100
  return null  // en_progreso: keep current
}

export default function BoardPage() {
  const { user } = useAuth()
  const isCont = user?.isCont

  const [items, setItems]         = useState([])
  const [teamUsers, setTeamUsers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [expandedHistory, setExpandedHistory] = useState({})
  const [form, setForm] = useState({ title:"", desc:"", priority:"media", assignedTo:"" })
  const [editObs, setEditObs]     = useState({})  // itemId → obs string

  useEffect(() => {
    api.get("/api/board").then(res => { setItems(res.data); setLoading(false) })
    if (isCont) {
      api.get("/api/users").then(res => {
        const sorted = res.data.sort((a, b) => {
          const ai = TEAM.findIndex(t => t.nick === a.nick)
          const bi = TEAM.findIndex(t => t.nick === b.nick)
          return ai - bi
        })
        setTeamUsers(sorted)
      })
    }
  }, [isCont])

  async function updateItem(itemId, patch) {
    try {
      const res = await api.put(`/api/board/${itemId}`, patch)
      setItems(prev => prev.map(it => it.id === itemId ? res.data : it))
    } catch { /* ignore */ }
  }

  async function changeStatus(item, newStatus) {
    const patch = { status: newStatus }
    const auto  = autoProgress(newStatus)
    if (auto !== null) patch.progress = auto
    await updateItem(item.id, patch)
  }

  async function saveObservation(item) {
    const obs = editObs[item.id]
    if (obs == null) return
    await updateItem(item.id, { observations: obs })
    setEditObs(prev => { const n = { ...prev }; delete n[item.id]; return n })
  }

  async function addItem() {
    if (!form.title.trim()) return
    try {
      const today = new Date().toISOString().slice(0, 10)
      const userId = form.assignedTo || user?.userId
      const res = await api.post("/api/board", {
        ...form, userId, status:"pendiente", progress:0,
        observations:"", date: today,
      })
      setItems(prev => [...prev, res.data])
      setForm({ title:"", desc:"", priority:"media", assignedTo:"" })
      setShowForm(false)
    } catch { /* ignore */ }
  }

  async function deleteItem(itemId) {
    if (!window.confirm("¿Eliminar este ítem?")) return
    try {
      await api.delete(`/api/board/${itemId}`)
      setItems(prev => prev.filter(it => it.id !== itemId))
    } catch { /* ignore */ }
  }

  const columns = STATUSES.map(s => ({
    ...s,
    items: items.filter(it => it.status === s.key),
  }))

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

        {/* Add form */}
        <div style={{ marginBottom: 16, display:"flex", justifyContent:"flex-end" }}>
          {isCont && (
            <Button onClick={() => setShowForm(v => !v)} style={{ padding:"8px 14px", fontSize:12, minHeight:32 }}>
              {showForm ? "Cancelar" : "+ Agregar ítem"}
            </Button>
          )}
        </div>

        {showForm && isCont && (
          <Card style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap: 10 }}>
              <div style={{ flex:"2 1 200px" }}>
                <div style={{ fontSize: 11, color:"#888", marginBottom: 3 }}>Título *</div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nombre del ítem..." style={{ ...inputStyle, width:"100%" }} />
              </div>
              <div style={{ flex:"3 1 250px" }}>
                <div style={{ fontSize: 11, color:"#888", marginBottom: 3 }}>Descripción</div>
                <input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                  placeholder="Descripción opcional..." style={{ ...inputStyle, width:"100%" }} />
              </div>
              <div style={{ flex:"1 1 100px" }}>
                <div style={{ fontSize: 11, color:"#888", marginBottom: 3 }}>Prioridad</div>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  style={{ ...inputStyle, width:"100%" }}>
                  {Object.entries(PRIORITIES).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
              <div style={{ flex:"1 1 130px" }}>
                <div style={{ fontSize: 11, color:"#888", marginBottom: 3 }}>Asignado a</div>
                <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                  style={{ ...inputStyle, width:"100%" }}>
                  <option value="">Sin asignar</option>
                  {teamUsers.map(u => <option key={u.id} value={u.id}>{u.nick}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"flex-end" }}>
                <Button onClick={addItem}>Guardar</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Kanban board */}
        {loading ? (
          <div style={{ textAlign:"center", padding: 60, color:"#888" }}>Cargando...</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 16 }}>
            {columns.map(col => (
              <div key={col.key}>
                {/* Column header */}
                <div style={{
                  display:"flex", alignItems:"center", gap: 8,
                  padding:"10px 14px", borderRadius:"10px 10px 0 0",
                  background: col.color, color:"#fff", fontWeight: 700, fontSize: 14,
                }}>
                  <span>{col.label}</span>
                  <span style={{ marginLeft:"auto", background:"rgba(255,255,255,0.3)", borderRadius:10, padding:"2px 8px", fontSize:12 }}>
                    {col.items.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display:"flex", flexDirection:"column", gap: 10, padding:"10px 0" }}>
                  {col.items.length === 0 && (
                    <div style={{ textAlign:"center", padding:"20px 0", color:"#ccc", fontSize: 13 }}>
                      Sin ítems
                    </div>
                  )}
                  {col.items.map(item => {
                    const assignedUser = teamUsers.find(u => u.id === item.assignedTo)
                    const assignedProfile = assignedUser ? TEAM.find(t => t.nick === assignedUser.nick) : null
                    const prio = PRIORITIES[item.priority] ?? PRIORITIES.media
                    const editable = canEdit(item)
                    const hasHistory = item.changes?.length > 0
                    const histExpanded = expandedHistory[item.id]
                    const obsValue = editObs[item.id] ?? item.observations ?? ""

                    return (
                      <div key={item.id} style={{
                        background:"#fff", borderRadius: 8,
                        boxShadow:"0 1px 4px rgba(0,0,0,0.08)",
                        border:`1px solid ${BD}`,
                        borderLeft:`4px solid ${prio.color}`,
                        padding: 12,
                      }}>
                        {/* Title row */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: DG, flex: 1 }}>{item.title}</div>
                          {isCont && (
                            <button onClick={() => deleteItem(item.id)} style={{
                              background:"none", border:"none", cursor:"pointer", color:"#ddd", fontSize: 14,
                            }}>✕</button>
                          )}
                        </div>

                        {item.desc && (
                          <div style={{ fontSize: 12, color:"#777", marginTop: 4 }}>{item.desc}</div>
                        )}

                        {/* Priority + assignee */}
                        <div style={{ display:"flex", gap: 6, marginTop: 8, flexWrap:"wrap", alignItems:"center" }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, color:"#fff", background: prio.color,
                            padding:"2px 8px", borderRadius: 10,
                          }}>{prio.label}</span>
                          {assignedProfile && (
                            <span style={{ fontSize: 12, color:"#666" }}>
                              {assignedProfile.emoji} {assignedUser.nick}
                            </span>
                          )}
                        </div>

                        {/* Status selector */}
                        {editable && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 11, color:"#aaa", marginBottom: 4 }}>Estado</div>
                            <div style={{ display:"flex", gap: 4 }}>
                              {STATUSES.map(s => (
                                <button key={s.key} onClick={() => changeStatus(item, s.key)} style={{
                                  flex: 1, padding:"4px 0", fontSize: 11, borderRadius: 6,
                                  border:`1px solid ${item.status===s.key ? s.color : BD}`,
                                  background: item.status===s.key ? s.color : "#fff",
                                  color: item.status===s.key ? "#fff" : "#888",
                                  cursor:"pointer", fontWeight: item.status===s.key ? 700 : 400,
                                }}>{s.label.split(" ")[0]}</button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Progress bar */}
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color:"#aaa" }}>Progreso</span>
                            <span style={{ fontSize: 11, color: DG, fontWeight: 600 }}>{item.progress ?? 0}%</span>
                          </div>
                          {editable ? (
                            <input type="range" min="0" max="100" step="5"
                              value={item.progress ?? 0}
                              onChange={e => updateItem(item.id, { progress: Number(e.target.value) })}
                              style={{ width:"100%", accentColor: G }} />
                          ) : (
                            <div style={{ height: 6, background:"#eee", borderRadius: 3 }}>
                              <div style={{
                                height: 6, borderRadius: 3,
                                width:`${item.progress ?? 0}%`,
                                background: G,
                              }} />
                            </div>
                          )}
                        </div>

                        {/* Observations */}
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color:"#aaa", marginBottom: 4 }}>Observaciones</div>
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
                            <div style={{ fontSize: 12, color:"#666", whiteSpace:"pre-wrap" }}>
                              {item.observations || <span style={{ color:"#ccc" }}>Sin observaciones</span>}
                            </div>
                          )}
                        </div>

                        {/* Change history */}
                        {hasHistory && (
                          <div style={{ marginTop: 10 }}>
                            <button onClick={() => toggleHistory(item.id)} style={{
                              background:"none", border:"none", cursor:"pointer",
                              fontSize: 11, color:"#aaa", padding: 0,
                            }}>
                              {histExpanded ? "▲" : "▼"} Historial ({item.changes.length})
                            </button>
                            {histExpanded && (
                              <div style={{ marginTop: 6, fontSize: 11, color:"#888", maxHeight: 120, overflowY:"auto" }}>
                                {[...item.changes].reverse().map((h, i) => (
                                  <div key={i} style={{ padding:"3px 0", borderBottom:`1px solid ${BD}` }}>
                                    <span style={{ color:"#aaa" }}>{new Date(h.date).toLocaleDateString("es-CO")}</span>
                                    {" · "}<strong>{h.field}</strong>:{" "}
                                    <span style={{ color:"#555" }}>{h.old_value}</span>
                                    {" → "}<span style={{ color: DG }}>{h.new_value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
