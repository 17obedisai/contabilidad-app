import { cardStyle } from "../../constants/theme"

export default function Card({ children, style, ...props }) {
  return (
    <div style={{ ...cardStyle, ...style }} {...props}>
      {children}
    </div>
  )
}
