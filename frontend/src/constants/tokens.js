// ── Centralized Design Tokens ────────────────────────────────────────────
// Theme-aware colors use CSS custom properties (see index.css).
// Brand / semantic / data-driven colors stay as fixed hex values.

// ── COLORS ───────────────────────────────────────────────────────────────
export const colors = {
  // Backgrounds — theme-aware
  bgPrimary:    "var(--bg-primary)",
  bgCard:       "var(--bg-card)",
  bgSecondary:  "var(--bg-secondary)",
  bgHighlight:  "var(--bg-highlight)",

  // Text — theme-aware
  textTitle:    "var(--text-title)",
  textHeading:  "var(--text-heading)",
  textBody:     "var(--text-body)",
  textLabel:    "var(--text-label)",

  // Brand — fixed (no dark-mode variant needed)
  brandPine:    "#1a5c2e",
  brandPineDk:  "#14472a",
  brandPineLt:  "#e8f5e9",

  // Semantic / data-driven — fixed
  warning:      "#b8860b",
  success:      "#16a34a",
  danger:       "#dc2626",
  info:         "#3498db",

  // Status chips — fixed
  statusPending:    "#95a5a6",
  statusInProgress: "#3498db",
  statusComplete:   "#27ae60",

  // Priority chips — fixed
  priorityHigh:   "#e74c3c",
  priorityMedium: "#e67e22",
  priorityLow:    "#27ae60",

  // Borders — theme-aware
  border:       "var(--border)",
  borderLight:  "var(--border-light)",
  borderGreen:  "var(--border-green)",
}

// ── SHADOWS ──────────────────────────────────────────────────────────────
export const shadows = {
  sm:  "var(--shadow-sm)",
  md:  "var(--shadow-md)",
  lg:  "var(--shadow-lg)",
}

// ── RADIUS ───────────────────────────────────────────────────────────────
export const radius = {
  sm:  6,
  md:  12,
  lg:  16,
  xl:  24,
}

// ── TYPOGRAPHY ───────────────────────────────────────────────────────────
export const typography = {
  titleWeight: 800,
  labelStyle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-label)",
  },
}

// ── SCORE HELPERS ────────────────────────────────────────────────────────
export function scoreColor(s) {
  if (s >= 90) return colors.success
  if (s >= 75) return "#7c4dff"
  if (s >= 60) return colors.warning
  return colors.danger
}

export function scoreLabel(s) {
  if (s >= 90) return "Excelente"
  if (s >= 75) return "Bueno"
  if (s >= 60) return "Aceptable"
  return "Debe Mejorar"
}

export function utilColor(pct) {
  if (pct >= 90) return colors.success
  if (pct >= 70) return colors.warning
  return colors.danger
}

// ── SHARED INPUT STYLE ───────────────────────────────────────────────────
export const inputStyle = {
  background:   "var(--bg-secondary)",
  border:       "1px solid var(--border)",
  borderRadius: radius.sm,
  padding:      "10px 14px",
  color:        "var(--text-title)",
  fontSize:     15,
  outline:      "none",
  width:        "100%",
  boxSizing:    "border-box",
}

export const bentoCardStyle = {
  background:   "var(--bg-card)",
  borderRadius: radius.xl,
  padding:      "20px",
  boxShadow:    "var(--shadow-md)",
  border:       "none",
}
