import { cn } from '@/lib/utils'

type Level = 'low' | 'medium' | 'high' | 'critical'

const LEVEL_COLOR: Record<Level, string> = {
  low: 'var(--sev-low)',
  medium: 'var(--sev-medium)',
  high: 'var(--sev-high)',
  critical: 'var(--sev-critical)',
}

export function RiskMeter({
  score,
  level,
  size = 'md',
}: {
  score: number
  level: Level
  size?: 'sm' | 'md'
}) {
  const color = LEVEL_COLOR[level]
  const dim = size === 'sm' ? 64 : 88
  const stroke = size === 'sm' ? 6 : 8
  const r = (dim - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circ - (clamped / 100) * circ

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn('font-mono font-semibold', size === 'sm' ? 'text-base' : 'text-xl')}
            style={{ color }}
          >
            {clamped}
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk score</p>
        <p className="text-sm font-semibold capitalize" style={{ color }}>
          {level}
        </p>
      </div>
    </div>
  )
}
