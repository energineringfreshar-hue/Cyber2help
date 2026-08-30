import { PageHeader } from '@/components/page-header'
import { AnprPanel } from '@/components/anpr/anpr-panel'
import { getAnprReads } from '@/app/(app)/actions/surveillance'

export default async function AnprPage() {
  const reads = await getAnprReads(200)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ANPR"
        description="Automatic number plate recognition with known / unknown / watchlist comparison. Watchlist hits raise a high-risk alert."
      />
      <AnprPanel initialReads={reads} />
    </div>
  )
}
