import { PageHeader } from '@/components/page-header'
import { LedgerView } from '@/components/audit/ledger-view'
import { getLedger } from '@/app/(app)/actions/audit'
import { requireUser } from '@/lib/session'
import { can } from '@/lib/rbac'
import { redirect } from 'next/navigation'

export default async function AuditPage() {
  const user = await requireUser()
  if (!can(user.role, 'audit.view')) redirect('/dashboard')
  const rows = await getLedger(200)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrity & Audit Ledger"
        description="Hash-chained, tamper-evident record of screening decisions, alerts, and camera changes. Modifying any record breaks the chain."
      />
      <LedgerView rows={rows} />
    </div>
  )
}
