import { colors, shadows, radius } from "../../constants/tokens"

export default function SectionCard({ children, style, title, icon: Icon, ...props }) {
  return (
    <div
      style={{
        background: colors.bgCard,
        borderRadius: radius.xl,
        padding: "20px",
        boxShadow: shadows.md,
        border: "none",
        ...style,
      }}
      {...props}
    >
      {(title || Icon) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
        }}>
          {Icon && <Icon size={20} color={colors.brandPine} strokeWidth={2.5} />}
          {title && (
            <span style={{
              fontSize: 16, fontWeight: 800, color: colors.textTitle,
            }}>
              {title}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
