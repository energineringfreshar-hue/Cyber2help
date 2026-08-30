import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
        ) : null}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
