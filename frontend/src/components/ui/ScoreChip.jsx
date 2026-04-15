import { scoreColor, scoreLabel } from "../../constants/tokens"

export default function ScoreChip({ score, label }) {
  const s = score ?? 0
  const color = scoreColor(s)
  const text = label || scoreLabel(s)

  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "4px 12px", borderRadius: 20,
      background: `${color}15`,
      color: color,
      fontSize: 12, fontWeight: 700,
      letterSpacing: "0.02em",
    }}>
      {text}
    </span>
  )
}
