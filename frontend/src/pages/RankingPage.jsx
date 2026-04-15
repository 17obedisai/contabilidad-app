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
  const myEntry = ranking.find(e => e.userId === user?.userId)

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Annual ranking */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${BD}` }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: DG }}>Ranking Anual {YEAR}</div>
            <div style={{ fontSize: 12, color:"#888", marginTop: 2 }}>
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
            <div style={{ textAlign:"center", padding: 48, color:"#aaa", fontSize: 14 }}>
              Sin datos disponibles
            </div>
          ) : (
            <div>
              {/* Podium (top 3) */}
              {ranking.length >= 3 && (
                <div style={{ display:"flex", justifyContent:"center", gap: 12, padding:"24px 16px 16px", borderBottom:`1px solid ${BD}` }}>
                  {[ranking[1], ranking[0], ranking[2]].filter(Boolean).map((entry, podiumIdx) => {
                    const heights = [100, 130, 80]
                    const actualPos = podiumIdx === 1 ? 0 : podiumIdx === 0 ? 1 : 2
                    return (
                      <div key={entry.userId} style={{
                        display:"flex", flexDirection:"column", alignItems:"center",
                        width: 120,
                      }}>
                        <div style={{ fontSize: 32, marginBottom: 4 }}>{entry.emoji}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: DG }}>{entry.nick}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(entry.final), margin:"4px 0" }}>
                          {entry.final.toFixed(1)}
                        </div>
                        <div style={{ fontSize: 20 }}>{MEDALS[entry.position - 1] ?? `#${entry.position}`}</div>
                        <div style={{
                          height: heights[podiumIdx], width: 90,
                          background: entry.position===1 ? "#FFD700" : entry.position===2 ? "#C0C0C0" : "#CD7F32",
                          borderRadius:"6px 6px 0 0", marginTop: 8, opacity: 0.8,
                        }} />
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
                    background: isMe ? LG : "#fff",
                  }}>
                    <div style={{ width: 28, fontSize: 18, textAlign:"center" }}>
                      {MEDALS[i] ?? <span style={{ fontSize: 13, color:"#888" }}>{i+1}</span>}
                    </div>
                    <div style={{ fontSize: 24 }}>{entry.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: DG }}>
                        {entry.nick}
                        {isMe && <span style={{ fontSize: 11, color: G, marginLeft: 6 }}>tú</span>}
                      </div>
                      <div style={{ fontSize: 11, color:"#888" }}>{entry.name}</div>
                      {/* Score breakdown */}
                      <div style={{ display:"flex", gap: 12, marginTop: 4, flexWrap:"wrap" }}>
                        {Object.entries(entry.scores).map(([k, v]) => (
                          <div key={k} style={{ display:"flex", gap: 3, alignItems:"center" }}>
                            <span style={{ fontSize: 10, color:"#aaa" }}>{WEIGHT_LABELS[k]?.split(" ")[0] ?? k}:</span>
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
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${BD}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight: 700, color: DG }}>Quiz Mensual</span>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{
              fontSize: 13, padding:"4px 8px", borderRadius: 6, border:`1px solid ${BD}`, color: DG,
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
            <div style={{ textAlign:"center", padding: 32, color:"#aaa", fontSize: 14 }}>
              Sin resultados para {MF[month-1]}
            </div>
          ) : (
            monthResults.map((r, i) => (
              <div key={r.userId} style={{
                display:"flex", alignItems:"center", gap: 12,
                padding:"10px 16px", borderBottom: i < monthResults.length-1 ? `1px solid ${BD}` : "none",
                background: r.userId === user?.userId ? LG : "#fff",
              }}>
                <div style={{ width: 28, fontSize: 18, textAlign:"center" }}>
                  {MEDALS[i] ?? <span style={{ fontSize: 13, color:"#888" }}>{i+1}</span>}
                </div>
                <div style={{ fontSize: 20 }}>{r.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DG }}>
                    {r.nick}
                    {r.userId === user?.userId && <span style={{ fontSize: 11, color: G, marginLeft: 6 }}>tú</span>}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <ProgressBar value={r.score} color={scoreColor(r.score)} height={5} />
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(r.score) }}>
                    {r.score.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 11, color:"#aaa" }}>{r.correct}/{r.total}</div>
                </div>
              </div>
            ))
          )}
        </Card>

      </div>
    </Layout>
  )
}
