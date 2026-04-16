// Logo loaded as <img> from /public/logo-coocentral.svg.
// `variant="light"` inverts colors for use on dark backgrounds.
export default function Logo({ size = 140, variant = "auto" }) {
  // size = visual width in px; height auto-scales via SVG aspect ratio
  const filter = variant === "light" ? "brightness(0) invert(1)" : "none"

  return (
    <img
      src="/logo-coocentral.svg"
      alt="Coocentral"
      style={{
        width: size,
        height: "auto",
        display: "block",
        filter,
        userSelect: "none",
      }}
      draggable={false}
    />
  )
}
