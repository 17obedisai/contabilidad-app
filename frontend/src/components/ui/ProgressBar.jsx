import { LG, scoreColor } from "../../constants/theme"

export default function ProgressBar({ value, max = 100, color, height = 10 }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ flex: 1, height, borderRadius: height / 2, background: LG, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`, height: "100%",
          borderRadius: height / 2,
          background: color || scoreColor(value),
          transition: "width 0.5s",
        }}
      />
    </div>
  )
}
