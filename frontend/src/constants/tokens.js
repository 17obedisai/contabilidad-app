// ── Centralized Design Tokens ────────────────────────────────────────────
// Single source of truth for all visual design values (Bento Box UI style)

// ── COLORS ───────────────────────────────────────────────────────────────
export const colors = {
  // Backgrounds
  bgPrimary:    "#F3F4F6",     // Page background (gris perla)
  bgCard:       "#FFFFFF",     // Card background
  bgSecondary:  "#F8FAFC",     // Secondary surface / subtle sections

  // Text
  textTitle:    "#111827",     // Titles, headings
  textBody:     "#4B5563",     // Descriptions, body text
  textLabel:    "#94a3b8",     // Labels, captions, muted text

  // Brand
  brandPine:    "#1a5c2e",     // Primary green (brand)
  brandPineDk:  "#14472a",     // Dark green (hover, active states)
  brandPineLt:  "#e8f5e9",     // Light green (backgrounds, highlights)

  // Semantic
  warning:      "#b8860b",     // Amber warning
  success:      "#16a34a",     // Green success
  danger:       "#dc2626",     // Red danger / error
  info:         "#3498db",     // Blue info

  // Status
  statusPending:    "#95a5a6",
  statusInProgress: "#3498db",
  statusComplete:   "#27ae60",

  // Priority
  priorityHigh:   "#e74c3c",
  priorityMedium: "#e67e22",
  priorityLow:    "#27ae60",

  // Borders
  border:       "#E5E7EB",     // Standard border
  borderLight:  "#F3F4F6",     // Very subtle border
}

// ── SHADOWS ──────────────────────────────────────────────────────────────
export const shadows = {
  sm:  "0 1px 2px rgba(0,0,0,0.04)",
  md:  "0 10px 25px -5px rgba(0,0,0,0.05)",
  lg:  "0 20px 40px -10px rgba(0,0,0,0.1)",
}

// ── RADIUS ───────────────────────────────────────────────────────────────
export const radius = {
  sm:  6,
  md:  12,
  lg:  16,
  xl:  24,   // Bento cards
}

// ── TYPOGRAPHY ───────────────────────────────────────────────────────────
export const typography = {
  titleWeight: 800,
  labelStyle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: colors.textLabel,
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

// ── SHARED STYLES ────────────────────────────────────────────────────────
export const inputStyle = {
  background: colors.bgSecondary,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  padding: "10px 14px",
  color: colors.textTitle,
  fontSize: 15,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
}

export const bentoCardStyle = {
  background: colors.bgCard,
  borderRadius: radius.xl,
  padding: "20px",
  boxShadow: shadows.md,
  border: "none",
}
