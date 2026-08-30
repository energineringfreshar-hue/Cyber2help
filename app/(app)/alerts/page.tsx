import { PageHeader } from '@/components/page-header'
import { AlertsPanel } from '@/components/alerts/alerts-panel'
import { getEvents } from '@/app/(app)/actions/surveillance'
import { requireUser } from '@/lib/session'
import { can } from '@/lib/rbac'

export default async function AlertsPage() {
  const user = await requireUser()
  const events = await getEvents(200)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts"
        description="Risk-scored surveillance events. Acknowledgements are written to the tamper-evident audit ledger."
      />
      <AlertsPanel initialEvents={events} canAck={can(user.role, 'events.acknowledge')} />
    </div>
  )
}
