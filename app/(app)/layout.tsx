import { requireUser } from '@/lib/session'
import { AppSidebar } from '@/components/app-sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
