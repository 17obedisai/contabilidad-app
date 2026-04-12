import { G } from "../../constants/theme"

const ratingColor = (n) => (n >= 8 ? G : n >= 5 ? "#7c4dff" : "#e67e22")

export default function RatingButtons({ value, onChange, disabled = false }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
        const active = value >= n
        const col = ratingColor(n)
        return (
          <button
            key={n}
            onClick={() => !disabled && onChange(n)}
            style={{
              width: 40, height: 40, borderRadius: 11,
              border: active ? `2px solid ${col}` : "2px solid #e0e0e0",
              cursor: disabled ? "default" : "pointer",
              background: active ? col + "15" : "#fafafa",
              color: active ? col : "#ccc",
              fontSize: 16, fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}
