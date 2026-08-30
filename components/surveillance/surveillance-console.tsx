'use client'

import { useCallback, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SeverityBadge } from '@/components/severity-badge'
import { CameraFeed, type FeedCamera, type FeedEvent } from './camera-feed'
import { ingestEvent } from '@/app/(app)/actions/surveillance'
import { EVENT_LABELS, scoreEvent } from '@/lib/surveillance/rules'
import { toast } from 'sonner'
import { UserPlus, Car, PowerOff, Power, ShieldAlert, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format-time'

type LiveEvent = FeedEvent & { id: string; cameraName: string; severity: string; at: Date }

export function SurveillanceConsole({ cameras }: { cameras: FeedCamera[] }) {
  const [feed, setFeed] = useState<LiveEvent[]>([])
  const [offline, setOffline] = useState<Record<number, boolean>>({})
  const [tamper, setTamper] = useState<Record<number, boolean>>({})
  const injectFns = useRef<Record<number, (type: 'person' | 'vehicle') => void>>({})

  const handleEvent = useCallback(
    async (cam: FeedCamera, e: FeedEvent) => {
      const { severity } = scoreEvent(e.eventType, e.context)
      const live: LiveEvent = {
        ...e,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        cameraName: cam.name,
        severity,
        at: new Date(),
      }
      setFeed((prev) => [live, ...prev].slice(0, 40))

      if (severity === 'high' || severity === 'critical') {
        toast.error(`${EVENT_LABELS[e.eventType]} — ${cam.name}`, {
          description: `Severity ${severity.toUpperCase()} · confidence ${e.confidence}%`,
        })
      }

      try {
        await ingestEvent({
          cameraId: cam.id,
          cameraName: cam.name,
          location: cam.location,
          eventType: e.eventType,
          confidence: e.confidence,
          snapshot: e.snapshot || undefined,
          context: e.context,
          metadata: { label: e.label },
        })
      } catch {
        // Non-fatal in the demo; the live feed already reflects the event.
      }
    },
    [],
  )

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {cameras.map((cam) => (
          <Card key={cam.id} className="overflow-hidden">
            <CardContent className="p-3">
              <CameraFeed
                camera={cam}
                offline={offline[cam.id]}
                tamper={tamper[cam.id]}
                onEvent={(e) => handleEvent(cam, e)}
                registerInject={(fn) => {
                  injectFns.current[cam.id] = fn
                }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-auto text-xs text-muted-foreground">{cam.location}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={offline[cam.id] || tamper[cam.id]}
                  onClick={() => injectFns.current[cam.id]?.('person')}
                >
                  <UserPlus className="size-3" /> Person
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={offline[cam.id] || tamper[cam.id]}
                  onClick={() => injectFns.current[cam.id]?.('vehicle')}
                >
                  <Car className="size-3" /> Vehicle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn('h-7 gap-1 px-2 text-xs', tamper[cam.id] && 'border-destructive text-destructive')}
                  onClick={() => setTamper((p) => ({ ...p, [cam.id]: !p[cam.id] }))}
                >
                  <ShieldAlert className="size-3" /> Tamper
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setOffline((p) => ({ ...p, [cam.id]: !p[cam.id] }))}
                >
                  {offline[cam.id] ? <Power className="size-3" /> : <PowerOff className="size-3" />}
                  {offline[cam.id] ? 'Restore' : 'Offline'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex max-h-[640px] flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="size-4 text-primary" /> Live Event Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-[560px] px-4 pb-4">
            {feed.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Drag the amber virtual fence, then inject a person or vehicle to trigger a detection.
              </p>
            ) : (
              <ul className="space-y-2">
                {feed.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-2.5"
                  >
                    {e.snapshot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.snapshot || '/placeholder.svg'}
                        alt="Event snapshot"
                        className="size-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                        <ShieldAlert className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {EVENT_LABELS[e.eventType]}
                        </span>
                        <SeverityBadge level={e.severity as never} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.cameraName} · {formatTime(e.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
