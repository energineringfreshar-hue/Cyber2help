'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { EventType, RiskContext } from '@/lib/surveillance/rules'

export type FeedCamera = {
  id: number
  name: string
  location: string
  backdrop: string
  night: boolean
}

type Track = {
  id: number
  type: 'person' | 'vehicle'
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  crossed: boolean
  ttl: number
}

export type FeedEvent = {
  eventType: EventType
  context: RiskContext
  snapshot: string
  confidence: number
  label: string
}

let trackSeq = 1

export function CameraFeed({
  camera,
  offline,
  tamper,
  onEvent,
  registerInject,
}: {
  camera: FeedCamera
  offline?: boolean
  tamper?: boolean
  onEvent: (e: FeedEvent) => void
  registerInject?: (fn: (type: 'person' | 'vehicle') => void) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const tracksRef = useRef<Track[]>([])
  const rafRef = useRef<number>(0)
  const fenceRef = useRef(0.5)
  const draggingRef = useRef(false)
  const onEventRef = useRef(onEvent)
  const [fence, setFence] = useState(0.5)
  const [imgLoaded, setImgLoaded] = useState(false)

  onEventRef.current = onEvent

  // Load backdrop
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = camera.backdrop
    img.onload = () => {
      imgRef.current = img
      setImgLoaded(true)
    }
  }, [camera.backdrop])

  const spawnTrack = useCallback((type: 'person' | 'vehicle', crossing: boolean) => {
    const fromLeft = Math.random() > 0.5
    const w = type === 'vehicle' ? 88 : 30
    const h = type === 'vehicle' ? 54 : 68
    const speed = (type === 'vehicle' ? 1.4 : 0.7) * (crossing ? 1.3 : 1)
    tracksRef.current.push({
      id: trackSeq++,
      type,
      x: fromLeft ? -w : 1 + w / 640,
      y: 0.35 + Math.random() * 0.4,
      vx: (fromLeft ? 1 : -1) * speed * 0.0016,
      vy: (Math.random() - 0.5) * 0.0006,
      w,
      h,
      crossed: false,
      ttl: crossing ? 100000 : 6000 + Math.random() * 4000,
    })
  }, [])

  // Expose the inject function to the parent
  useEffect(() => {
    if (registerInject) registerInject((type) => spawnTrack(type, true))
  }, [registerInject, spawnTrack])

  // Ambient patrol traffic
  useEffect(() => {
    if (offline || tamper) return
    const iv = setInterval(() => {
      if (tracksRef.current.length < 3 && Math.random() > 0.4) {
        spawnTrack(Math.random() > 0.6 ? 'vehicle' : 'person', false)
      }
    }, 2600)
    return () => clearInterval(iv)
  }, [offline, tamper, spawnTrack])

  // Camera tamper event fires once when tamper toggles on
  useEffect(() => {
    if (tamper) {
      onEventRef.current({
        eventType: 'CAMERA_TAMPER',
        context: {},
        snapshot: '',
        confidence: 98,
        label: 'Feed obstructed / tampered',
      })
    }
  }, [tamper])

  useEffect(() => {
    if (offline) {
      onEventRef.current({
        eventType: 'CAMERA_OFFLINE',
        context: {},
        snapshot: '',
        confidence: 100,
        label: 'Signal lost',
      })
    }
  }, [offline])

  // Render + physics loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let last = performance.now()

    const draw = (now: number) => {
      const dt = Math.min(48, now - last)
      last = now
      const W = canvas.width
      const H = canvas.height

      // Backdrop
      if (imgRef.current) {
        ctx.drawImage(imgRef.current, 0, 0, W, H)
      } else {
        ctx.fillStyle = '#111417'
        ctx.fillRect(0, 0, W, H)
      }

      if (camera.night) {
        ctx.fillStyle = 'rgba(20,60,40,0.35)'
        ctx.fillRect(0, 0, W, H)
      }

      if (offline || tamper) {
        ctx.fillStyle = offline ? 'rgba(0,0,0,0.92)' : 'rgba(10,10,10,0.86)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#e5484d'
        ctx.font = '600 16px ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(offline ? 'NO SIGNAL' : 'CAMERA TAMPER DETECTED', W / 2, H / 2)
        ctx.textAlign = 'left'
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const fx = fenceRef.current
      // Virtual fence
      ctx.strokeStyle = 'rgba(245,190,80,0.9)'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.moveTo(fx * W, 0)
      ctx.lineTo(fx * W, H)
      ctx.stroke()
      ctx.setLineDash([])
      // Fence handle
      ctx.fillStyle = 'rgba(245,190,80,0.95)'
      ctx.fillRect(fx * W - 5, 4, 10, 14)

      // Update + draw tracks
      const tracks = tracksRef.current
      for (let i = tracks.length - 1; i >= 0; i--) {
        const t = tracks[i]
        const prevX = t.x
        t.x += t.vx * dt
        t.y += t.vy * dt
        t.ttl -= dt

        // fence crossing detection (center of box)
        const cross =
          (prevX < fx && t.x >= fx) || (prevX > fx && t.x <= fx)
        if (cross && !t.crossed) {
          t.crossed = true
          const snapshot = canvas.toDataURL('image/jpeg', 0.4)
          onEventRef.current({
            eventType: t.type === 'vehicle' ? 'VEHICLE_IN_RESTRICTED_ZONE' : 'VIRTUAL_FENCE_CROSSED',
            context: { isNight: camera.night, unknownSubject: true, personCount: 1 },
            snapshot,
            confidence: Math.round(82 + Math.random() * 15),
            label: `${t.type === 'vehicle' ? 'Vehicle' : 'Person'} crossed virtual fence`,
          })
        }

        if (t.x < -0.2 || t.x > 1.2 || t.ttl <= 0) {
          tracks.splice(i, 1)
          continue
        }

        const px = t.x * W
        const py = t.y * H
        const boxColor = t.crossed ? '#e5484d' : t.type === 'vehicle' ? '#7cc4ff' : '#5fd08a'
        ctx.strokeStyle = boxColor
        ctx.lineWidth = 2
        ctx.strokeRect(px - t.w / 2, py - t.h / 2, t.w, t.h)
        // label chip
        ctx.fillStyle = boxColor
        ctx.font = '600 10px ui-monospace, monospace'
        const label = `${t.type === 'vehicle' ? 'VEH' : 'PER'}-${String(t.id).padStart(3, '0')}`
        const tw = ctx.measureText(label).width + 8
        ctx.fillRect(px - t.w / 2, py - t.h / 2 - 14, tw, 13)
        ctx.fillStyle = '#0b0d10'
        ctx.fillText(label, px - t.w / 2 + 4, py - t.h / 2 - 4)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [camera.night, offline, tamper, imgLoaded])

  // Fence dragging
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fx = fenceRef.current * rect.width
    if (Math.abs(e.clientX - rect.left - fx) < 22) {
      draggingRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const f = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width))
    fenceRef.current = f
    setFence(f)
  }
  const onPointerUp = () => {
    draggingRef.current = false
  }

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-black">
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="aspect-video w-full cursor-ew-resize touch-none"
      />
      {/* HUD overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 text-[10px] font-mono">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded bg-black/60 px-1.5 py-0.5 text-white">
            <span
              className={cn(
                'size-1.5 rounded-full',
                offline ? 'bg-muted-foreground' : 'animate-pulse bg-[var(--sev-critical)]',
              )}
            />
            {offline ? 'OFFLINE' : 'REC'}
          </span>
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-white/80">
            {camera.night ? 'IR / NIGHT' : 'DAY'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="truncate rounded bg-black/60 px-1.5 py-0.5 text-white">
            {camera.name}
          </span>
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-primary">
            FENCE {Math.round(fence * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
