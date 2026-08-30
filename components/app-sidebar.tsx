'use client'

import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  ScanLine,
  Cctv,
  TriangleAlert,
  Car,
  ShieldCheck,
  ScrollText,
  LogOut,
  ShieldHalf,
} from 'lucide-react'
import type { Role } from '@/lib/rbac'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: Role[]
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [{ href: '/dashboard', label: 'Command Center', icon: LayoutDashboard }],
  },
  {
    section: 'Screening',
    items: [
      { href: '/documents', label: 'Document Screening', icon: ScanLine },
    ],
  },
  {
    section: 'Surveillance',
    items: [
      { href: '/surveillance', label: 'Live Analytics', icon: Cctv },
      { href: '/alerts', label: 'Alerts', icon: TriangleAlert },
      { href: '/anpr', label: 'ANPR', icon: Car },
    ],
  },
  {
    section: 'Administration',
    items: [
      { href: '/cameras', label: 'Cameras', icon: ShieldCheck, roles: ['admin', 'commander'] },
      { href: '/audit', label: 'Audit Ledger', icon: ScrollText, roles: ['admin', 'commander'] },
    ],
  },
]

export function AppSidebar({
  user,
}: {
  user: { name: string; email: string; role: Role }
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldHalf className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight text-sidebar-foreground">
              Seema Rakshak
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              SSB · MHA Border Grid
            </p>
          </div>
        </div>
        <div className="mt-3 flex h-1 w-full overflow-hidden rounded-full" aria-hidden="true">
          <span className="flex-1 bg-[var(--india-saffron)]" />
          <span className="flex-1 bg-sidebar-foreground/80" />
          <span className="flex-1 bg-[var(--india-green)]" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV.map((group) => {
          const items = group.items.filter(
            (item) => !item.roles || item.roles.includes(user.role),
          )
          if (items.length === 0) return null
          return (
            <div key={group.section} className="mb-4">
              <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {group.section}
              </p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active = pathname === item.href
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                          active
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
            <p className="truncate font-mono text-[10px] uppercase tracking-wide text-primary">
              {user.role}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
