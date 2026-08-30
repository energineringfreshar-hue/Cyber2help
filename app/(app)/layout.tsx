import { requireUser } from '@/lib/session'
import { AppSidebar } from '@/components/app-sidebar'
import { GovHeader } from '@/components/brand/gov-header'

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
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-border bg-card/50 px-6 py-2 backdrop-blur-sm">
          <GovHeader compact />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
