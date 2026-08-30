import { PageHeader } from '@/components/page-header'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { getDashboardData } from '@/app/(app)/actions/dashboard'
import { requireUser } from '@/lib/session'
import { ROLE_LABELS } from '@/lib/rbac'

export default async function DashboardPage() {
  const user = await requireUser()
  const data = await getDashboardData()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Command Center"
        description={`Signed in as ${user.name} · ${ROLE_LABELS[user.role]}. Seema Rakshak unified identity screening and border surveillance overview.`}
      />
      <DashboardView initialData={data} />
    </div>
  )
}
