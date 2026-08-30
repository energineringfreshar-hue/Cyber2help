import { PageHeader } from '@/components/page-header'
import { SurveillanceConsole } from '@/components/surveillance/surveillance-console'
import type { FeedCamera } from '@/components/surveillance/camera-feed'
import { getCameras } from '@/app/(app)/actions/cameras'
import { Cctv } from 'lucide-react'

const BACKDROPS = ['/feeds/checkpoint-gate.png', '/feeds/perimeter-night.png']

export default async function SurveillancePage() {
  const dbCameras = await getCameras()

  // Map registered cameras to simulated feeds; fall back to two demo feeds so the
  // console is always usable for a live demo even before any camera is added.
  const feeds: FeedCamera[] =
    dbCameras.length > 0
      ? dbCameras.map((c, i) => ({
          id: c.id,
          name: c.name,
          location: c.location,
          backdrop: BACKDROPS[i % BACKDROPS.length],
          night: i % 2 === 1,
        }))
      : [
          {
            id: -1,
            name: 'CAM-01 · Main Gate',
            location: 'Vehicle Checkpoint Alpha',
            backdrop: BACKDROPS[0],
            night: false,
          },
          {
            id: -2,
            name: 'CAM-02 · Perimeter East',
            location: 'Sector 4 Fence Line',
            backdrop: BACKDROPS[1],
            night: true,
          },
        ]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Cctv className="size-5" />}
        title="Border Surveillance"
        description="Live edge-AI video analytics — person and vehicle detection, tracking, and virtual-fence intrusion alerts. Drag the amber fence and inject subjects to trigger events."
      />
      <SurveillanceConsole cameras={feeds} />
    </div>
  )
}
