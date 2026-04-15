import { colors } from "../../constants/tokens"

export default function Gauge({ value, size = 100, stroke = 8, color, label }) {
  const v = Math.min(Math.max(value ?? 0, 0), 150)
  const displayV = Math.round(v)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(v, 100) / 100) * c
  const fillColor = color || (v >= 90 ? colors.success : v >= 70 ? colors.warning : colors.danger)

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={colors.bgPrimary} strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={fillColor} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle" dominantBaseline="central"
          fill={fillColor} fontSize={size * 0.24} fontWeight={800}
        >
          {displayV}%
        </text>
      </svg>
      {label && (
        <span style={{
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.05em", color: colors.textLabel, marginTop: 4,
        }}>
          {label}
        </span>
      )}
    </div>
  )
}
