import { LG, scoreColor } from "../../constants/theme"

export default function RadialScore({ score, size = 90, stroke = 7 }) {
  const s = score ?? 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (s / 100) * c
  const col = scoreColor(s)

  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={LG} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={col} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s" }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fill={col} fontSize={size * 0.26} fontWeight="800"
      >
        {Math.round(s)}
      </text>
    </svg>
  )
}
