import { useEffect, useState, useMemo } from "react"
import api from "../services/api"
import Layout from "../components/Layout"
import SectionCard from "../components/ui/SectionCard"
import Avatar from "../components/ui/Avatar"
import { SkeletonRow } from "../components/ui/Skeleton"
import { colors, radius, shadows } from "../constants/tokens"
import { computeMonthScore } from "../utils/evalScores"
import { LayoutDashboard, Star, AlertTriangle, Flame, AlertOctagon } from "lucide-react"

const YEAR  = new Date().getFullYear()
const MONTH = new Date().getMonth() + 1  // 1-indexed for API

// Compliance model — must stay in sync with ProdPage.
const FREQ_MULT = { diaria: 22, semanal: 4.33, mensual: 1 }
const STATUS_VALUE = { ON_TIME: 1.0, LATE: 0.5, PENDING: 0.0 }
const taskHours     = t => (t.hoursEstimated ?? 0) * (FREQ_MULT[t.freq] ?? 1)
const taskDelivered = t => taskHours(t) * (STATUS_VALUE[t.completionStatus ?? "PENDING"] ?? 0)

// Axis midpoint for quadrant split.
const CUT = 80

// Quadrant metadata — keyed by "<evalHigh>_<cumplHigh>" booleans.
const QUADRANTS = {
  "true_true":   { label: "Estrellas",              icon: Star,         color: "#16a34a", desc: "Alto desempeño · Alto cumplimiento" },
  "true_false":  { label: "Sobrecargados",          icon: Flame,        color: "#f59e0b", desc: "Alto desempeño · Bajo cumplimiento" },
  "false_true":  { label: "Subutilizados / Riesgo", icon: AlertTriangle,color: "#3498db", desc: "Bajo desempeño · Alto cumplimiento" },
  "false_false": { label: "Riesgo Crítico",         icon: AlertOctagon, color: "#dc2626", desc: "Bajo desempeño · Bajo cumplimiento" },
}

function quadrantOf(evalScore, cumplScore) {
  return `${evalScore >= CUT}_${cumplScore >= CUT}`
}

export default function ExecutiveDashboard() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const usersRes = await api.get("/api/users")
        const team = usersRes.data.filter(u => !u.isCont)
        // Fetch in parallel: evaluation for current month + all tasks for each user.
        const results = await Promise.all(team.map(async u => {
          const [evalR, tasksR] = await Promise.all([
            api.get(`/api/evaluations/${u.id}/${YEAR}/${MONTH}`).catch(() => ({ data: { self_eval:{}, cont_eval:{}, metrics:{}, okrs:[] } })),
            api.get(`/api/tasks/${u.id}`).catch(() => ({ data: [] })),
          ])
          const evalScore = computeMonthScore(evalR.data)
          const tasks     = tasksR.data
          const totalEst  = tasks.reduce((s, t) => s + taskHours(t), 0)
          const totalDel  = tasks.reduce((s, t) => s + taskDelivered(t), 0)
          const cumplScore = totalEst > 0 ? (totalDel / totalEst) * 100 : 0
          return { ...u, evalScore, cumplScore, taskCount: tasks.length }
        }))
        if (!cancelled) {
          setRows(results)
          setLoading(false)
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const buckets = useMemo(() => {
    const b = { "true_true":[], "true_false":[], "false_true":[], "false_false":[] }
    rows.forEach(r => { b[quadrantOf(r.evalScore, r.cumplScore)].push(r) })
    return b
  }, [rows])

  return (
    <Layout>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        <SectionCard icon={LayoutDashboard} title="Matriz de Talento — Vista Ejecutiva"
          style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 13, color: colors.textLabel, marginTop: 2 }}>
            Cruce de <strong style={{ color: colors.textBody }}>Evaluación de Desempeño</strong> (eje Y) vs{" "}
            <strong style={{ color: colors.textBody }}>Índice de Cumplimiento</strong> (eje X).
            Punto de corte: {CUT} puntos en ambos ejes. Periodo: {YEAR}-{String(MONTH).padStart(2, "0")}.
          </div>
        </SectionCard>

        {loading ? (
          <SectionCard>
            <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
          </SectionCard>
        ) : (
          <>
            {/* ── 2×2 Matrix — scatter plot with axes ──────────────────── */}
            <SectionCard style={{ padding: 0, overflow: "hidden" }}>
              <TalentMatrix rows={rows} />
            </SectionCard>

            {/* ── Quadrant summary cards ─────────────────────────────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}>
              {Object.entries(QUADRANTS).map(([key, q]) => {
                const Icon = q.icon
                const members = buckets[key] ?? []
                return (
                  <div key={key} style={{
                    background: colors.bgCard,
                    borderRadius: radius.xl,
                    padding: "16px 18px",
                    boxShadow: shadows.sm,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `4px solid ${q.color}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <Icon size={18} color={q.color} strokeWidth={2.5} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: colors.textTitle }}>{q.label}</span>
                      <span style={{
                        marginLeft: "auto",
                        fontSize: 12, fontWeight: 800,
                        padding: "2px 8px", borderRadius: 999,
                        background: `${q.color}18`, color: q.color,
                      }}>
                        {members.length}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: colors.textLabel, marginBottom: 10 }}>
                      {q.desc}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {members.length === 0 ? (
                        <div style={{ fontSize: 12, color: colors.textLabel, fontStyle: "italic" }}>
                          — sin miembros —
                        </div>
                      ) : members.map(m => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar emoji={m.emoji} size={22} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 700, color: colors.textTitle,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{m.name}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: colors.textLabel }}>
                            D {Math.round(m.evalScore)} · C {Math.round(m.cumplScore)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// TalentMatrix — 2×2 scatter plot. Each employee is placed at their exact
// (cumpl, eval) coordinates so the Gerente General sees real positioning,
// not just a bucket assignment.
// ─────────────────────────────────────────────────────────────────────────
function TalentMatrix({ rows }) {
  const PLOT_H = 460
  // Map a 0-100 score onto the plot area, clamped to 2-98 to keep avatars inside.
  const pct = v => Math.max(2, Math.min(98, v))
  // Keyed by quadrant — background tint + label.
  const Q_TINT = {
    "true_true":   { bg: "#16a34a10", label: "Estrellas",           labelColor: "#16a34a" },
    "true_false":  { bg: "#f59e0b10", label: "Sobrecargados",       labelColor: "#f59e0b" },
    "false_true":  { bg: "#3498db10", label: "Subutilizados",       labelColor: "#3498db" },
    "false_false": { bg: "#dc262610", label: "Riesgo Crítico",      labelColor: "#dc2626" },
  }

  // Collision-avoidance: bucket by rounded (x%, y%) to prevent exact overlaps.
  // When >1 avatar lands on the same bucket, we lay them out in an expanding
  // spiral so each stays individually clickable. Hover then lifts + z-indexes
  // the target via CSS (`.matrix-dot:hover`) to reveal its label cleanly.
  const slots = {}
  const placements = rows.map(r => {
    const x = pct(r.cumplScore)
    const y = pct(r.evalScore)
    const bucket = `${Math.round(x / 4)}_${Math.round(y / 4)}`
    slots[bucket] = (slots[bucket] ?? 0)
    const idx = slots[bucket]++
    // Sunflower / golden-angle spiral — avoids linear stacking and spreads
    // collisions evenly even when many members share the same bucket.
    const GOLDEN = 137.508 * (Math.PI / 180)
    const angle  = idx * GOLDEN
    const radius = idx === 0 ? 0 : 16 + Math.sqrt(idx) * 12
    const dx = Math.cos(angle) * radius
    const dy = Math.sin(angle) * radius
    return { ...r, x, y, dx, dy }
  })

  return (
    <div style={{ padding: "20px 22px 16px" }}>
      {/* Plot area */}
      <div style={{
        position: "relative",
        height: PLOT_H,
        marginLeft: 48,  // room for Y-axis label
        marginRight: 8,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        overflow: "hidden",
        background: colors.bgSecondary,
      }}>
        {/* Quadrant tint backgrounds (split at 50% of plot because CUT=80 → 80% maps to 80%).
            Use real CUT position so the split line matches the logic. */}
        <div style={{
          position: "absolute", left: 0, bottom: 0,
          width: `${CUT}%`, height: `${CUT}%`,
          background: Q_TINT["false_false"].bg,
        }} />
        <div style={{
          position: "absolute", right: 0, bottom: 0,
          width: `${100 - CUT}%`, height: `${CUT}%`,
          background: Q_TINT["false_true"].bg,
        }} />
        <div style={{
          position: "absolute", left: 0, top: 0,
          width: `${CUT}%`, height: `${100 - CUT}%`,
          background: Q_TINT["true_false"].bg,
        }} />
        <div style={{
          position: "absolute", right: 0, top: 0,
          width: `${100 - CUT}%`, height: `${100 - CUT}%`,
          background: Q_TINT["true_true"].bg,
        }} />

        {/* Quadrant labels in corners */}
        <QuadLabel style={{ top: 8,  left: 10 }} tint={Q_TINT["true_false"]}  />
        <QuadLabel style={{ top: 8,  right: 10 }} tint={Q_TINT["true_true"]}  />
        <QuadLabel style={{ bottom: 8, left: 10 }} tint={Q_TINT["false_false"]} />
        <QuadLabel style={{ bottom: 8, right: 10 }} tint={Q_TINT["false_true"]} />

        {/* Cross-hairs (midpoint guides) */}
        <div style={{
          position: "absolute", left: `${CUT}%`, top: 0, bottom: 0,
          width: 1, background: colors.border,
        }} />
        <div style={{
          position: "absolute", top: `${100 - CUT}%`, left: 0, right: 0,
          height: 1, background: colors.border,
        }} />

        {/* Employee dots */}
        {placements.map(p => {
          const q = QUADRANTS[quadrantOf(p.evalScore, p.cumplScore)]
          return (
            <div
              key={p.id}
              title={`${p.name} — Desempeño ${Math.round(p.evalScore)} · Cumplimiento ${Math.round(p.cumplScore)}`}
              className="matrix-dot"
              style={{
                position: "absolute",
                left:   `calc(${p.x}% + ${p.dx}px - 20px)`,
                bottom: `calc(${p.y}% + ${p.dy}px - 20px)`,
                display: "flex", flexDirection: "column", alignItems: "center",
                color: q.color,  // used by the chip's hover border via currentColor
              }}
            >
              <div style={{
                borderRadius: "50%",
                border: `2px solid ${q.color}`,
                boxShadow: `0 0 0 3px ${q.color}22`,
                background: colors.bgCard,
                padding: 2,
              }}>
                <Avatar emoji={p.emoji} size={34} />
              </div>
              <div
                className="matrix-dot-chip"
                style={{
                  marginTop: 3,
                  fontSize: 10, fontWeight: 700,
                  color: colors.textTitle,
                  background: colors.bgCard,
                  padding: "1px 6px", borderRadius: 999,
                  border: `1px solid ${colors.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {p.nick || p.name?.split(" ")[0]}
              </div>
            </div>
          )
        })}

        {/* Axis tick labels */}
        <AxisTick orientation="x" at={0}    label="0"   />
        <AxisTick orientation="x" at={CUT}  label={String(CUT)} emphasized />
        <AxisTick orientation="x" at={100}  label="100" />
        <AxisTick orientation="y" at={0}    label="0"   />
        <AxisTick orientation="y" at={CUT}  label={String(CUT)} emphasized />
        <AxisTick orientation="y" at={100}  label="100" />
      </div>

      {/* Axis titles */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 10, marginLeft: 48, marginRight: 8,
      }}>
        <div style={{ fontSize: 12, color: colors.textLabel, fontWeight: 700 }}>
          Eje X · Índice de Cumplimiento (0 → 100) →
        </div>
        <div style={{ fontSize: 11, color: colors.textLabel }}>
          {rows.length} empleado{rows.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div style={{
        marginTop: 4, marginLeft: 0,
        fontSize: 12, color: colors.textLabel, fontWeight: 700,
        textAlign: "left",
      }}>
        ↑ Eje Y · Evaluación de Desempeño (0 → 100)
      </div>
    </div>
  )
}

function QuadLabel({ style, tint }) {
  return (
    <div style={{
      position: "absolute",
      fontSize: 10, fontWeight: 800,
      letterSpacing: 0.6, textTransform: "uppercase",
      color: tint.labelColor,
      background: colors.bgCard,
      padding: "3px 8px", borderRadius: 999,
      border: `1px solid ${tint.labelColor}33`,
      ...style,
    }}>
      {tint.label}
    </div>
  )
}

function AxisTick({ orientation, at, label, emphasized }) {
  const base = {
    position: "absolute",
    fontSize: 10,
    color: emphasized ? colors.textBody : colors.textLabel,
    fontWeight: emphasized ? 700 : 500,
    pointerEvents: "none",
  }
  if (orientation === "x") {
    return (
      <div style={{ ...base, left: `${at}%`, bottom: 2, transform: "translateX(-50%)" }}>
        {label}
      </div>
    )
  }
  return (
    <div style={{ ...base, bottom: `${at}%`, left: 4, transform: "translateY(50%)" }}>
      {label}
    </div>
  )
}
