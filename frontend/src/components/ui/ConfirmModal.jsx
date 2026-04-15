import { AlertTriangle, Trash2 } from "lucide-react"
import Modal from "./Modal"
import { colors, radius } from "../../constants/tokens"

/**
 * Reusable confirmation dialog.
 *
 * Props:
 *   open      — boolean
 *   title     — string
 *   message   — string
 *   onConfirm — () => void  called when user clicks confirm
 *   onCancel  — () => void  called when user dismisses
 *   confirmLabel — string (default "Eliminar")
 *   variant   — "danger" | "warning" | "default"
 *   loading   — boolean  disables button while async action runs
 */
export default function ConfirmModal({
  open,
  title = "¿Confirmar acción?",
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirmar",
  variant = "danger",
  loading = false,
}) {
  const variantStyle = {
    danger:  { bg: colors.danger,  icon: <Trash2 size={20} color={colors.danger} /> },
    warning: { bg: colors.warning, icon: <AlertTriangle size={20} color={colors.warning} /> },
    default: { bg: colors.brandPine, icon: null },
  }[variant] ?? { bg: colors.danger }

  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth={400}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Icon + message */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {variantStyle.icon && (
            <div style={{
              width: 40, height: 40, borderRadius: radius.md, flexShrink: 0,
              background: `${variantStyle.bg}12`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {variantStyle.icon}
            </div>
          )}
          <p style={{ margin: 0, fontSize: 14, color: colors.textBody, lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "10px 20px", borderRadius: radius.md,
              border: `1px solid ${colors.border}`, background: colors.bgCard,
              cursor: "pointer", fontSize: 14, color: colors.textBody, fontWeight: 600,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "10px 20px", borderRadius: radius.md, border: "none",
              cursor: loading ? "wait" : "pointer", fontSize: 14, fontWeight: 700,
              background: variantStyle.bg, color: "#fff",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
