import { useState, useEffect } from "react"
import { Users, Plus, Pencil, Trash2, X, Check, UserPlus, Shield, User } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import Layout from "../components/Layout"
import SectionCard from "../components/ui/SectionCard"
import Modal from "../components/ui/Modal"
import { TEAM } from "../constants/team"
import { colors, radius, shadows, typography, inputStyle } from "../constants/tokens"

const ROLE_OPTIONS = [
  "Contadora",
  "Coord. Tributaria",
  "Asist. Puntos Compra",
  "Asist. CXP Generales",
  "Asist. Tributario",
  "Asist. Contable",
  "Aux. Legalizaciones",
  "Aux. Proveedores",
  "Aux. Puntos Venta",
  "Pasante SENA",
  "Otro",
]

const EMOJI_OPTIONS = ["👩‍💼","📊","☕","📑","🧾","📂","🏪","🛒","💻","📋","👤","👨‍💼","👩‍💻","👨‍💻","🗂️"]

const LEVEL_LABELS = { 1: "Nivel 1 · Dirección", 2: "Nivel 2 · Coordinación", 3: "Nivel 3 · Asistente", 4: "Nivel 4 · Auxiliar", 5: "Nivel 5 · Pasante" }

function levelColor(level) {
  const map = { 1: colors.brandPine, 2: "#7c4dff", 3: colors.warning, 4: colors.info, 5: colors.textLabel }
  return map[level] || colors.textLabel
}

const EMPTY_FORM = { nick: "", name: "", role: "", emoji: "👤", level: 3, password: "coocentral25", noQuiz: false }

export default function TeamPage() {
  const { user } = useAuth()

  const [members, setMembers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showNew, setShowNew]       = useState(false)
  const [editId, setEditId]         = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [newForm, setNewForm]       = useState(EMPTY_FORM)
  const [newError, setNewError]     = useState("")
  const [saving, setSaving]         = useState(false)

  // Guard: only contadora
  if (!user?.isCont) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: 60, color: colors.textLabel }}>
          <Shield size={48} color={colors.textLabel} />
          <div style={{ marginTop: 12 }}>Solo la contadora puede acceder a esta sección.</div>
        </div>
      </Layout>
    )
  }

  useEffect(() => {
    api.get("/api/users")
      .then(res => setMembers(res.data))
      .finally(() => setLoading(false))
  }, [])

  function getProfile(m) {
    return TEAM.find(t => t.nick === m.nick) ?? { emoji: m.emoji ?? "👤" }
  }

  // ── Create ──────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    setNewError("")
    if (!newForm.nick.trim() || !newForm.name.trim() || !newForm.role.trim()) {
      setNewError("Nick, nombre y rol son obligatorios."); return
    }
    setSaving(true)
    try {
      const res = await api.post("/api/users", newForm)
      setMembers(prev => [...prev, res.data])
      setShowNew(false)
      setNewForm(EMPTY_FORM)
    } catch (err) {
      setNewError(err?.response?.data?.detail || "Error al crear el usuario.")
    } finally {
      setSaving(false)
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────
  function startEdit(m) {
    setEditId(m.id)
    setEditForm({ name: m.name, role: m.role, emoji: m.emoji ?? "👤", level: m.level ?? 3, noQuiz: m.noQuiz ?? false })
  }

  async function saveEdit(id) {
    setSaving(true)
    try {
      const res = await api.put(`/api/users/${id}`, editForm)
      setMembers(prev => prev.map(m => m.id === id ? res.data : m))
      setEditId(null)
    } catch (err) {
      console.error(err?.response?.data || err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete(id, name) {
    if (!window.confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/api/users/${id}`)
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al eliminar.")
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header card */}
        <SectionCard style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: radius.md,
                background: `${colors.brandPine}12`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Users size={22} color={colors.brandPine} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.textTitle }}>Gestión del Equipo</div>
                <div style={{ fontSize: 13, color: colors.textLabel }}>{members.length} miembro{members.length !== 1 ? "s" : ""} registrados</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setShowNew(true); setNewError("") }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: radius.md,
                border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700,
                background: colors.brandPine, color: "#fff",
                boxShadow: shadows.sm,
                transition: "opacity 0.2s",
              }}
            >
              <UserPlus size={16} />
              Nuevo Miembro
            </button>
          </div>
        </SectionCard>

        {/* Member list */}
        <SectionCard style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: colors.textLabel }}>Cargando…</div>
          ) : (
            members.map((m, idx) => {
              const profile = getProfile(m)
              const isEditing = editId === m.id
              const isSelf = m.id === user?.userId
              const lc = levelColor(m.level)

              return (
                <div key={m.id} style={{
                  padding: "16px 20px",
                  borderBottom: idx < members.length - 1 ? `1px solid ${colors.border}` : "none",
                  display: "flex", alignItems: isEditing ? "flex-start" : "center",
                  gap: 16, flexWrap: "wrap",
                }}>
                  {/* Emoji avatar */}
                  {isEditing ? (
                    <select
                      value={editForm.emoji}
                      onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                      style={{ ...inputStyle, width: 70, textAlign: "center", fontSize: 22, padding: "6px 4px" }}
                    >
                      {EMOJI_OPTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: `${lc}15`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22,
                    }}>
                      {m.emoji || profile.emoji}
                    </div>
                  )}

                  {/* Info / edit form */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ flex: "1 1 160px" }}>
                          <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Nombre</div>
                          <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            style={{ ...inputStyle }} />
                        </div>
                        <div style={{ flex: "2 1 200px" }}>
                          <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Rol</div>
                          <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                            style={{ ...inputStyle }}>
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: "1 1 160px" }}>
                          <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Nivel jerárquico</div>
                          <select value={editForm.level} onChange={e => setEditForm(f => ({ ...f, level: Number(e.target.value) }))}
                            style={{ ...inputStyle }}>
                            {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                          <input type="checkbox" id={`nq-${m.id}`} checked={editForm.noQuiz}
                            onChange={e => setEditForm(f => ({ ...f, noQuiz: e.target.checked }))} />
                          <label htmlFor={`nq-${m.id}`} style={{ fontSize: 13, color: colors.textBody }}>
                            Excluir del quiz
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: colors.textTitle }}>{m.name}</span>
                          {isSelf && (
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                              background: `${colors.brandPine}12`, color: colors.brandPine,
                            }}>Tú</span>
                          )}
                          {m.noQuiz && (
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                              background: `${colors.warning}12`, color: colors.warning,
                            }}>Sin quiz</span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: colors.textLabel, marginTop: 2 }}>
                          @{m.nick} · {m.role}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
                            background: `${lc}10`, color: lc,
                          }}>
                            {LEVEL_LABELS[m.level] ?? `Nivel ${m.level}`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {isEditing ? (
                      <>
                        <button type="button" disabled={saving} onClick={() => saveEdit(m.id)} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 14px", borderRadius: radius.md, border: "none",
                          cursor: "pointer", fontSize: 13, fontWeight: 700,
                          background: colors.brandPine, color: "#fff", opacity: saving ? 0.6 : 1,
                        }}>
                          <Check size={14} /> Guardar
                        </button>
                        <button type="button" onClick={() => setEditId(null)} style={{
                          padding: "8px 14px", borderRadius: radius.md, border: "none",
                          cursor: "pointer", fontSize: 13,
                          background: colors.bgPrimary, color: colors.textBody,
                        }}>
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(m)} style={{
                          padding: "8px 10px", borderRadius: radius.md,
                          border: `1px solid ${colors.border}`, background: colors.bgCard,
                          cursor: "pointer", color: colors.textLabel,
                          display: "flex", alignItems: "center",
                          transition: "border-color 0.15s",
                        }}
                          title="Editar"
                          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.brandPine; e.currentTarget.style.color = colors.brandPine }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textLabel }}
                        >
                          <Pencil size={14} />
                        </button>
                        {!isSelf && (
                          <button type="button" onClick={() => handleDelete(m.id, m.name)} style={{
                            padding: "8px 10px", borderRadius: radius.md,
                            border: `1px solid ${colors.border}`, background: colors.bgCard,
                            cursor: "pointer", color: colors.textLabel,
                            display: "flex", alignItems: "center",
                            transition: "border-color 0.15s",
                          }}
                            title="Eliminar"
                            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.danger; e.currentTarget.style.color = colors.danger }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textLabel }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </SectionCard>
      </div>

      {/* New member modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nuevo Miembro" maxWidth={540}>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Nick (login) *</div>
              <input value={newForm.nick} onChange={e => setNewForm(f => ({ ...f, nick: e.target.value.toLowerCase() }))}
                placeholder="ej: pedro" style={{ ...inputStyle }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Nombre completo *</div>
              <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ej: Pedro Gómez" style={{ ...inputStyle }} />
            </div>
          </div>
          <div>
            <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Rol *</div>
            <select value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))} style={{ ...inputStyle }}>
              <option value="">Seleccionar rol…</option>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Nivel jerárquico</div>
              <select value={newForm.level} onChange={e => setNewForm(f => ({ ...f, level: Number(e.target.value) }))} style={{ ...inputStyle }}>
                {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={{ flex: 0.6 }}>
              <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Emoji</div>
              <select value={newForm.emoji} onChange={e => setNewForm(f => ({ ...f, emoji: e.target.value }))}
                style={{ ...inputStyle, fontSize: 20 }}>
                {EMOJI_OPTIONS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{ ...typography.labelStyle, marginBottom: 4 }}>Contraseña inicial</div>
            <input value={newForm.password} onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 6 caracteres" style={{ ...inputStyle }} />
            <div style={{ fontSize: 11, color: colors.textLabel, marginTop: 4 }}>
              El usuario puede cambiarla desde su perfil.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="noQuizNew" checked={newForm.noQuiz}
              onChange={e => setNewForm(f => ({ ...f, noQuiz: e.target.checked }))} />
            <label htmlFor="noQuizNew" style={{ fontSize: 13, color: colors.textBody }}>Excluir del quiz mensual</label>
          </div>

          {newError && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: `${colors.danger}10`, color: colors.danger, fontSize: 13,
            }}>
              {newError}
            </div>
          )}

          <button type="submit" disabled={saving} style={{
            padding: "12px 20px", borderRadius: 10, border: "none",
            cursor: saving ? "wait" : "pointer", fontSize: 14, fontWeight: 700,
            background: colors.brandPine, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: saving ? 0.7 : 1,
          }}>
            <Plus size={16} />
            {saving ? "Creando…" : "Crear miembro"}
          </button>
        </form>
      </Modal>
    </Layout>
  )
}
