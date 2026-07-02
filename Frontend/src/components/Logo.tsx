export default function Logo({ size = 64 }: { size?: number }) {
  const s = size
  const r = s * 0.18
  const strokeW = s * 0.07
  const offset = s * 0.12

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8EEBF2" />
          <stop offset="100%" stopColor="#84247B" />
        </linearGradient>
      </defs>
      {[2, 1, 0].map((i) => (
        <rect
          key={i}
          x={s * 0.15 + i * offset}
          y={s * 0.15 + i * offset}
          width={s * 0.55}
          height={s * 0.55}
          rx={r}
          stroke="url(#logoGrad)"
          strokeWidth={strokeW}
          fill="none"
          transform={`rotate(-10 ${s / 2} ${s / 2})`}
        />
      ))}
    </svg>
  )
}
