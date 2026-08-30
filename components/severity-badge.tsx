import { cn } from '@/lib/utils'

type Level = 'low' | 'medium' | 'high' | 'critical'

const styles: Record<Level, string> = {
  low: 'border-[var(--sev-low)]/40 bg-[var(--sev-low)]/10 text-[var(--sev-low)]',
  medium: 'border-[var(--sev-medium)]/40 bg-[var(--sev-medium)]/10 text-[var(--sev-medium)]',
  high: 'border-[var(--sev-high)]/40 bg-[var(--sev-high)]/10 text-[var(--sev-high)]',
  critical: 'border-[var(--sev-critical)]/50 bg-[var(--sev-critical)]/15 text-[var(--sev-critical)]',
}

export function SeverityBadge({
  level,
  label,
  className,
}: {
  level: string
  label?: string
  className?: string
}) {
  const lvl: Level = level in styles ? (level as Level) : 'low'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wide',
        styles[lvl],
        className,
      )}
    >
      <span
        className="size-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {label ?? lvl}
    </span>
  )
}

export function riskToLevel(score: number): Level {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}
