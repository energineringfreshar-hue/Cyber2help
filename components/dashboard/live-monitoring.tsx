'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { reportAerialIncursion } from '@/app/(app)/actions/surveillance'
import { toast } from 'sonner'
import { Radar, Satellite, RadioTower, Cctv, Plane, TriangleAlert, Waves } from 'lucide-react'

type Status = 'active' | 'warning' | 'critical'

type Asset = {
  id: string
  label: string
  kind: 'radar' | 'sensor' | 'satellite' | 'relay' | 'camera'
  // position as percentage of the square viewport (0-100)
  x: number
  y: number
  status: Status
  detail: string
}

// Static border-surveillance assets around the central radar station (50,50).
const ASSETS: Asset[] = [
  { id: 'RADAR-01', label: 'Radar Station Alpha', kind: 'radar', x: 50, y: 50, status: 'active', detail: 'Primary S-band · 75 km range' },
  { id: 'RADAR-02', label: 'Radar Station Bravo', kind: 'radar', x: 27, y: 38, status: 'active', detail: 'Secondary · sector NW' },
  { id: 'SAT-01', label: 'Satellite Uplink', kind: 'satellite', x: 50, y: 11, status: 'active', detail: 'GEO downlink · 99.2% link' },
  { id: 'RELAY-01', label: 'Comm Relay', kind: 'relay', x: 82, y: 44, status: 'active', detail: 'Encrypted mesh · 4 nodes' },
  { id: 'SEN-01', label: 'Ground Sensor S1', kind: 'sensor', x: 68, y: 64, status: 'active', detail: 'Seismic + PIR · nominal' },
  { id: 'SEN-02', label: 'Ground Sensor S2', kind: 'sensor', x: 61, y: 28, status: 'warning', detail: 'Battery 21% · service due' },
  { id: 'SEN-03', label: 'Ground Sensor S3', kind: 'sensor', x: 37, y: 71, status: 'active', detail: 'Seismic · nominal' },
  { id: 'CAM-07', label: 'Watchtower Cam 07', kind: 'camera', x: 21, y: 63, status: 'critical', detail: 'Tamper signal · offline 2m' },
]

const ZONE_30 = 22 // % radius = 30 km monitoring zone
const RANGE_75 = 44 // % radius = 75 km max radar range

const STATUS_COLOR: Record<Status, string> = {
  active: 'var(--india-green)',
  warning: 'var(--sev-high)',
  critical: 'var(--sev-critical)',
}

function KindIcon({ kind, className }: { kind: Asset['kind']; className?: string }) {
  const cn = className ?? 'size-3.5'
  if (kind === 'radar') return <Radar className={cn} />
  if (kind === 'satellite') return <Satellite className={cn} />
  if (kind === 'relay') return <RadioTower className={cn} />
  if (kind === 'camera') return <Cctv className={cn} />
  return <Waves className={cn} />
}

type Incursion = { id: number; time: string; bearing: number; rangeKm: number }

export function LiveMonitoring() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [drone, setDrone] = useState({ x: 50, y: 6, inZone: false })
  const [incursions, setIncursions] = useState<Incursion[]>([])

  // rAF animation state kept in refs to avoid stale closures.
  const tRef = useRef(0)
  const insideRef = useRef(false)
  const lastFireRef = useRef(0)
  const seqRef = useRef(0)

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      tRef.current += dt

      const t = tRef.current
      const angle = t * 0.4 // radians, slow orbit
      const radius = 27 + 16 * Math.sin(t * 0.6) // oscillates 11..43 (crosses ZONE_30)
      const x = 50 + radius * Math.cos(angle)
      const y = 50 - radius * Math.sin(angle)
      const inZone = radius < ZONE_30

      setDrone({ x, y, inZone })

      // Fire a real alert on an outside -> inside transition, throttled.
      if (inZone && !insideRef.current && now - lastFireRef.current > 14000) {
        insideRef.current = true
        lastFireRef.current = now
        const bearing = ((angle * 180) / Math.PI) % 360
        const rangeKm = (radius / RANGE_75) * 75
        const posBearing = (bearing + 360) % 360
        void triggerIncursion(posBearing, rangeKm)
      }
      if (!inZone) insideRef.current = false

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function triggerIncursion(bearing: number, rangeKm: number) {
    const localId = ++seqRef.current
    const droneId = `UAV-${String(localId).padStart(3, '0')}`
    setIncursions((prev) =>
      [{ id: localId, time: new Date().toLocaleTimeString(), bearing, rangeKm }, ...prev].slice(0, 4),
    )
    toast.error(`Unusual flight pattern detected — ${droneId}`, {
      description: `Crossed 30 km monitoring zone · bearing ${Math.round(bearing)}° · ${rangeKm.toFixed(0)} km`,
    })
    try {
      await reportAerialIncursion({ droneId, bearing, rangeKm })
    } catch {
      // Non-fatal: the visual alert still stands even if persistence fails.
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-primary" />
          <span className="text-sm font-medium">Live Monitoring</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--india-green)]" />
          Radar online
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* Radar tactical display */}
        <div className="relative mx-auto aspect-square w-full max-w-md select-none">
          {/* Static geometry */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <defs>
              <radialGradient id="lm-bg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="oklch(0.24 0.05 200)" />
                <stop offset="100%" stopColor="oklch(0.13 0.03 258)" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#lm-bg)" stroke="var(--border)" strokeWidth="0.4" />
            {/* range rings */}
            <circle cx="50" cy="50" r={RANGE_75} fill="none" stroke="var(--india-green)" strokeWidth="0.4" strokeDasharray="1.5 1.5" opacity="0.55" />
            <circle cx="50" cy="50" r={ZONE_30} fill="none" stroke="var(--india-saffron)" strokeWidth="0.4" strokeDasharray="1.5 1.5" opacity="0.7" />
            <circle cx="50" cy="50" r="10" fill="none" stroke="var(--border)" strokeWidth="0.3" />
            {/* crosshair + bearing ticks */}
            <line x1="50" y1="2" x2="50" y2="98" stroke="var(--border)" strokeWidth="0.3" opacity="0.6" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="var(--border)" strokeWidth="0.3" opacity="0.6" />
            <text x="50.8" y="7.5" fontSize="2.6" fill="var(--muted-foreground)" fontFamily="monospace">N</text>
            {/* range labels */}
            <text x="50.8" y={50 - ZONE_30 + 2.6} fontSize="2.3" fill="var(--india-saffron)" fontFamily="monospace">30 km zone</text>
            <text x="50.8" y={50 - RANGE_75 + 2.6} fontSize="2.3" fill="var(--india-green)" fontFamily="monospace">75 km max</text>
          </svg>

          {/* Rotating sweep */}
          <div
            aria-hidden="true"
            className="radar-sweep absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, oklch(0.75 0.16 145 / 0.35), transparent 40deg, transparent 360deg)',
              WebkitMaskImage: 'radial-gradient(circle, black 96%, transparent 96%)',
              maskImage: 'radial-gradient(circle, black 96%, transparent 96%)',
            }}
          />
          {/* Expanding pulse rings from centre */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="radar-ping absolute size-full rounded-full border border-[var(--india-green)]/40" />
            <div className="radar-ping absolute size-full rounded-full border border-[var(--india-green)]/40" style={{ animationDelay: '2s' }} />
          </div>

          {/* Asset markers */}
          {ASSETS.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseEnter={() => setHovered(a.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(a.id)}
              onBlur={() => setHovered(null)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none"
              style={{ left: `${a.x}%`, top: `${a.y}%` }}
              aria-label={`${a.label}: ${a.status}`}
            >
              <span
                className="flex size-6 items-center justify-center rounded-full border bg-card/80 text-foreground shadow-md backdrop-blur-sm"
                style={{ borderColor: STATUS_COLOR[a.status] }}
              >
                <KindIcon kind={a.kind} />
              </span>
              <span
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-card"
                style={{ backgroundColor: STATUS_COLOR[a.status] }}
              />
              {hovered === a.id && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 w-40 -translate-x-1/2 rounded-md border border-border bg-popover p-2 text-left text-[11px] shadow-xl">
                  <span className="block font-medium text-popover-foreground">{a.label}</span>
                  <span className="block capitalize" style={{ color: STATUS_COLOR[a.status] }}>
                    {a.status}
                  </span>
                  <span className="block text-muted-foreground">{a.detail}</span>
                </span>
              )}
            </button>
          ))}

          {/* Tracked drone */}
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-none"
            style={{ left: `${drone.x}%`, top: `${drone.y}%` }}
          >
            <span
              className="flex size-6 items-center justify-center rounded-full border shadow-lg"
              style={{
                borderColor: drone.inZone ? 'var(--sev-critical)' : 'var(--muted-foreground)',
                background: drone.inZone ? 'oklch(0.6 0.22 25 / 0.25)' : 'var(--card)',
                boxShadow: drone.inZone ? '0 0 12px oklch(0.6 0.22 25 / 0.7)' : undefined,
              }}
            >
              <Plane
                className="size-3.5"
                style={{ color: drone.inZone ? 'var(--sev-critical)' : 'var(--foreground)' }}
              />
            </span>
          </div>
        </div>

        {/* Side status column */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-md border border-border bg-secondary/30 p-3">
            <span className="text-xs font-medium text-muted-foreground">Asset status</span>
            <ul className="flex flex-col gap-1.5">
              {ASSETS.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-xs">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[a.status] }} />
                  <span className="flex-1 truncate text-foreground">{a.label}</span>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{a.kind}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border bg-secondary/30 p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TriangleAlert className="size-3.5 text-[var(--sev-critical)]" />
              Aerial incursions
            </span>
            {incursions.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Tracking UAV. An alert fires when it crosses the 30 km monitoring zone.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {incursions.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-[var(--sev-critical)]">Zone breach</span>
                    <span className="font-mono text-muted-foreground">
                      {Math.round(i.bearing)}° · {i.rangeKm.toFixed(0)}km · {i.time}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--india-green)]" /> Active
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--sev-high)]" /> Warning
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--sev-critical)]" /> Critical
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
