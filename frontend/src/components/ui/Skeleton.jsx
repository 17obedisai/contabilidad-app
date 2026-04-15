// Shimmer animation is defined globally in index.css (.skeleton-shimmer class)
// and automatically responds to the active theme via CSS custom properties.
import { colors, radius, shadows } from "../../constants/tokens"

/**
 * Skeleton block.
 * Preset shapes: "rect" (default), "circle", "text", "title"
 */
export default function Skeleton({ shape = "rect", width, height, style = {} }) {
  const shapeStyle = {
    rect:   { borderRadius: radius.md,  height: height ?? 20 },
    circle: { borderRadius: "50%",      height: height ?? 40, width: width ?? 40 },
    text:   { borderRadius: radius.sm,  height: height ?? 14 },
    title:  { borderRadius: radius.sm,  height: height ?? 22 },
  }[shape] ?? {}

  return (
    <div
      className="skeleton-shimmer"
      style={{ width: width ?? "100%", ...shapeStyle, ...style }}
    />
  )
}

/** Pre-built skeleton for a Bento summary card (icon + number + label) */
export function SkeletonMetricCard() {
  return (
    <div style={{
      background: colors.bgCard,
      borderRadius: radius.xl,
      padding: "24px 20px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      boxShadow: shadows.md,
    }}>
      <Skeleton shape="circle" width={40} height={40} />
      <Skeleton shape="title"  width={80} height={28} />
      <Skeleton shape="text"   width={60} />
      <Skeleton shape="text"   width={90} />
    </div>
  )
}

/** Pre-built skeleton for a list row (avatar + two lines) */
export function SkeletonRow({ withAvatar = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
      {withAvatar && <Skeleton shape="circle" width={40} height={40} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton shape="title" width="60%" />
        <Skeleton shape="text"  width="40%" />
      </div>
    </div>
  )
}

/** Pre-built skeleton for a Kanban card */
export function SkeletonCard() {
  return (
    <div style={{
      background: colors.bgCard,
      borderRadius: 8,
      padding: 14,
      boxShadow: shadows.sm,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <Skeleton shape="title" width="80%" />
      <Skeleton shape="text"  width="55%" />
      <Skeleton shape="rect"  height={8} />
    </div>
  )
}
