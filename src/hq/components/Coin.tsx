/** A drawn gold coin, so it looks the same on every phone and computer (the coin emoji is missing on older Windows). */
export function Coin({ size = 20 }: { size?: number }) {
  return (
    <svg className="coin" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <ellipse cx="12" cy="13.2" rx="10" ry="10" fill="#b8860b" />
      <circle cx="12" cy="11.6" r="10" fill="#ffc928" />
      <circle cx="12" cy="11.6" r="7.4" fill="#ffdf6b" stroke="#e0a100" strokeWidth="1" />
      <path d="M12 6.6l1.5 3.2 3.5.4-2.6 2.4.7 3.5-3.1-1.8-3.1 1.8.7-3.5-2.6-2.4 3.5-.4z" fill="#e0a100" />
      <path d="M5.4 8.2a7.6 7.6 0 0 1 4.4-4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
