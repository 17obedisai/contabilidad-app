// Legacy design tokens — preserved for backward compat with older pages.
// UI-chrome values now use CSS custom properties for dark mode support.

export const G   = "#2d6a2e"              // brand green — fixed
export const DG  = "var(--text-heading)"  // dark green text — theme-aware
export const LG  = "var(--bg-highlight)"  // light green bg — theme-aware
export const GO  = "#b8941f"              // gold — fixed
export const BG  = "var(--bg-primary)"    // page background — theme-aware
export const BD  = "var(--border-green)"  // green border — theme-aware

export function scoreColor(s) {
  return s >= 90 ? G : s >= 75 ? "#7c4dff" : s >= 60 ? "#e67e22" : "#e74c3c"
}

export function scoreLabel(s) {
  return s >= 90 ? "Excelente" : s >= 75 ? "Bueno" : s >= 60 ? "Aceptable" : "Debe Mejorar"
}

export const inputStyle = {
  background:   "var(--bg-secondary)",
  border:       "1px solid var(--border-green)",
  borderRadius: 10,
  padding:      "10px 14px",
  color:        "var(--text-title)",
  fontSize:     15,
  outline:      "none",
  width:        "100%",
  boxSizing:    "border-box",
}

export const cardStyle = {
  background:   "var(--bg-card)",
  border:       "1px solid var(--border-green)",
  borderRadius: 16,
  padding:      "18px 16px",
  marginBottom: 14,
  boxShadow:    "var(--shadow-sm)",
}
