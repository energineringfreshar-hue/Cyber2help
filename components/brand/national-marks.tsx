import { cn } from '@/lib/utils'

/** Stylised Indian tricolour with the Ashoka Chakra. Representational, not an official asset. */
export function IndiaFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 24"
      className={cn('h-4 w-6 rounded-[2px] shadow-sm', className)}
      role="img"
      aria-label="Flag of India"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="36" height="8" y="0" fill="var(--india-saffron)" />
      <rect width="36" height="8" y="8" fill="oklch(0.98 0.01 90)" />
      <rect width="36" height="8" y="16" fill="var(--india-green)" />
      <g stroke="oklch(0.38 0.09 265)" strokeWidth="0.5" fill="none">
        <circle cx="18" cy="12" r="3" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i * Math.PI) / 12
          return (
            <line key={i} x1="18" y1="12" x2={18 + Math.cos(a) * 3} y2={12 + Math.sin(a) * 3} strokeWidth="0.3" />
          )
        })}
      </g>
    </svg>
  )
}

/** Stylised state-emblem mark (lion-capital silhouette abstraction). Representational, not an official asset. */
export function EmblemMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('h-6 w-6', className)}
      role="img"
      aria-label="Emblem of India"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="var(--india-saffron)">
        {/* three lion heads */}
        <circle cx="16" cy="8" r="4" />
        <circle cx="8" cy="10" r="3.2" />
        <circle cx="24" cy="10" r="3.2" />
        {/* abacus */}
        <rect x="7" y="15" width="18" height="2.4" rx="1" />
        {/* pillar */}
        <rect x="13.5" y="17.4" width="5" height="9" rx="1" />
      </g>
      <g stroke="var(--india-saffron)" strokeWidth="1" fill="none">
        <circle cx="16" cy="28" r="2.4" />
      </g>
    </svg>
  )
}
