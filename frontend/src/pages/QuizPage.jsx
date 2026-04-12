import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"
import Layout from "../components/Layout"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import RadialScore from "../components/ui/RadialScore"
import { G, DG, LG, BD, scoreColor } from "../constants/theme"

const YEAR  = new Date().getFullYear()
const MONTH = new Date().getMonth() + 1  // 1-indexed
const MS    = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto",
               "Septiembre","Octubre","Noviembre","Diciembre"]

const OPTS = ["A","B","C","D"]

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2,"0")}`
}

export default function QuizPage() {
  const { user } = useAuth()
  const isNoQuiz = user?.noQuiz

  // screen: "start" | "quiz" | "result"
  const [screen, setScreen]         = useState("start")
  const [existing, setExisting]     = useState(null)   // prior result if any
  const [questions, setQuestions]   = useState([])     // shuffled display order
  const [answers, setAnswers]       = useState([])     // answer per display-index
  const [current, setCurrent]       = useState(0)
  const [elapsed, setElapsed]       = useState(0)
  const [result, setResult]         = useState(null)   // {correct, total, score, feedback}
  const [loading, setLoading]       = useState(false)
  const [monthResults, setMonthResults] = useState([])

  const timerRef = useRef(null)
  const startTimeRef = useRef(0)

  // check existing result on mount
  useEffect(() => {
    api.get(`/api/quiz/results/${YEAR}/${MONTH}`)
      .then(res => {
        const mine = res.data.find(r => r.userId === user?.userId)
        if (mine) setExisting(mine)
        setMonthResults(res.data)
      })
      .catch(() => {})
  }, [user?.userId])

  function startTimer() {
    startTimeRef.current = Date.now() - elapsed * 1000
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }
  function stopTimer() {
    clearInterval(timerRef.current)
  }

  async function handleStart() {
    setLoading(true)
    try {
      const res = await api.get(`/api/quiz/questions/${YEAR}/${MONTH}`)
      const qs = res.data.questions
      // Shuffle questions (keep original index for submission)
      const shuffled = shuffle(qs.map((q, i) => ({ ...q, originalIndex: i })))
      setQuestions(shuffled)
      setAnswers(new Array(shuffled.length).fill(null))
      setCurrent(0)
      setElapsed(0)
      setScreen("quiz")
      startTimer()
    } catch (e) {
      alert(e.response?.data?.detail || "Error al cargar el quiz")
    } finally {
      setLoading(false)
    }
  }

  function selectAnswer(optIndex) {
    setAnswers(prev => {
      const next = [...prev]
      next[current] = optIndex
      return next
    })
  }

  function goNext() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
    }
  }
  function goPrev() {
    if (current > 0) setCurrent(c => c - 1)
  }

  async function handleSubmit() {
    if (answers.some(a => a === null)) {
      const unanswered = answers.filter(a => a === null).length
      if (!window.confirm(`Quedan ${unanswered} preguntas sin responder. ¿Enviar de todos modos?`)) return
    }
    stopTimer()
    setLoading(true)

    // Map answers back to original question order
    const orderedAnswers = new Array(questions.length).fill(0)
    questions.forEach((q, displayIdx) => {
      orderedAnswers[q.originalIndex] = answers[displayIdx] ?? 0
    })

    try {
      const res = await api.post("/api/quiz/submit", {
        year: YEAR,
        month: MONTH,
        answers: orderedAnswers,
        time: elapsed,
      })
      setResult(res.data)
      setScreen("result")
      // Refresh ranking
      api.get(`/api/quiz/results/${YEAR}/${MONTH}`).then(r => setMonthResults(r.data))
    } catch (e) {
      const msg = e.response?.data?.detail || "Error al enviar el quiz"
      alert(msg)
      startTimer()
    } finally {
      setLoading(false)
    }
  }

  // Cleanup timer
  useEffect(() => () => stopTimer(), [])

  // ── Start screen ────────────────────────────────────────────────────────────
  if (screen === "start") {
    return (
      <Layout>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <Card style={{ padding: 32, textAlign:"center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: DG, marginBottom: 6 }}>
              Quiz {MS[MONTH - 1]}
            </div>
            <div style={{ fontSize: 14, color:"#888", marginBottom: 24 }}>
              15 preguntas · tiempo libre · sin penalización por error
            </div>

            {isNoQuiz ? (
              <div style={{ padding:"16px 24px", background: LG, borderRadius: 10, color: DG, fontSize: 14 }}>
                No participas en el quiz mensual
              </div>
            ) : existing ? (
              <div>
                <div style={{ padding:"16px 24px", background: LG, borderRadius: 10, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color:"#888", marginBottom: 4 }}>Ya completaste este quiz</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: scoreColor(existing.score) }}>
                    {existing.correct}/{existing.total}
                  </div>
                  <div style={{ fontSize: 16, color: scoreColor(existing.score) }}>
                    {existing.score.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 12, color:"#aaa", marginTop: 4 }}>
                    Tiempo: {fmt(Math.round(existing.time ?? 0))}
                  </div>
                </div>
              </div>
            ) : (
              <Button onClick={handleStart} disabled={loading} style={{ fontSize: 16, padding:"12px 40px" }}>
                {loading ? "Cargando..." : "Comenzar quiz"}
              </Button>
            )}
          </Card>

          {/* Monthly ranking */}
          {monthResults.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${BD}`, fontWeight: 700, color: DG }}>
                Resultados {MS[MONTH - 1]}
              </div>
              {monthResults.map((r, i) => (
                <div key={r.userId} style={{
                  display:"flex", alignItems:"center", gap: 12,
                  padding:"10px 16px", borderBottom: i < monthResults.length-1 ? `1px solid ${BD}` : "none",
                }}>
                  <div style={{ width: 24, fontSize: 16, textAlign:"center" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}
                  </div>
                  <div style={{ fontSize: 18 }}>{r.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DG }}>{r.nick}</div>
                    <div style={{ fontSize: 11, color:"#aaa" }}>{fmt(Math.round(r.time ?? 0))}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(r.score) }}>
                      {r.score.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color:"#888" }}>{r.correct}/{r.total}</div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </Layout>
    )
  }

  // ── Quiz screen ─────────────────────────────────────────────────────────────
  if (screen === "quiz") {
    const q = questions[current]
    const answered = answers.filter(a => a !== null).length

    return (
      <Layout>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color:"#888" }}>
              {answered}/{questions.length} respondidas
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: DG, fontFamily:"monospace" }}>
              ⏱ {fmt(elapsed)}
            </span>
          </div>

          {/* Progress dots */}
          <div style={{ display:"flex", gap: 4, marginBottom: 20, flexWrap:"wrap" }}>
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{
                width: 28, height: 28, borderRadius: "50%", border: "none",
                cursor:"pointer", fontSize: 11, fontWeight: 700,
                background: i === current ? DG : answers[i] !== null ? G : "#ddd",
                color: (i === current || answers[i] !== null) ? "#fff" : "#888",
              }}>{i + 1}</button>
            ))}
          </div>

          {/* Question card */}
          <Card style={{ marginBottom: 16, padding: 24 }}>
            <div style={{ fontSize: 12, color:"#aaa", marginBottom: 8 }}>
              Pregunta {current + 1} de {questions.length}
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: DG, lineHeight: 1.5, marginBottom: 24 }}>
              {q.text}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => selectAnswer(i)} style={{
                  display:"flex", alignItems:"center", gap: 12,
                  padding:"12px 16px", borderRadius: 10,
                  border:`2px solid ${answers[current]===i ? G : BD}`,
                  background: answers[current]===i ? LG : "#fff",
                  cursor:"pointer", textAlign:"left",
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%", display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize: 13, fontWeight: 700,
                    background: answers[current]===i ? G : "#eee",
                    color: answers[current]===i ? "#fff" : "#888", flexShrink: 0,
                  }}>{OPTS[i]}</span>
                  <span style={{ fontSize: 14, color: DG }}>{opt}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Navigation */}
          <div style={{ display:"flex", justifyContent:"space-between", gap: 10 }}>
            <Button onClick={goPrev} disabled={current === 0}>← Anterior</Button>
            <div style={{ flex: 1 }} />
            {current < questions.length - 1 ? (
              <Button onClick={goNext}>Siguiente →</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} style={{ background:"#27ae60" }}>
                {loading ? "Enviando..." : "Enviar quiz"}
              </Button>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // ── Result screen ────────────────────────────────────────────────────────────
  if (screen === "result" && result) {
    return (
      <Layout>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <Card style={{ padding: 32, textAlign:"center", marginBottom: 20 }}>
            <div style={{ fontSize: 48 }}>
              {result.score >= 80 ? "🎉" : result.score >= 60 ? "👍" : "💪"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: DG, margin:"8px 0" }}>
              {result.score >= 80 ? "¡Excelente!" : result.score >= 60 ? "¡Bien hecho!" : "Sigue adelante"}
            </div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom: 16 }}>
              <RadialScore score={result.score} size={120} />
            </div>
            <div style={{ fontSize: 18, color:"#555" }}>
              {result.correct} de {result.total} correctas
            </div>
            <div style={{ fontSize: 13, color:"#aaa", marginTop: 4 }}>
              Tiempo: {fmt(elapsed)}
            </div>
          </Card>

          {/* Per-question feedback */}
          {result.feedback && (
            <Card>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${BD}`, fontWeight: 700, color: DG }}>
                Revisión de respuestas
              </div>
              {result.feedback.map((f, i) => (
                <div key={i} style={{
                  padding:"12px 16px", borderBottom: i < result.feedback.length-1 ? `1px solid ${BD}` : "none",
                  background: f.isCorrect ? "#f0fff4" : "#fff5f5",
                }}>
                  <div style={{ display:"flex", gap: 8, alignItems:"flex-start" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{f.isCorrect ? "✅" : "❌"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DG, marginBottom: 6 }}>
                        {i + 1}. {f.text}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap: 3 }}>
                        {f.options.map((opt, oi) => {
                          const isSelected = oi === f.selected
                          const isCorrect  = oi === f.correct
                          let bg = "transparent"
                          let fw = 400
                          let color = "#555"
                          if (isCorrect) { bg = "#e8f5e9"; color = "#27ae60"; fw = 700 }
                          if (isSelected && !isCorrect) { bg = "#fdecea"; color = "#e74c3c"; fw = 700 }
                          return (
                            <div key={oi} style={{
                              display:"flex", gap: 6, alignItems:"center",
                              padding:"4px 8px", borderRadius: 6, background: bg,
                            }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color, width: 20 }}>{OPTS[oi]}</span>
                              <span style={{ fontSize: 13, color, fontWeight: fw }}>{opt}</span>
                              {isSelected && !isCorrect && <span style={{ marginLeft:"auto", fontSize: 12 }}>← tu respuesta</span>}
                              {isCorrect && <span style={{ marginLeft:"auto", fontSize: 12 }}>← correcta</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </Layout>
    )
  }

  return null
}
