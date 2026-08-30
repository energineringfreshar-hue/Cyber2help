import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SeverityBadge } from '@/components/severity-badge'
import { getDashboardData } from '@/app/(app)/actions/dashboard'
import { requireUser } from '@/lib/session'
import { ROLE_LABELS } from '@/lib/rbac'
import { EVENT_LABELS } from '@/lib/surveillance/rules'
import Link from 'next/link'
import {
  FileSearch,
  ShieldAlert,
  Video,
  ScanLine,
  ArrowRight,
  TriangleAlert,
} from 'lucide-react'

export default async function DashboardPage() {
  const user = await requireUser()
  const { stats, severityCounts, recentEvents, recentDocs } = await getDashboardData()

  const totalSev = Math.max(
    1,
    severityCounts.low + severityCounts.medium + severityCounts.high + severityCounts.critical,
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Command Center`}
        description={`Signed in as ${user.name} · ${ROLE_LABELS[user.role]}. Unified identity screening and border surveillance overview.`}
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Documents screened"
          value={stats.docsScreened}
          sub={`${stats.highRiskDocs} high-risk`}
          icon={<FileSearch className="size-5" />}
          href="/documents"
        />
        <Kpi
          label="Open alerts"
          value={stats.openAlerts}
          sub={`${stats.criticalAlerts} critical`}
          tone={stats.criticalAlerts > 0 ? 'critical' : undefined}
          icon={<ShieldAlert className="size-5" />}
          href="/alerts"
        />
        <Kpi
          label="Cameras online"
          value={`${stats.camerasOnline}/${stats.camerasTotal}`}
          sub="live feeds"
          icon={<Video className="size-5" />}
          href="/surveillance"
        />
        <Kpi
          label="Plate reads"
          value={stats.plateReads}
          sub={`${stats.watchlistHits} watchlist hits`}
          tone={stats.watchlistHits > 0 ? 'high' : undefined}
          icon={<ScanLine className="size-5" />}
          href="/anpr"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Event severity breakdown */}
        <Card className="flex flex-col gap-4 p-5 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Event severity</span>
            <span className="font-mono text-xs text-muted-foreground">{stats.totalEvents} total</span>
          </div>
          <div className="flex flex-col gap-3">
            {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
              const count = severityCounts[sev]
              const pct = Math.round((count / totalSev) * 100)
              return (
                <div key={sev} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{sev}</span>
                    <span className="font-mono">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: `var(--sev-${sev})` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-auto flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            <TriangleAlert className="size-4 shrink-0 text-primary" />
            {stats.ledgerRecords} tamper-evident records in the audit ledger.
          </div>
        </Card>

        {/* Recent alerts */}
        <Card className="flex flex-col gap-3 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Recent alerts</span>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={
                <Link href="/alerts">
                  View all <ArrowRight className="size-3.5" />
                </Link>
              }
            />
          </div>
          <div className="flex flex-col divide-y divide-border">
            {recentEvents.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No events yet. Open the surveillance console and cross the virtual fence to generate one.
              </p>
            )}
            {recentEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-3">
                  <SeverityBadge level={e.severity} />
                  <div className="flex flex-col">
                    <span className="text-sm leading-tight">
                      {EVENT_LABELS[e.eventType as keyof typeof EVENT_LABELS] ?? e.eventType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {e.cameraName ?? 'Unknown camera'} · {new Date(e.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground">risk {e.riskScore}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent screenings */}
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Recent document screenings</span>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <Link href="/documents">
                Screen a document <ArrowRight className="size-3.5" />
              </Link>
            }
          />
        </div>
        {recentDocs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No documents screened yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {recentDocs.map((d) => {
              const extracted = (d.extracted ?? {}) as { name?: string | null }
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex flex-col">
                    <span className="text-sm capitalize leading-tight">
                      {extracted.name ?? `${d.docType} document`}
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {d.docType} · {new Date(d.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">score {d.riskScore}</span>
                    <SeverityBadge level={d.riskLevel} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  icon,
  href,
  tone,
}: {
  label: string
  value: number | string
  sub: string
  icon: React.ReactNode
  href: string
  tone?: 'high' | 'critical'
}) {
  const valueColor =
    tone === 'critical'
      ? 'text-[var(--sev-critical)]'
      : tone === 'high'
        ? 'text-[var(--sev-high)]'
        : 'text-foreground'
  return (
    <Link href={href}>
      <Card className="flex h-full flex-col gap-2 p-4 transition-colors hover:border-primary/50">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs uppercase tracking-wide">{label}</span>
          <span className="text-primary">{icon}</span>
        </div>
        <span className={`font-mono text-3xl font-semibold ${valueColor}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </Card>
    </Link>
  )
}
