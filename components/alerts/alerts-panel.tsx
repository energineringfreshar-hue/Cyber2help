'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SeverityBadge } from '@/components/severity-badge'
import { acknowledgeEvent } from '@/app/(app)/actions/surveillance'
import { toast } from 'sonner'
import { Check, MapPin, Search, ShieldAlert } from 'lucide-react'
import { EVENT_LABELS } from '@/lib/surveillance/rules'

type EventRow = {
  id: number
  cameraName: string | null
  location: string | null
  eventType: string
  severity: string
  riskScore: number
  confidence: number | null
  acknowledged: boolean
  acknowledgedBy: string | null
  createdAt: Date | string
}

export function AlertsPanel({
  initialEvents,
  canAck,
}: {
  initialEvents: EventRow[]
  canAck: boolean
}) {
  const [events, setEvents] = useState(initialEvents)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'critical'>('all')
  const [pending, startTransition] = useTransition()

  function ack(id: number) {
    startTransition(async () => {
      try {
        await acknowledgeEvent(id)
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, acknowledged: true } : e)),
        )
        toast.success('Alert acknowledged and recorded to the audit ledger')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to acknowledge')
      }
    })
  }

  const filtered = events.filter((e) => {
    if (filter === 'active' && e.acknowledged) return false
    if (filter === 'critical' && e.severity !== 'critical') return false
    const q = query.toLowerCase()
    if (!q) return true
    return (
      (e.cameraName ?? '').toLowerCase().includes(q) ||
      (e.location ?? '').toLowerCase().includes(q) ||
      e.eventType.toLowerCase().includes(q)
    )
  })

  const activeCount = events.filter((e) => !e.acknowledged).length
  const criticalCount = events.filter((e) => e.severity === 'critical' && !e.acknowledged).length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total events" value={events.length} />
        <StatCard label="Unacknowledged" value={activeCount} tone="high" />
        <StatCard label="Critical open" value={criticalCount} tone="critical" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search camera, location, type..."
            className="pl-8"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'critical'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <ShieldAlert className="size-8 opacity-40" />
            <p className="text-sm">No alerts match the current filter.</p>
          </Card>
        )}
        {filtered.map((e) => (
          <Card
            key={e.id}
            className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
              e.acknowledged ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <SeverityBadge level={e.severity} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium leading-tight">
                  {EVENT_LABELS[e.eventType as keyof typeof EVENT_LABELS] ?? e.eventType}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {e.cameraName ?? 'Unknown camera'}
                    {e.location ? ` — ${e.location}` : ''}
                  </span>
                  <span className="font-mono">risk {e.riskScore}</span>
                  {e.confidence != null && <span>conf {e.confidence}%</span>}
                  <span>{new Date(e.createdAt).toLocaleString()}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              {e.acknowledged ? (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Check className="size-3" /> Acknowledged
                </Badge>
              ) : canAck ? (
                <Button size="sm" disabled={pending} onClick={() => ack(e.id)}>
                  Acknowledge
                </Button>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  View only
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'high' | 'critical'
}) {
  const color =
    tone === 'critical'
      ? 'text-[var(--sev-critical)]'
      : tone === 'high'
        ? 'text-[var(--sev-high)]'
        : 'text-foreground'
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`font-mono text-3xl font-semibold ${color}`}>{value}</span>
    </Card>
  )
}
