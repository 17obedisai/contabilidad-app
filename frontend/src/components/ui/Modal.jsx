import { useEffect } from "react"
import { X } from "lucide-react"
import { colors, shadows, radius } from "../../constants/tokens"

export default function Modal({ open, onClose, title, children, maxWidth = 480 }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.bgCard,
          borderRadius: radius.xl,
          boxShadow: shadows.lg,
          width: "100%",
          maxWidth,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px",
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: colors.textTitle }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: colors.textLabel, padding: 4, borderRadius: radius.sm,
              display: "flex", alignItems: "center",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = colors.textTitle}
            onMouseLeave={e => e.currentTarget.style.color = colors.textLabel}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  )
}
