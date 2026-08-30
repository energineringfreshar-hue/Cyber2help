import { PageHeader } from '@/components/page-header'
import { CamerasManager } from '@/components/cameras/cameras-manager'
import { getCameras } from '@/app/(app)/actions/cameras'
import { requireUser } from '@/lib/session'
import { can } from '@/lib/rbac'

export default async function CamerasPage() {
  const user = await requireUser()
  const cameras = await getCameras()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cameras"
        description="Register existing CCTV/RTSP cameras. Credentials are encrypted at rest; status changes raise surveillance events."
      />
      <CamerasManager initialCameras={cameras} canManage={can(user.role, 'cameras.manage')} />
    </div>
  )
}
