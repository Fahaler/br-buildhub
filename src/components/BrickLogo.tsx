import { useId } from 'react'

type Props = {
  /** Tailwind-классы размера, напр. "h-9 w-9" */
  className?: string
  /** Рамка-плашка вокруг кирпичика (как у favicon). false — только кирпичик. */
  framed?: boolean
  /** Мигающий зелёный огонёк (как cs-led). */
  pulse?: boolean
  title?: string
}

/** Логотип BR BuildHub — янтарный кирпичик с зелёным огоньком. */
export default function BrickLogo({ className = 'h-9 w-9', framed = true, pulse = false, title = 'BR BuildHub' }: Props) {
  const gid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      {framed && (
        <>
          <defs>
            <radialGradient id={`bl-${gid}`} cx="50%" cy="35%" r="75%">
              <stop offset="0" stopColor="#201d19" />
              <stop offset="1" stopColor="#0f0e0c" />
            </radialGradient>
          </defs>
          <rect x="8" y="8" width="496" height="496" rx="112" fill={`url(#bl-${gid})`} stroke="#2c2823" strokeWidth="12" />
        </>
      )}
      {[150, 284].map((x) => (
        <g key={x}>
          <rect x={x} y="172" width="78" height="52" rx="10" fill="#ffb000" />
          <rect x={x} y="172" width="78" height="14" rx="7" fill="#ffc94a" />
        </g>
      ))}
      <rect x="96" y="212" width="320" height="170" rx="18" fill="#ffb000" />
      <rect x="96" y="212" width="320" height="22" rx="11" fill="#ffc94a" />
      <rect x="96" y="340" width="320" height="42" rx="18" fill="#b97f00" />
      <rect x="96" y="330" width="320" height="20" fill="#b97f00" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={140 + i * 82} y="268" width="66" height="22" rx="11" fill="#0f0e0c" opacity=".88" />
      ))}
      <circle cx="408" cy="108" r="44" fill="none" stroke="#7bc96f" strokeWidth="8" opacity=".35" />
      <circle cx="408" cy="108" r="30" fill="#7bc96f" className={pulse ? 'animate-pulse' : undefined} />
    </svg>
  )
}
