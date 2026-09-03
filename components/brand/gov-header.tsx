import { cn } from '@/lib/utils'
import { IndiaFlag } from '@/components/brand/national-marks'

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
      <div className="flex items-center">
        {/* Official Ministry of Home Affairs lockup (State Emblem of India +
            गृह मंत्रालय / MINISTRY OF HOME AFFAIRS). The source artwork is black,
            so we invert it to white to read on the dark command-center theme. */}
        <img
          src="/mha-logo.webp"
          alt="Ministry of Home Affairs, Government of India"
          className={cn('w-auto object-contain opacity-95 invert', compact ? 'h-6' : 'h-10')}
        />
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
