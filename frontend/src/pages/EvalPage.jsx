import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import Layout from "../components/Layout"
import Avatar from "../components/ui/Avatar"
import RadialScore from "../components/ui/RadialScore"
import ProgressBar from "../components/ui/ProgressBar"
import RatingButtons from "../components/ui/RatingButtons"
import Counter from "../components/ui/Counter"
import Card from "../components/ui/Card"
import SectionCard from "../components/ui/SectionCard"
import Button from "../components/ui/Button"
import { SkeletonRow } from "../components/ui/Skeleton"
import Skeleton from "../components/ui/Skeleton"
import { G, DG, LG, scoreColor, scoreLabel, inputStyle } from "../constants/theme"
import { colors } from "../constants/tokens"
import { EVAL_CATS, EV_ITEMS, calcMetric, catScore, computeMonthScore, computeYearScore } from "../utils/evalScores"
import { Users, User, Target, Plus, Trash2 } from "lucide-react"

// ── constants ─────────────────────────────────────────────────────────────────
const YEAR = new Date().getFullYear()
const MS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const MF = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto",
            "Septiembre","Octubre","Noviembre","Diciembre"]

const emptyEval = () => ({ self_eval: {}, cont_eval: {}, metrics: {}, okrs: [] })
const MAX_OKRS = 3

// ── component ─────────────────────────────────────────────────────────────────
export default function EvalPage() {
  const { user } = useAuth()
  const isCont = user?.isCont

  const [month, setMonth]               = useState(new Date().getMonth()) // 0-indexed
  const [teamUsers, setTeamUsers]       = useState([])
  const [selectedId, setSelectedId]     = useState(!isCont ? user?.userId : null)
  const [allMonthsData, setAllMonthsData] = useState({})
  const [loading, setLoading]           = useState(false)
  const [saving, setSaving]             = useState(false)

  const saveTimers = useRef({ self: null, cont: null, metrics: null, okrs: null })

  // load team (contadora only)
  useEffect(() => {
    if (!isCont) return
    api.get("/api/users")
      .then(res => {
        const nonCont = res.data.filter(u => !u.isCont)
        setTeamUsers(nonCont)
        if (nonCont.length > 0) setSelectedId(nonCont[0].id)
      })
      .catch(console.error)
  }, [isCont])

  // fetch all 12 months when selected user changes
  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    Promise.all(
      Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
        api.get(`/api/evaluations/${selectedId}/${YEAR}/${m}`)
          .then(r => [String(m), r.data])
          .catch(() => [String(m), emptyEval()])
      )
    )
      .then(entries => setAllMonthsData(Object.fromEntries(entries)))
      .finally(() => setLoading(false))
  }, [selectedId])

  // derived values
  const currentEval   = allMonthsData[String(month + 1)] || emptyEval()
  const selectedUser  = teamUsers.find(u => u.id === selectedId) ?? user
  const isOwnProfile  = selectedId === user?.userId
  const showEditSelf  = isOwnProfile || !isCont
  const showReadSelf  = isCont && !isOwnProfile

  const moScore      = computeMonthScore(currentEval)
  const yrScore      = computeYearScore(allMonthsData)
  const monthScores  = Array.from({ length: 12 }, (_, i) =>
    computeMonthScore(allMonthsData[String(i + 1)])
  )

  // optimistic patch
  function patchMonth(patch) {
    setAllMonthsData(prev => ({
      ...prev,
      [String(month + 1)]: {
        ...emptyEval(),
        ...(prev[String(month + 1)] || {}),
        ...patch,
      },
    }))
  }

  // debounced API save
  function scheduleSave(part, body) {
    if (saveTimers.current[part]) clearTimeout(saveTimers.current[part])
    saveTimers.current[part] = setTimeout(async () => {
      setSaving(true)
      try {
        await api.put(`/api/evaluations/${selectedId}/${YEAR}/${month + 1}`, body)
      } catch (e) {
        console.error("Save failed:", e)
      } finally {
        setSaving(false)
      }
    }, 800)
  }

  function handleSelfChange(itemId, value) {
    const updated = { ...currentEval.self_eval, [itemId]: value }
    patchMonth({ self_eval: updated })
    scheduleSave("self", { self_eval: updated })
  }

  function handleContChange(itemId, value) {
    const updated = { ...currentEval.cont_eval, [itemId]: value }
    patchMonth({ cont_eval: updated })
    scheduleSave("cont", { cont_eval: updated })
  }

  function handleMetricChange(catId, value) {
    const updated = { ...currentEval.metrics, [catId]: value }
    patchMonth({ metrics: updated })
    scheduleSave("metrics", { metrics: updated })
  }

  // ── OKRs ──────────────────────────────────────────────────────────────
  // We keep OKRs as a simple array so it matches the Mongo document exactly.
  // patchMonth + scheduleSave drive the optimistic update + debounced PUT.
  function handleOkrsChange(nextOkrs) {
    const clamped = nextOkrs.slice(0, MAX_OKRS)
    patchMonth({ okrs: clamped })
    scheduleSave("okrs", { okrs: clamped })
  }
  function addOkr() {
    const okrs = Array.isArray(currentEval.okrs) ? currentEval.okrs : []
    if (okrs.length >= MAX_OKRS) return
    handleOkrsChange([...okrs, { objective: "", achievement: 0 }])
  }
  function updateOkr(idx, patch) {
    const okrs = Array.isArray(currentEval.okrs) ? currentEval.okrs : []
    const next = okrs.map((o, i) => i === idx ? { ...o, ...patch } : o)
    handleOkrsChange(next)
  }
  function removeOkr(idx) {
    const okrs = Array.isArray(currentEval.okrs) ? currentEval.okrs : []
    handleOkrsChange(okrs.filter((_, i) => i !== idx))
  }

  // ── section header helper ─────────────────────────────────────────────────
  const SectionHeader = ({ icon, text }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: DG }}>{icon} {text}</div>
      {saving && <span style={{ fontSize: 10, color: "#aaa" }}>● guardando…</span>}
    </div>
  )

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Employee selector — contadora only (matches ProdPage style) */}
      {isCont && teamUsers.length > 0 && (
        <SectionCard icon={Users} title="Empleado" style={{ padding: "16px 20px", marginBottom: 14 }}>
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
                  // Force dark text on light pastel active bg.
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

      {/* Month selector */}
      <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {MS.map((label, i) => (
          <Button key={i} active={month === i} onClick={() => setMonth(i)}
            style={{ padding: "10px 14px", minWidth: 44, fontSize: 14 }}>
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <Card style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
            <div style={{ borderRadius: 16, overflow: "hidden", height: 100 }}><Skeleton height={100} /></div>
            <div style={{ borderRadius: 16, overflow: "hidden", height: 100 }}><Skeleton height={100} /></div>
          </div>
          <SkeletonRow withAvatar={false} />
          <SkeletonRow withAvatar={false} />
          <SkeletonRow withAvatar={false} />
          <SkeletonRow withAvatar={false} />
        </Card>
      ) : !selectedId ? (
        <Card style={{ textAlign: "center", padding: 40, color: "var(--text-label)" }}>
          Selecciona un empleado
        </Card>
      ) : (
        <>
          {/* ── Score cards (Bento) ─────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <SectionCard style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 12, color: "var(--text-label)", fontWeight: 600, marginBottom: 6 }}>{MS[month]}</div>
              <RadialScore score={moScore} size={110} />
              <div style={{ fontSize: 13, color: scoreColor(moScore), fontWeight: 700, marginTop: 6 }}>
                {scoreLabel(moScore)}
              </div>
            </SectionCard>
            <SectionCard style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 12, color: "var(--text-label)", fontWeight: 600, marginBottom: 6 }}>AÑO {YEAR}</div>
              <RadialScore score={yrScore} size={110} />
              <div style={{ fontSize: 13, color: scoreColor(yrScore), fontWeight: 700, marginTop: 6 }}>
                {scoreLabel(yrScore)}
              </div>
            </SectionCard>
          </div>

          {/* ── Trend chart ─────────────────────────────────────── */}
          <SectionCard style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-body)", marginBottom: 10 }}>
              📈 Tendencia {selectedUser?.name || ""}
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 70 }}>
              {MS.map((label, i) => {
                const v = monthScores[i]
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    {v > 0 && <span style={{ fontSize: 10, color: "var(--text-label)" }}>{Math.round(v)}</span>}
                    <div style={{
                      width: "100%", maxWidth: 34, borderRadius: 5,
                      height: Math.max(5, (v / 100) * 55),
                      background: i === month ? G : "var(--border-green)",
                      transition: "height 0.4s",
                    }} />
                    <span style={{ fontSize: 10, color: "var(--text-label)" }}>{label}</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* ── Self-eval: editable (own profile or regular user) ── */}
          {showEditSelf && (
            <Card>
              <SectionHeader icon="🪞" text={`Mi Autoevaluación — ${MF[month]}`} />
              {EV_ITEMS.map(item => {
                const val = currentEval.self_eval?.[item.id]
                return (
                  <div key={item.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>{item.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                      {val && (
                        <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: scoreColor(Number(val) * 10) }}>
                          {val}/10
                        </span>
                      )}
                    </div>
                    <RatingButtons
                      value={val ? Number(val) : 0}
                      onChange={v => handleSelfChange(item.id, v)}
                    />
                  </div>
                )
              })}
            </Card>
          )}

          {/* ── Self-eval: read-only (contadora viewing others) ─── */}
          {showReadSelf && (
            <Card>
              <SectionHeader icon="🪞" text={`Autoevaluación de ${selectedUser?.name || ""}`} />
              {EV_ITEMS.map(item => {
                const val = currentEval.self_eval?.[item.id]
                const n = val ? Number(val) : 0
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, flex: 1, color: "var(--text-body)" }}>{item.label}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} style={{
                          width: 24, height: 8, borderRadius: 4,
                          background: n > i ? scoreColor(n * 10) : "var(--border)",
                        }} />
                      ))}
                    </div>
                    <span style={{
                      fontSize: 15, fontWeight: 800, minWidth: 36, textAlign: "right",
                      color: val ? scoreColor(n * 10) : "var(--text-label)",
                    }}>
                      {val ? `${val}/10` : "—"}
                    </span>
                  </div>
                )
              })}
            </Card>
          )}

          {/* ── OKRs: Objetivos del Mes ──────────────────────────── */}
          {(() => {
            const okrs = Array.isArray(currentEval.okrs) ? currentEval.okrs : []
            const avg  = okrs.length > 0
              ? okrs.reduce((a, o) => a + Math.min(100, Math.max(0, Number(o.achievement) || 0)), 0) / okrs.length
              : 0
            return (
              <SectionCard icon={Target} title={`Objetivos del Mes (OKRs) — ${MF[month]}`} style={{ marginBottom: 14 }}>
                {okrs.length === 0 && !isCont && (
                  <div style={{ padding: "18px 4px", color: "var(--text-label)", fontSize: 13, textAlign: "center" }}>
                    Aún no se han definido objetivos para este mes.
                  </div>
                )}

                {okrs.map((o, idx) => {
                  const ach = Math.min(100, Math.max(0, Number(o.achievement) || 0))
                  return (
                    <div key={idx} style={{
                      padding: "12px 0",
                      borderBottom: idx < okrs.length - 1 ? "1px solid var(--border-light)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: `${scoreColor(ach)}18`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 800, color: scoreColor(ach), flexShrink: 0,
                        }}>
                          {idx + 1}
                        </div>
                        <input
                          type="text"
                          value={o.objective ?? ""}
                          readOnly={!isCont}
                          placeholder={isCont ? "Describe el objetivo…" : "(sin objetivo)"}
                          onChange={e => updateOkr(idx, { objective: e.target.value })}
                          style={{
                            ...inputStyle, flex: 1, fontSize: 13, fontWeight: 600,
                            border: isCont ? inputStyle.border : "1px solid transparent",
                            background: isCont ? inputStyle.background : "transparent",
                            cursor: isCont ? "text" : "default",
                          }}
                        />
                        <span style={{
                          fontSize: 16, fontWeight: 800, minWidth: 52, textAlign: "right",
                          color: scoreColor(ach),
                        }}>
                          {Math.round(ach)}%
                        </span>
                        {isCont && (
                          <button
                            type="button"
                            onClick={() => removeOkr(idx)}
                            title="Eliminar objetivo"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "var(--text-label)", padding: 4, borderRadius: 6,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      <input
                        type="range" min="0" max="100" step="5"
                        value={ach}
                        disabled={!isCont}
                        onChange={e => updateOkr(idx, { achievement: Number(e.target.value) })}
                        className="okr-slider"
                        // CSS vars drive thumb color + gradient fill so the
                        // track tint reflects the current achievement.
                        style={{
                          "--okr-accent": scoreColor(ach),
                          "--okr-pct": `${ach}%`,
                        }}
                      />
                    </div>
                  )
                })}

                {isCont && okrs.length < MAX_OKRS && (
                  <button
                    type="button"
                    onClick={addOkr}
                    style={{
                      marginTop: 12,
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 16px", borderRadius: 10,
                      border: `1px dashed ${colors.brandPine}`,
                      background: `${colors.brandPine}10`, color: colors.brandPine,
                      cursor: "pointer", fontSize: 13, fontWeight: 700,
                    }}
                  >
                    <Plus size={14} />
                    Agregar objetivo ({okrs.length}/{MAX_OKRS})
                  </button>
                )}

                {okrs.length > 0 && (
                  <div style={{
                    marginTop: 14, padding: "10px 14px", borderRadius: 10,
                    background: LG,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      Logro promedio · {okrs.length} objetivo{okrs.length !== 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(avg) }}>
                      {Math.round(avg)}%
                    </span>
                  </div>
                )}
              </SectionCard>
            )
          })()}

          {/* ── Contadora eval: editable (isCont only) ───────────── */}
          {isCont && (
            <Card>
              <SectionHeader icon="👩‍💼" text={`Evaluación Contadora — ${selectedUser?.name || ""}`} />
              {EV_ITEMS.map(item => {
                const val = currentEval.cont_eval?.[item.id]
                return (
                  <div key={item.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                      {val && (
                        <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: scoreColor(Number(val) * 10) }}>
                          {val}/10
                        </span>
                      )}
                    </div>
                    <RatingButtons
                      value={val ? Number(val) : 0}
                      onChange={v => handleContChange(item.id, v)}
                    />
                  </div>
                )
              })}
            </Card>
          )}

          {/* ── Metrics: editable (isCont only) ──────────────────── */}
          {isCont && (
            <Card>
              <SectionHeader icon="📊" text={`Métricas — ${selectedUser?.name || ""}`} />
              {EVAL_CATS.filter(c => ["count","ct","part","quiz"].includes(c.type)).map(cat => {
                const raw  = currentEval.metrics?.[cat.id]
                const comp = calcMetric(cat, raw)
                return (
                  <div key={cat.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--border-light)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>{cat.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-title)" }}>{cat.label}</div>
                        {cat.unit && (
                          <div style={{ fontSize: 11, color: "var(--text-label)" }}>
                            {cat.type === "ct"
                              ? `${cat.free} gratuitos, luego −${cat.pen}pts c/u`
                              : cat.type === "count"
                              ? `−${cat.pen}pts por ${cat.unit.slice(0,-1) || cat.unit}`
                              : cat.unit}
                          </div>
                        )}
                      </div>
                      {comp != null && (
                        <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor(comp) }}>
                          {Math.round(comp)}
                        </div>
                      )}
                    </div>
                    {cat.type === "part" || cat.type === "quiz" ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="number" min="0" max="100"
                          value={raw ?? ""}
                          onChange={e => handleMetricChange(
                            cat.id,
                            e.target.value === "" ? "" : Math.min(100, Math.max(0, Number(e.target.value)))
                          )}
                          style={{ ...inputStyle, width: 80, textAlign: "center", fontSize: 18, fontWeight: 700 }}
                          placeholder="0-100"
                        />
                        <span style={{ fontSize: 12, color: "var(--text-label)" }}>/ 100</span>
                      </div>
                    ) : (
                      <Counter
                        value={raw}
                        onChange={v => handleMetricChange(cat.id, v)}
                        unit={cat.unit}
                      />
                    )}
                  </div>
                )
              })}
            </Card>
          )}

          {/* ── Summary — visible to everyone ────────────────────── */}
          <Card>
            <SectionHeader icon="⚖️" text={`Resumen — ${MF[month]}`} />
            {EVAL_CATS.map(cat => {
              const s = catScore(currentEval, cat.id)
              return (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span style={{ fontSize: 12, width: 130, color: "var(--text-body)", flexShrink: 0 }}>{cat.label}</span>
                  <ProgressBar value={s ?? 0} />
                  <span style={{
                    fontSize: 13, fontWeight: 700, width: 34, textAlign: "right",
                    color: s != null ? scoreColor(s) : "var(--text-label)",
                  }}>
                    {s != null ? Math.round(s) : "—"}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-label)", width: 28 }}>{cat.weight}%</span>
                </div>
              )
            })}
            <div style={{
              padding: 16, background: LG, borderRadius: 14,
              display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10,
            }}>
              {/* Light pastel "Total" pill: force dark text for AA contrast in any theme. */}
              <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Total</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: scoreColor(moScore) }}>
                {Math.round(moScore)}
                <span style={{ fontSize: 13, color: "#6b7280" }}>/100</span>
              </span>
            </div>
          </Card>
        </>
      )}
    </Layout>
  )
}
