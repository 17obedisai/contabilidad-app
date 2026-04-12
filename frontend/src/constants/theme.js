export const G   = "#2d6a2e"
export const DG  = "#1a4a1c"
export const LG  = "#e8f5e9"
export const GO  = "#b8941f"
export const BG  = "#f5f8f4"
export const BD  = "#c8e6c9"

export function scoreColor(s) {
  return s >= 90 ? G : s >= 75 ? "#7c4dff" : s >= 60 ? "#e67e22" : "#e74c3c"
}

export function scoreLabel(s) {
  return s >= 90 ? "Excelente" : s >= 75 ? "Bueno" : s >= 60 ? "Aceptable" : "Debe Mejorar"
}

export const inputStyle = {
  background: "#fafbfa",
  border: `1px solid ${BD}`,
  borderRadius: 10,
  padding: "10px 14px",
  color: "#1a1a1a",
  fontSize: 15,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
}

export const cardStyle = {
  background: "#fff",
  border: `1px solid ${BD}`,
  borderRadius: 16,
  padding: "18px 16px",
  marginBottom: 14,
  boxShadow: "0 2px 8px rgba(45,106,46,0.04)",
}
