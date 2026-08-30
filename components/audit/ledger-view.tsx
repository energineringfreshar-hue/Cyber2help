'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { runIntegrityCheck } from '@/app/(app)/actions/audit'
import { toast } from 'sonner'
import { ShieldCheck, ShieldAlert, Link2, Loader2 } from 'lucide-react'
import { formatDateTime } from '@/lib/format-time'

type LedgerRow = {
  id: number
  actorEmail: string | null
  actorRole: string | null
  action: string
  entityType: string | null
  entityId: string | null
  dataHash: string
  prevHash: string
  createdAt: Date | string
}

type VerifyResult = {
  total: number
  valid: boolean
  brokenAt: number | null
  results: { id: number; hashOk: boolean; linkOk: boolean; valid: boolean }[]
}

const GENESIS = '0'.repeat(64)

export function LedgerView({ rows }: { rows: LedgerRow[] }) {
  const [verify, setVerify] = useState<VerifyResult | null>(null)
  const [pending, startTransition] = useTransition()

  function check() {
    startTransition(async () => {
      try {
        const r = await runIntegrityCheck()
        setVerify(r)
        if (r.valid) toast.success(`Chain intact — ${r.total} records verified`)
        else toast.error(`Integrity broken at record #${r.brokenAt}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Verification failed')
      }
    })
  }

  const statusOf = (id: number) => verify?.results.find((r) => r.id === id)

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Chain integrity</span>
          <span className="text-xs text-muted-foreground">
            Recompute every SHA-256 record hash and verify the previous-hash links.
          </span>
        </div>
        <div className="flex items-center gap-3">
          {verify &&
            (verify.valid ? (
              <Badge className="gap-1 bg-[var(--sev-low)] text-black hover:bg-[var(--sev-low)]">
                <ShieldCheck className="size-3.5" /> Verified intact
              </Badge>
            ) : (
              <Badge className="gap-1 bg-[var(--sev-critical)] text-white hover:bg-[var(--sev-critical)]">
                <ShieldAlert className="size-3.5" /> Broken @ #{verify.brokenAt}
              </Badge>
            ))}
          <Button onClick={check} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Verify chain
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        {rows.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Link2 className="size-8 opacity-40" />
            <p className="text-sm">
              No ledger entries yet. Screen a document or raise an alert to append tamper-evident records.
            </p>
          </Card>
        )}
        {rows.map((r) => {
          const s = statusOf(r.id)
          return (
            <Card key={r.id} className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">#{r.id}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {r.action}
                  </Badge>
                  {r.entityType && (
                    <span className="text-xs text-muted-foreground">
                      {r.entityType}
                      {r.entityId ? ` #${r.entityId}` : ''}
                    </span>
                  )}
                  {s && (
                    <Badge
                      className={
                        s.valid
                          ? 'bg-[var(--sev-low)] text-black hover:bg-[var(--sev-low)]'
                          : 'bg-[var(--sev-critical)] text-white hover:bg-[var(--sev-critical)]'
                      }
                    >
                      {s.valid ? 'valid' : 'tampered'}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(r.createdAt)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.actorEmail ?? 'system'}
                {r.actorRole ? ` · ${r.actorRole}` : ''}
              </div>
              <div className="grid gap-1 rounded-md bg-secondary/60 p-2 font-mono text-[11px] leading-relaxed">
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-muted-foreground">prev</span>
                  <span className="truncate text-muted-foreground">
                    {r.prevHash === GENESIS ? 'GENESIS' : r.prevHash}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-primary">hash</span>
                  <span className="truncate">{r.dataHash}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
