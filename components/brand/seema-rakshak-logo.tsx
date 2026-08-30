import { cn } from '@/lib/utils'

/**
 * Redesigned Seema Rakshak emblem: a shield combining an Ashoka-Chakra wheel
 * with radar sweep waves, rendered in the national saffron-white-green palette.
 * Pure SVG so it stays crisp at any size.
 */
export function SeemaRakshakLogo({
  className,
  title = 'Seema Rakshak emblem',
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-9 w-9', className)}
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sr-tricolor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--india-saffron)" />
          <stop offset="50%" stopColor="oklch(0.98 0.01 90)" />
          <stop offset="100%" stopColor="var(--india-green)" />
        </linearGradient>
        <linearGradient id="sr-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.85 0.14 85)" />
          <stop offset="100%" stopColor="oklch(0.65 0.15 60)" />
        </linearGradient>
      </defs>

      {/* Shield body */}
      <path
        d="M32 3 L57 12 V30 C57 45 46 56 32 61 C18 56 7 45 7 30 V12 Z"
        fill="oklch(0.16 0.03 258)"
        stroke="url(#sr-tricolor)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Radar sweep arcs */}
      <path d="M32 44 A12 12 0 0 1 20 32" stroke="var(--india-green)" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M32 48 A16 16 0 0 1 16 32" stroke="var(--india-saffron)" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />

      {/* Ashoka chakra */}
      <g stroke="url(#sr-gold)" strokeWidth="1.4">
        <circle cx="32" cy="27" r="10" fill="none" />
        <circle cx="32" cy="27" r="2.2" fill="url(#sr-gold)" stroke="none" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6
          return (
            <line
              key={i}
              x1={32 + Math.cos(a) * 2.4}
              y1={27 + Math.sin(a) * 2.4}
              x2={32 + Math.cos(a) * 9.4}
              y2={27 + Math.sin(a) * 9.4}
              strokeWidth="0.9"
            />
          )
        })}
      </g>
    </svg>
  )
}
