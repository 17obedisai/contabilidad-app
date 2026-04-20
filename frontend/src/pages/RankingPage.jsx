import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import Layout from "../components/Layout"
import Card from "../components/ui/Card"
import RadialScore from "../components/ui/RadialScore"
import ProgressBar from "../components/ui/ProgressBar"
import { SkeletonRow } from "../components/ui/Skeleton"
import Skeleton from "../components/ui/Skeleton"
import { G, DG, LG, BD, GO, scoreColor } from "../constants/theme"

const YEAR  = new Date().getFullYear()
const MONTH = new Date().getMonth() + 1
const MS    = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const MF    = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto",
               "Septiembre","Octubre","Noviembre","Diciembre"]

const MEDALS = ["🥇","🥈","🥉"]
const WEIGHT_LABELS = {
  quiz:      "Quiz",
  self_eval: "Autoevalución",
  cont_eval: "Eval. Contadora",
  tasks:     "Productividad",
}

export default function RankingPage() {
  const { user } = useAuth()

  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [month, setMonth]         = useState(MONTH)
  const [monthResults, setMonthResults] = useState([])
  const [monthLoading, setMonthLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/api/ranking/${YEAR}`)
      .then(res => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setMonthLoading(true)
    api.get(`/api/quiz/results/${YEAR}/${month}`)
      .then(res => setMonthResults(res.data))
      .finally(() => setMonthLoading(false))
  }, [month])

  const ranking = data?.ranking ?? []
  const weights = data?.weights ?? {}

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Annual ranking */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${BD}` }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: DG }}>Ranking Anual {YEAR}</div>
            <div style={{ fontSize: 12, color: "var(--text-label)", marginTop: 2 }}>
              {Object.entries(weights).map(([k, w]) =>
                `${WEIGHT_LABELS[k] ?? k} ${(w * 100).toFixed(0)}%`
              ).join(" · ")}
            </div>
          </div>

          {loading ? (
            <div>
              <div style={{ display:"flex", justifyContent:"center", gap: 20, padding: 24, alignItems:"flex-end" }}>
                <Skeleton shape="rect" width={80} height={90} />
                <Skeleton shape="rect" width={80} height={120} />
                <Skeleton shape="rect" width={80} height={70} />
              </div>
              <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          ) : ranking.length === 0 ? (
            <div style={{ textAlign:"center", padding: 48, color: "var(--text-label)", fontSize: 14 }}>
              Sin datos disponibles
            </div>
          ) : (
            <div>
              {/* Podium (top 3) — premium Bento */}
              {ranking.length >= 3 && (
                <div style={{
                  display:"flex", justifyContent:"center", alignItems:"flex-end",
                  gap: 20, padding:"36px 20px 28px",
                  borderBottom:`1px solid ${BD}`,
                  background: "linear-gradient(180deg, var(--bg-highlight) 0%, transparent 100%)",
                }}>
                  {[ranking[1], ranking[0], ranking[2]].filter(Boolean).map((entry, podiumIdx) => {
                    // podiumIdx: 0 = 2nd place (left), 1 = 1st place (center), 2 = 3rd place (right)
                    const heights = [150, 200, 120]
                    const widths  = [150, 180, 140]
                    const emojiSizes = [44, 58, 40]
                    const medalSizes = [30, 40, 26]
                    const gradients = {
                      1: "linear-gradient(180deg, #FFE97A 0%, #F5B400 60%, #B8841E 100%)",
                      2: "linear-gradient(180deg, #F0F4F8 0%, #C0C8D4 60%, #7B8794 100%)",
                      3: "linear-gradient(180deg, #E5AF7D 0%, #CD7F32 60%, #7D4A1A 100%)",
                    }
                    const glow = {
                      1: "0 20px 50px -10px rgba(245, 180, 0, 0.55), 0 0 0 1px rgba(245, 180, 0, 0.25)",
                      2: "0 16px 40px -10px rgba(123, 135, 148, 0.45), 0 0 0 1px rgba(123, 135, 148, 0.2)",
                      3: "0 14px 36px -10px rgba(205, 127, 50, 0.5), 0 0 0 1px rgba(205, 127, 50, 0.2)",
                    }
                    const pos = entry.position
                    return (
                      <div key={entry.userId} style={{
                        display:"flex", flexDirection:"column", alignItems:"center",
                        width: widths[podiumIdx],
                      }}>
                        {/* Avatar card */}
                        <div style={{
                          background: "var(--bg-card)",
                          border: `2px solid ${pos === 1 ? "#F5B400" : pos === 2 ? "#94A3B8" : "#CD7F32"}`,
                          borderRadius: 20,
                          padding: "14px 12px 10px",
                          width: "100%",
                          textAlign: "center",
                          boxShadow: "var(--shadow-md)",
                          marginBottom: 10,
                        }}>
                          <div style={{ fontSize: emojiSizes[podiumIdx], lineHeight: 1, marginBottom: 6 }}>{entry.emoji}</div>
                          <div style={{
                            fontSize: podiumIdx === 1 ? 15 : 13,
                            fontWeight: 800, color: "var(--text-title)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>{entry.nick}</div>
                          <div style={{
                            fontSize: podiumIdx === 1 ? 26 : 20, fontWeight: 800,
                            color: scoreColor(entry.final), margin:"4px 0 2px",
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {entry.final.toFixed(1)}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-label)", textTransform:"uppercase", letterSpacing: 0.5 }}>
                            puntos
                          </div>
                        </div>

                        {/* Medal */}
                        <div style={{ fontSize: medalSizes[podiumIdx], marginBottom: 6, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" }}>
                          {MEDALS[pos - 1] ?? `#${pos}`}
                        </div>

                        {/* Pedestal */}
                        <div style={{
                          height: heights[podiumIdx], width: "100%",
                          background: gradients[pos] ?? gradients[3],
                          borderRadius: "14px 14px 4px 4px",
                          boxShadow: glow[pos] ?? glow[3],
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontSize: podiumIdx === 1 ? 38 : 28,
                          fontWeight: 900,
                          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                          position: "relative",
                        }}>
                          {pos}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Full list */}
              {ranking.map((entry, i) => {
                const isMe = entry.userId === user?.userId
                return (
                  <div key={entry.userId} style={{
                    display:"flex", alignItems:"center", gap: 12,
                    padding:"12px 16px",
                    borderBottom: i < ranking.length-1 ? `1px solid ${BD}` : "none",
                    background: isMe ? LG : "var(--bg-card)",
                  }}>
                    <div style={{ width: 28, fontSize: 18, textAlign:"center" }}>
                      {MEDALS[i] ?? <span style={{ fontSize: 13, color: "var(--text-label)" }}>{i+1}</span>}
                    </div>
                    <div style={{ fontSize: 24 }}>{entry.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        // Force dark text when row is the highlighted "me" pill (light pastel bg).
                        color: isMe ? "#111827" : DG,
                      }}>
                        {entry.nick}
                        {isMe && <span style={{ fontSize: 11, color: G, marginLeft: 6 }}>tú</span>}
                      </div>
                      <div style={{ fontSize: 11, color: isMe ? "#374151" : "var(--text-label)" }}>{entry.name}</div>
                      {/* Score breakdown */}
                      <div style={{ display:"flex", gap: 12, marginTop: 4, flexWrap:"wrap" }}>
                        {Object.entries(entry.scores).map(([k, v]) => (
                          <div key={k} style={{ display:"flex", gap: 3, alignItems:"center" }}>
                            <span style={{ fontSize: 10, color: isMe ? "#4b5563" : "var(--text-label)" }}>{WEIGHT_LABELS[k]?.split(" ")[0] ?? k}:</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor(v) }}>{v.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                      <RadialScore score={entry.final} size={56} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Monthly quiz ranking */}
        <Card>
          <div style={{ padding:"18px 20px", borderBottom:`1px solid ${BD}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: DG }}>Quiz Mensual</span>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{
              fontSize: 15, fontWeight: 600,
              padding: "10px 16px", borderRadius: 10,
              border: `2px solid ${BD}`,
              background: "var(--bg-card)",
              color: "var(--text-title)",
              cursor: "pointer",
              minWidth: 160,
              transition: "border-color 0.2s, background 0.2s",
            }}>
              {MS.map((m, i) => (
                <option key={i+1} value={i+1}>{MF[i]}</option>
              ))}
            </select>
          </div>

          {monthLoading ? (
            <div>
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </div>
          ) : monthResults.length === 0 ? (
            <div style={{ textAlign:"center", padding: 32, color: "var(--text-label)", fontSize: 14 }}>
              Sin resultados para {MF[month-1]}
            </div>
          ) : (
            monthResults.map((r, i) => {
              const isMe = r.userId === user?.userId
              return (
                <div key={r.userId} style={{
                  display:"flex", alignItems:"center", gap: 12,
                  padding:"10px 16px", borderBottom: i < monthResults.length-1 ? `1px solid ${BD}` : "none",
                  background: isMe ? LG : "var(--bg-card)",
                }}>
                  <div style={{ width: 28, fontSize: 18, textAlign:"center" }}>
                    {MEDALS[i] ?? <span style={{ fontSize: 13, color: "var(--text-label)" }}>{i+1}</span>}
                  </div>
                  <div style={{ fontSize: 20 }}>{r.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: isMe ? "#111827" : DG,
                    }}>
                      {r.nick}
                      {isMe && <span style={{ fontSize: 11, color: G, marginLeft: 6 }}>tú</span>}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <ProgressBar value={r.score} color={scoreColor(r.score)} height={5} />
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(r.score) }}>
                      {r.score.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: isMe ? "#4b5563" : "var(--text-label)" }}>{r.correct}/{r.total}</div>
                  </div>
                </div>
              )
            })
          )}
        </Card>

      </div>
    </Layout>
  )
}
