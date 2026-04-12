import { G, BD, inputStyle } from "../../constants/theme"

export default function Counter({ value, onChange, unit }) {
  const v = value ?? ""
  const btnStyle = {
    width: 42, height: 42, borderRadius: 11,
    border: `1px solid ${BD}`, cursor: "pointer",
    background: "#fff", color: G, fontSize: 20,
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button style={btnStyle} onClick={() => onChange(Math.max(0, (Number(v) || 0) - 1))}>−</button>
      <input
        type="number" min="0" value={v}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
        }
        style={{ ...inputStyle, width: 66, textAlign: "center", fontSize: 20, fontWeight: 800 }}
      />
      <button style={btnStyle} onClick={() => onChange((Number(v) || 0) + 1)}>+</button>
      {unit && <span style={{ fontSize: 13, color: "#888" }}>{unit}</span>}
    </div>
  )
}
