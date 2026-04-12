const AVATARS = {
  "👩‍💼": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#e8f5e9"/><circle cx="24" cy="18" r="8" fill="#2d6a2e"/><ellipse cx="24" cy="36" rx="12" ry="8" fill="#2d6a2e"/><text x="24" y="22" text-anchor="middle" fill="white" font-size="10" font-weight="bold">Y</text></svg>`,
  "📊": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff3e0"/><rect x="12" y="20" width="6" height="16" rx="2" fill="#e67e22"/><rect x="21" y="14" width="6" height="22" rx="2" fill="#2d6a2e"/><rect x="30" y="18" width="6" height="18" rx="2" fill="#b8941f"/></svg>`,
  "☕": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#efebe9"/><path d="M14 18h20v14c0 4-4 8-10 8s-10-4-10-8z" fill="#795548"/><path d="M34 22h4c2 0 4 2 4 4s-2 4-4 4h-4" stroke="#795548" stroke-width="2" fill="none"/><path d="M18 14c0-4 2-6 4-6s2 2 0 4" stroke="#999" stroke-width="1.5" fill="none" opacity="0.5"/></svg>`,
  "📑": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#e3f2fd"/><rect x="14" y="10" width="20" height="28" rx="3" fill="#fff" stroke="#2d6a2e" stroke-width="1.5"/><line x1="18" y1="18" x2="30" y2="18" stroke="#c8e6c9" stroke-width="2"/><line x1="18" y1="24" x2="28" y2="24" stroke="#c8e6c9" stroke-width="2"/><line x1="18" y1="30" x2="26" y2="30" stroke="#c8e6c9" stroke-width="2"/></svg>`,
  "🧾": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fce4ec"/><rect x="14" y="8" width="20" height="32" rx="2" fill="#fff" stroke="#e67e22" stroke-width="1.5"/><text x="24" y="28" text-anchor="middle" fill="#e67e22" font-size="14" font-weight="bold">$</text></svg>`,
  "📂": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#f3e5f5"/><path d="M10 18h12l3-4h13v20c0 2-2 4-4 4H14c-2 0-4-2-4-4z" fill="#b8941f" opacity="0.7"/></svg>`,
  "🏪": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#e0f7fa"/><rect x="12" y="18" width="24" height="18" rx="2" fill="#2d6a2e" opacity="0.8"/><path d="M12 18L16 10h16l4 8" fill="#b8941f"/><rect x="20" y="26" width="8" height="10" fill="#fff" rx="1"/></svg>`,
  "🛒": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff8e1"/><path d="M12 16h4l6 14h10l4-10H18" stroke="#2d6a2e" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="34" r="2" fill="#2d6a2e"/><circle cx="30" cy="34" r="2" fill="#2d6a2e"/></svg>`,
  "💻": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#e8eaf6"/><rect x="12" y="12" width="24" height="16" rx="2" fill="#333"/><rect x="14" y="14" width="20" height="12" rx="1" fill="#4caf50"/><text x="24" y="24" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">&lt;/&gt;</text><rect x="8" y="30" width="32" height="3" rx="1.5" fill="#666"/></svg>`,
  "📋": `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#e0f2f1"/><rect x="14" y="10" width="20" height="28" rx="3" fill="#fff" stroke="#2d6a2e" stroke-width="1.5"/><rect x="20" y="8" width="8" height="6" rx="2" fill="#2d6a2e"/><circle cx="19" cy="20" r="1.5" fill="#2d6a2e"/><line x1="23" y1="20" x2="30" y2="20" stroke="#c8e6c9" stroke-width="2"/><circle cx="19" cy="26" r="1.5" fill="#2d6a2e"/><line x1="23" y1="26" x2="30" y2="26" stroke="#c8e6c9" stroke-width="2"/></svg>`,
}

export default function Avatar({ emoji, size = 48 }) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: AVATARS[emoji] || AVATARS["📋"] }}
      style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}
    />
  )
}
