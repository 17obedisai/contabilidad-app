import { G } from "../../constants/theme"

export default function Button({ active, color, children, style, ...props }) {
  return (
    <button
      style={{
        padding: "12px 20px",
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        background: active ? (color || G) : "#f0f4f0",
        color: active ? "#fff" : "#666",
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
