'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ingestAnpr } from '@/app/(app)/actions/surveillance'
import { toast } from 'sonner'
import { Camera, ScanLine, Search } from 'lucide-react'
import { formatDateTime } from '@/lib/format-time'

type AnprRow = {
  id: number
  cameraName: string | null
  plate: string
  known: boolean
  watchlisted: boolean
  confidence: number | null
  createdAt: Date | string
}

// A small demo watchlist so the "known / unknown / watchlisted" comparison is real.
const WATCHLIST = new Set(['DL3CAB1234', 'MH12XY9999', 'UP16BADFEED'])
const KNOWN = new Set(['DL8CAF4455', 'HR26DK8337', 'KA05MJ2011'])

function classify(plate: string) {
  const p = plate.toUpperCase().replace(/\s/g, '')
  if (WATCHLIST.has(p)) return { known: false, watchlisted: true }
  if (KNOWN.has(p)) return { known: true, watchlisted: false }
  return { known: false, watchlisted: false }
}

export function AnprPanel({ initialReads }: { initialReads: AnprRow[] }) {
  const [reads, setReads] = useState(initialReads)
  const [plate, setPlate] = useState('')
  const [query, setQuery] = useState('')
  const [pending, startTransition] = useTransition()

  function scan(value: string) {
    const p = value.toUpperCase().replace(/\s/g, '')
    if (!p) return
    const { known, watchlisted } = classify(p)
    const confidence = 82 + Math.floor(Math.random() * 16)
    startTransition(async () => {
      try {
        const { id } = await ingestAnpr({
          cameraName: 'Gate Cam 01',
          plate: p,
          known,
          watchlisted,
          confidence,
        })
        setReads((prev) => [
          {
            id,
            cameraName: 'Gate Cam 01',
            plate: p,
            known,
            watchlisted,
            confidence,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])
        setPlate('')
        if (watchlisted) toast.error(`WATCHLIST HIT: ${p} — high-risk alert raised`)
        else if (known) toast.success(`${p} recognised (known vehicle)`)
        else toast.warning(`${p} logged as unknown plate`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Scan failed')
      }
    })
  }

  const randomPlates = ['DL3CAB1234', 'DL8CAF4455', 'RJ14QQ7788', 'MH12XY9999']

  const filtered = reads.filter((r) =>
    query ? r.plate.toLowerCase().includes(query.toLowerCase()) : true,
  )

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ScanLine className="size-4 text-primary" />
          Plate scan
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) scan(plate)
            }}
            placeholder="Enter plate e.g. DL3CAB1234"
            className="font-mono uppercase"
          />
          <Button disabled={pending || !plate} onClick={() => scan(plate)}>
            <Camera className="size-4" /> Scan
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Quick demo plates:</span>
          {randomPlates.map((p) => (
            <button
              key={p}
              onClick={() => scan(p)}
              disabled={pending}
              className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-xs transition-colors hover:border-primary"
            >
              {p}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ScanLine className="size-4 text-primary" />
            Read history
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plate..."
              className="pl-8 font-mono"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Camera</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No plate reads yet. Scan a plate above.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-medium">{r.plate}</TableCell>
                  <TableCell>
                    {r.watchlisted ? (
                      <Badge className="bg-[var(--sev-critical)] text-white hover:bg-[var(--sev-critical)]">
                        Watchlisted
                      </Badge>
                    ) : r.known ? (
                      <Badge className="bg-[var(--sev-low)] text-black hover:bg-[var(--sev-low)]">
                        Known
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[var(--sev-medium)]">
                        Unknown
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.cameraName ?? '—'}</TableCell>
                  <TableCell className="font-mono">{r.confidence != null ? `${r.confidence}%` : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
