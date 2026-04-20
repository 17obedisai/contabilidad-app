import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  CalendarDays, Plus, Trash2, Check, Save, FileQuestion, Award,
} from "lucide-react"
import api from "../services/api"
import Layout from "../components/Layout"
import SectionCard from "../components/ui/SectionCard"
import Button from "../components/ui/Button"
import ConfirmModal from "../components/ui/ConfirmModal"
import { inputStyle } from "../constants/theme"
import { colors, radius, shadows } from "../constants/tokens"

const YEAR = new Date().getFullYear()
const MS   = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const MF   = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto",
              "Septiembre","Octubre","Noviembre","Diciembre"]
const OPTS = ["A","B","C","D","E","F"]

const emptyQuestion = () => ({
  text: "",
  options: ["", "", "", ""],
  correct: 0,
  difficulty: "m",
})

export default function QuizEditor() {
  const [month, setMonth]       = useState(new Date().getMonth() + 1)
  const [title, setTitle]       = useState("")
  const [questions, setQuestions] = useState([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(null) // question index to remove

  // Results panel — admin view of who has submitted the quiz this month
  const [results, setResults]   = useState([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [confirmDelResult, setConfirmDelResult] = useState(null) // { userId, name }
  const [deletingResult, setDeletingResult] = useState(false)

  // Load template whenever month changes
  useEffect(() => {
    setLoading(true)
    api.get(`/api/quiz/template/${YEAR}/${month}`)
      .then(res => {
        setTitle(res.data.title || "")
        setQuestions(
          (res.data.questions || []).map(q => ({
            text:       q.text || "",
            options:    q.options?.length ? [...q.options] : ["", "", "", ""],
            correct:    typeof q.correct === "number" ? q.correct : 0,
            difficulty: q.difficulty || "m",
          }))
        )
      })
      .catch(e => toast.error(e.response?.data?.detail || "Error al cargar la plantilla"))
      .finally(() => setLoading(false))
  }, [month])

  // Load monthly results for the admin panel
  function fetchResults() {
    setResultsLoading(true)
    api.get(`/api/quiz/results/${YEAR}/${month}`)
      .then(res => setResults(Array.isArray(res.data) ? res.data : []))
      .catch(() => setResults([]))
      .finally(() => setResultsLoading(false))
  }
  useEffect(() => { fetchResults() }, [month])

  async function deleteResult(userId) {
    setDeletingResult(true)
    try {
      await api.delete(`/api/quiz/results/${userId}/${YEAR}/${month}`)
      toast.success("Resultado eliminado — el empleado puede repetir el quiz")
      // Refresh the panel from server (preserves any concurrent admin actions)
      fetchResults()
    } catch (e) {
      toast.error(e.response?.data?.detail || "No se pudo eliminar el resultado")
    } finally {
      setDeletingResult(false)
      setConfirmDelResult(null)
    }
  }

  function updateQuestion(idx, patch) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q))
  }

  function updateOption(qIdx, oIdx, value) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const options = [...q.options]
      options[oIdx] = value
      return { ...q, options }
    }))
  }

  function addOption(qIdx) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      if (q.options.length >= 6) return q
      return { ...q, options: [...q.options, ""] }
    }))
  }

  function removeOption(qIdx, oIdx) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      if (q.options.length <= 2) return q
      const options = q.options.filter((_, k) => k !== oIdx)
      let correct = q.correct
      if (oIdx === correct)        correct = 0
      else if (oIdx < correct)     correct = correct - 1
      return { ...q, options, correct }
    }))
  }

  function addQuestion() {
    setQuestions(prev => [...prev, emptyQuestion()])
  }

  function removeQuestion(idx) {
    setQuestions(prev => prev.filter((_, i) => i !== idx))
    setConfirmDel(null)
  }

  async function saveTemplate() {
    // Client-side validation mirroring backend
    if (!title.trim()) {
      toast.error("Agrega un título para el quiz")
      return
    }
    if (questions.length === 0) {
      toast.error("Agrega al menos una pregunta")
      return
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) { toast.error(`Pregunta ${i+1}: falta el enunciado`); return }
      if (q.options.some(o => !o.trim())) { toast.error(`Pregunta ${i+1}: hay opciones vacías`); return }
      if (q.correct < 0 || q.correct >= q.options.length) {
        toast.error(`Pregunta ${i+1}: selecciona la respuesta correcta`)
        return
      }
    }

    setSaving(true)
    try {
      await api.put(`/api/quiz/template/${YEAR}/${month}`, {
        title: title.trim(),
        questions,
      })
      toast.success(`Quiz de ${MF[month-1]} guardado`)
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al guardar la plantilla")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div style={{
        maxWidth: 960, margin: "0 auto",
        display: "flex", flexDirection: "column", gap: 20,
      }}>

        {/* Month selector (Bento) */}
        <SectionCard icon={CalendarDays} title="Mes a editar" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {MS.map((label, i) => {
              const m = i + 1
              const isActive = month === m
              return (
                <button key={m} onClick={() => setMonth(m)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 20, cursor: "pointer", fontSize: 13,
                  border: `2px solid ${isActive ? colors.brandPine : colors.border}`,
                  background: isActive ? colors.brandPineLt : colors.bgCard,
                  color: isActive ? "#111827" : colors.textBody,
                  fontWeight: isActive ? 700 : 500,
                  transition: "all 0.2s ease",
                }}>
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* Title + stats (Bento) */}
        <SectionCard style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px" }}>
              <div style={{
                fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.05em", color: colors.textLabel, marginBottom: 4,
              }}>
                Título del quiz — {MF[month-1]} {YEAR}
              </div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Fundamentos contables y IVA"
                style={{ ...inputStyle }}
              />
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: radius.md,
              background: colors.bgSecondary, border: `1px solid ${colors.border}`,
            }}>
              <FileQuestion size={18} color={colors.brandPine} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.textTitle, lineHeight: 1 }}>
                  {questions.length}
                </div>
                <div style={{ fontSize: 10, color: colors.textLabel, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  preguntas
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Results panel — admin can wipe a single employee's monthly result */}
        <SectionCard icon={Award} title={`Resultados de ${MF[month-1]}`} style={{ padding: "18px 20px" }}>
          {resultsLoading ? (
            <div style={{ color: colors.textLabel, fontSize: 13 }}>Cargando…</div>
          ) : results.length === 0 ? (
            <div style={{ color: colors.textLabel, fontSize: 13 }}>
              Aún no hay resultados registrados para este mes.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map(r => (
                <div key={r.userId} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: radius.md,
                  background: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: `${colors.brandPine}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0,
                  }}>{r.emoji || "👤"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.textTitle }}>
                      {r.name || r.nick}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textLabel }}>
                      @{r.nick} · {r.correct}/{r.total} aciertos
                    </div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: colors.brandPine,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 56, textAlign: "right",
                  }}>
                    {r.score}%
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelResult({ userId: r.userId, name: r.name || r.nick })}
                    title="Eliminar resultado (permite repetir)"
                    style={{
                      background: "transparent",
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.sm,
                      padding: 8, cursor: "pointer",
                      color: colors.textLabel,
                      display: "flex", alignItems: "center",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.danger; e.currentTarget.style.color = colors.danger }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textLabel }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Questions list */}
        {loading ? (
          <SectionCard style={{ textAlign: "center", padding: 40, color: colors.textLabel }}>
            Cargando…
          </SectionCard>
        ) : (
          <>
            {questions.map((q, qIdx) => (
              <SectionCard key={qIdx} style={{ padding: "18px 20px" }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 12, gap: 10,
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.05em", color: colors.brandPine,
                  }}>
                    Pregunta {qIdx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(qIdx)}
                    title="Eliminar pregunta"
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      color: colors.textLabel, padding: 4, borderRadius: radius.sm,
                      display: "flex", alignItems: "center",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = colors.danger}
                    onMouseLeave={e => e.currentTarget.style.color = colors.textLabel}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Question text */}
                <textarea
                  value={q.text}
                  onChange={e => updateQuestion(qIdx, { text: e.target.value })}
                  placeholder="Enunciado de la pregunta…"
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical", marginBottom: 12, fontSize: 14 }}
                />

                {/* Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.options.map((opt, oIdx) => {
                    const isCorrect = q.correct === oIdx
                    return (
                      <div key={oIdx} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: radius.md,
                        border: `2px solid ${isCorrect ? colors.success : colors.border}`,
                        background: isCorrect ? `${colors.success}12` : colors.bgSecondary,
                        transition: "all 0.2s",
                      }}>
                        <button
                          type="button"
                          onClick={() => updateQuestion(qIdx, { correct: oIdx })}
                          title={isCorrect ? "Respuesta correcta" : "Marcar como correcta"}
                          style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: isCorrect ? colors.success : colors.bgCard,
                            color: isCorrect ? "#fff" : colors.textBody,
                            border: `1px solid ${isCorrect ? colors.success : colors.border}`,
                            cursor: "pointer", fontWeight: 700, fontSize: 12,
                          }}
                        >
                          {isCorrect ? <Check size={14} /> : OPTS[oIdx]}
                        </button>
                        <input
                          value={opt}
                          onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                          placeholder={`Opción ${OPTS[oIdx]}`}
                          style={{
                            ...inputStyle,
                            background: "transparent",
                            border: "none",
                            padding: "6px 0",
                            fontSize: 14,
                          }}
                        />
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(qIdx, oIdx)}
                            title="Eliminar opción"
                            style={{
                              background: "transparent", border: "none", cursor: "pointer",
                              color: colors.textLabel, padding: 4, flexShrink: 0,
                              display: "flex", alignItems: "center",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {q.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addOption(qIdx)}
                      style={{
                        alignSelf: "flex-start",
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: radius.md,
                        border: `1px dashed ${colors.border}`,
                        background: "transparent", color: colors.textBody,
                        fontSize: 12, cursor: "pointer",
                      }}
                    >
                      <Plus size={12} /> Agregar opción
                    </button>
                  )}
                </div>

                {/* Difficulty */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginTop: 14,
                  fontSize: 12, color: colors.textLabel,
                }}>
                  <span>Dificultad:</span>
                  {[
                    { v: "e", label: "Fácil" },
                    { v: "m", label: "Media" },
                    { v: "d", label: "Difícil" },
                  ].map(({ v, label }) => {
                    const isActive = q.difficulty === v
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateQuestion(qIdx, { difficulty: v })}
                        style={{
                          padding: "4px 10px", borderRadius: 12, fontSize: 11,
                          fontWeight: isActive ? 700 : 500,
                          border: `1px solid ${isActive ? colors.brandPine : colors.border}`,
                          background: isActive ? colors.brandPineLt : "transparent",
                          color: isActive ? "#111827" : colors.textBody,
                          cursor: "pointer",
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </SectionCard>
            ))}

            {/* Add new question */}
            <button
              type="button"
              onClick={addQuestion}
              style={{
                padding: "14px 20px", borderRadius: radius.xl,
                border: `1px dashed ${colors.border}`,
                background: "transparent", color: colors.textBody,
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Plus size={16} /> Agregar pregunta
            </button>

            {/* Save bar (sticky at bottom of content) */}
            <div style={{
              position: "sticky", bottom: 16, zIndex: 10,
              display: "flex", justifyContent: "flex-end", gap: 10,
              padding: "12px 16px",
              background: colors.bgCard, borderRadius: radius.xl,
              boxShadow: shadows.lg, border: `1px solid ${colors.border}`,
            }}>
              <div style={{ flex: 1, fontSize: 12, color: colors.textLabel, alignSelf: "center" }}>
                Cambios guardados en la base de datos · MongoDB
              </div>
              <button
                type="button"
                onClick={saveTemplate}
                disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: radius.md,
                  border: "none", cursor: saving ? "wait" : "pointer",
                  fontSize: 14, fontWeight: 700,
                  background: colors.brandPine, color: "#fff",
                  opacity: saving ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                <Save size={16} />
                {saving ? "Guardando…" : `Guardar ${MF[month-1]}`}
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmDel !== null}
        title="Eliminar pregunta"
        message="¿Quitar esta pregunta del quiz? Solo se aplicará al guardar."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => removeQuestion(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />

      <ConfirmModal
        open={!!confirmDelResult}
        title={`Eliminar resultado de ${confirmDelResult?.name ?? ""}`}
        message={`Se borrará el resultado de ${MF[month-1]} ${YEAR} y el empleado podrá volver a presentar el quiz. Esta acción no se puede deshacer.`}
        confirmLabel={deletingResult ? "Eliminando…" : "Eliminar resultado"}
        variant="danger"
        onConfirm={() => deleteResult(confirmDelResult?.userId)}
        onCancel={() => setConfirmDelResult(null)}
      />
    </Layout>
  )
}
