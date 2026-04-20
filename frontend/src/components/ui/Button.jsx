import { G } from "../../constants/theme"

export default function Button({ active, color, children, style, ...props }) {
  const bg     = active ? (color || G) : "var(--bg-secondary)"
  // Active pill = dark-green bg → white text. Inactive pill = theme-aware secondary bg → body text.
  const fg     = active ? "#fff" : "var(--text-body)"
  return (
    <button
      style={{
        padding: "12px 20px",
        borderRadius: 12,
        border: active ? "none" : "1px solid var(--border)",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        background: bg,
        color: fg,
        transition: "all 0.2s",
        minHeight: 44,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
