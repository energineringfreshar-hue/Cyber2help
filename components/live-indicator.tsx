'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Connection-status pill for real-time (polled) views.
 * Shows a pulsing green dot when live, amber when refreshing/stale, and a
 * "last updated" relative timestamp that ticks every second.
 */
export function LiveIndicator({
  isLive,
  isValidating,
  updatedAt,
  className,
}: {
  isLive: boolean
  isValidating?: boolean
  updatedAt: number | null
  className?: string
}) {
  const [, force] = useState(0)

  // Re-render every second so the relative timestamp stays current.
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const ago = relativeTime(updatedAt)
  const tone = !isLive
    ? 'bg-[var(--sev-critical)]'
    : isValidating
      ? 'bg-[var(--sev-medium)]'
      : 'bg-[var(--india-green)]'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-2.5 py-1',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-2">
        {isLive && !isValidating && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--india-green)] opacity-70" />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', tone)} />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {!isLive ? 'Reconnecting' : isValidating ? 'Syncing' : 'Live'}
        {updatedAt ? ` · ${ago}` : ''}
      </span>
    </div>
  )
}

function relativeTime(ts: number | null) {
  if (!ts) return ''
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (secs < 5) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}
