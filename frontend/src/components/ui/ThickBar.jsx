import { colors } from "../../constants/tokens"

export default function ThickBar({ value, max = 100, color, height = 12, showLabel = true }) {
  const pct = Math.min((value / max) * 100, 100)
  const fillColor = color || (pct >= 90 ? colors.success : pct >= 70 ? colors.warning : colors.danger)

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{
        flex: 1, height, borderRadius: height / 2,
        background: colors.bgPrimary, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          borderRadius: height / 2,
          background: fillColor,
          transition: "width 0.5s ease",
        }} />
      </div>
      {showLabel && (
        <span style={{
          fontSize: 13, fontWeight: 700, color: fillColor, minWidth: 42, textAlign: "right",
        }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}
