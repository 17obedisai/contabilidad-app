import { G, GO } from "../constants/theme"

export default function Logo({ size = 120 }) {
  return (
    <svg
      width={size}
      height={size * 0.28}
      viewBox="0 0 260 58"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="4" y="42"
        fontFamily="Georgia,serif"
        fontSize="36"
        fontWeight="bold"
        fill={G}
        fontStyle="italic"
      >
        coocentral
      </text>
      <path
        d="M228 8c-4 0-8 4-8 10s6 14 12 14c-2 6-6 10-10 14"
        stroke={G}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="236" cy="16" rx="6" ry="8" fill={GO} opacity="0.3" />
    </svg>
  )
}
