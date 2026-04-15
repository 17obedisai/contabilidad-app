import { useState } from "react"
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react"
import Modal from "./Modal"
import api from "../../services/api"
import { colors, radius, typography, inputStyle } from "../../constants/tokens"

function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <div style={{ ...typography.labelStyle, marginBottom: 6 }}>{label}</div>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: 42 }}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: colors.textLabel, display: "flex", alignItems: "center",
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

export default function ChangePasswordModal({ open, onClose }) {
  const [current,  setCurrent]  = useState("")
  const [next,     setNext]     = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [error,    setError]    = useState("")
  const [success,  setSuccess]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  function reset() {
    setCurrent(""); setNext(""); setConfirm(""); setError(""); setSuccess(false)
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    if (next.length < 6) { setError("La nueva contraseña debe tener al menos 6 caracteres."); return }
    if (next !== confirm) { setError("Las contraseñas nuevas no coinciden."); return }

    setLoading(true)
    try {
      await api.put("/api/auth/change-password", {
        current_password: current,
        new_password: next,
      })
      setSuccess(true)
      setTimeout(() => { handleClose() }, 1800)
    } catch (err) {
      setError(err?.response?.data?.detail || "Error al cambiar la contraseña.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cambiar contraseña">
      {success ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 12, padding: "16px 0",
        }}>
          <CheckCircle size={48} color={colors.success} />
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.textTitle }}>
            ¡Contraseña actualizada!
          </span>
          <span style={{ fontSize: 13, color: colors.textLabel }}>
            Cerrando automáticamente…
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PasswordInput
            label="Contraseña actual"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder="Ingresa tu contraseña actual"
          />
          <PasswordInput
            label="Nueva contraseña"
            value={next}
            onChange={e => setNext(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
          <PasswordInput
            label="Confirmar nueva contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repite la nueva contraseña"
          />

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: radius.md,
              background: `${colors.danger}10`, color: colors.danger,
              fontSize: 13, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !current || !next || !confirm}
            style={{
              padding: "12px 20px", borderRadius: radius.md,
              border: "none", cursor: loading ? "wait" : "pointer",
              fontSize: 14, fontWeight: 700,
              background: colors.brandPine, color: "#fff",
              opacity: loading || !current || !next || !confirm ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "opacity 0.2s",
            }}
          >
            <Lock size={16} />
            {loading ? "Cambiando…" : "Cambiar contraseña"}
          </button>
        </form>
      )}
    </Modal>
  )
}
