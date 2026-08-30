import { cn } from '@/lib/utils'
import { EmblemMark, IndiaFlag } from '@/components/brand/national-marks'

/**
 * Government-of-India branding bar: Ministry of Home Affairs (left) and
 * Government of India + national flag (right). Used across auth screens and
 * the in-app top bar for a consistent official identity.
 */
export function GovHeader({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex w-full items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-2.5">
        <EmblemMark className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
        <div className="leading-tight">
          <p
            className={cn(
              'font-semibold tracking-tight text-foreground',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            Ministry of Home Affairs
          </p>
          {!compact && <p className="font-serif text-[11px] text-muted-foreground">गृह मंत्रालय</p>}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="text-right leading-tight">
          <p
            className={cn(
              'font-semibold tracking-tight text-foreground',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            Government of India
          </p>
          {!compact && <p className="font-serif text-[11px] text-muted-foreground">भारत सरकार</p>}
        </div>
        <IndiaFlag className={compact ? 'h-3.5 w-5' : 'h-5 w-8'} />
      </div>
    </div>
  )
}
