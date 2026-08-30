// Deterministic timestamp formatting for the Seema Rakshak platform.
// Every timestamp is rendered in India Standard Time (Asia/Kolkata) with an
// explicit locale so the server (UTC) and client (browser locale/timezone)
// always produce identical strings — this prevents React hydration mismatches.

const IST = 'Asia/Kolkata'
const LOCALE = 'en-IN'

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: IST,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: IST,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

/** e.g. "09:30:36 pm IST" — time only, IST. */
export function formatTime(value: Date | string | number): string {
  return `${timeFormatter.format(new Date(value))} IST`
}

/** e.g. "30 Aug 2026, 09:30:36 pm IST" — full date + time, IST. */
export function formatDateTime(value: Date | string | number): string {
  return `${dateTimeFormatter.format(new Date(value))} IST`
}
