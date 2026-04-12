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
import Button from "../components/ui/Button"
import { G, DG, LG, scoreColor, scoreLabel, inputStyle } from "../constants/theme"
import { EVAL_CATS, EV_ITEMS, calcMetric, catScore, computeMonthScore, computeYearScore } from "../utils/evalScores"

// ── constants ─────────────────────────────────────────────────────────────────
const YEAR = new Date().getFullYear()
const MS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const MF = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto",
            "Septiembre","Octubre","Noviembre","Diciembre"]

const emptyEval = () => ({ self_eval: {}, cont_eval: {}, metrics: {} })

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

  const saveTimers = useRef({ self: null, cont: null, metrics: null })

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
      {/* Employee selector — contadora only */}
      {isCont && teamUsers.length > 0 && (
        <Card style={{ padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {teamUsers.map(u => (
              <Button
                key={u.id}
                active={selectedId === u.id}
                onClick={() => setSelectedId(u.id)}
                style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Avatar emoji={u.emoji} size={28} />
                <span style={{ fontSize: 13 }}>{u.name}</span>
              </Button>
            ))}
          </div>
        </Card>
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
        <Card style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
          Cargando evaluaciones…
        </Card>
      ) : !selectedId ? (
        <Card style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
          Selecciona un empleado
        </Card>
      ) : (
        <>
          {/* ── Score cards ─────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <Card style={{ textAlign: "center", padding: 24, marginBottom: 0 }}>
              <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 6 }}>{MS[month]}</div>
              <RadialScore score={moScore} size={110} />
              <div style={{ fontSize: 13, color: scoreColor(moScore), fontWeight: 700, marginTop: 6 }}>
                {scoreLabel(moScore)}
              </div>
            </Card>
            <Card style={{ textAlign: "center", padding: 24, marginBottom: 0 }}>
              <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 6 }}>AÑO {YEAR}</div>
              <RadialScore score={yrScore} size={110} />
              <div style={{ fontSize: 13, color: scoreColor(yrScore), fontWeight: 700, marginTop: 6 }}>
                {scoreLabel(yrScore)}
              </div>
            </Card>
          </div>

          {/* ── Trend chart ─────────────────────────────────────── */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 10 }}>
              📈 Tendencia {selectedUser?.name || ""}
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 70 }}>
              {MS.map((label, i) => {
                const v = monthScores[i]
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    {v > 0 && <span style={{ fontSize: 10, color: "#999" }}>{Math.round(v)}</span>}
                    <div style={{
                      width: "100%", maxWidth: 34, borderRadius: 5,
                      height: Math.max(5, (v / 100) * 55),
                      background: i === month ? G : "#c8e6c9",
                      transition: "height 0.4s",
                    }} />
                    <span style={{ fontSize: 10, color: "#999" }}>{label}</span>
                  </div>
                )
              })}
            </div>
          </Card>

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
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, flex: 1, color: "#666" }}>{item.label}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} style={{
                          width: 24, height: 8, borderRadius: 4,
                          background: n > i ? scoreColor(n * 10) : "#e8e8e8",
                        }} />
                      ))}
                    </div>
                    <span style={{
                      fontSize: 15, fontWeight: 800, minWidth: 36, textAlign: "right",
                      color: val ? scoreColor(n * 10) : "#ddd",
                    }}>
                      {val ? `${val}/10` : "—"}
                    </span>
                  </div>
                )
              })}
            </Card>
          )}

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
                  <div key={cat.id} style={{ padding: "14px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>{cat.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{cat.label}</div>
                        {cat.unit && (
                          <div style={{ fontSize: 11, color: "#aaa" }}>
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
                        <span style={{ fontSize: 12, color: "#aaa" }}>/ 100</span>
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
                  <span style={{ fontSize: 12, width: 130, color: "#666", flexShrink: 0 }}>{cat.label}</span>
                  <ProgressBar value={s ?? 0} />
                  <span style={{
                    fontSize: 13, fontWeight: 700, width: 34, textAlign: "right",
                    color: s != null ? scoreColor(s) : "#ddd",
                  }}>
                    {s != null ? Math.round(s) : "—"}
                  </span>
                  <span style={{ fontSize: 10, color: "#bbb", width: 28 }}>{cat.weight}%</span>
                </div>
              )
            })}
            <div style={{
              padding: 16, background: LG, borderRadius: 14,
              display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: DG }}>Total</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: scoreColor(moScore) }}>
                {Math.round(moScore)}
                <span style={{ fontSize: 13, color: "#999" }}>/100</span>
              </span>
            </div>
          </Card>
        </>
      )}
    </Layout>
  )
}
