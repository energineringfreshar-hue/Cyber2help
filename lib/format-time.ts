// Deterministic date/time formatting for the Seema Rakshak (IST) platform.
//
// We intentionally do NOT return locale-assembled strings from
// `Intl.DateTimeFormat.format()`, because the separator characters can differ
// between the server's Node ICU build and the browser's ICU build (most
// notably a narrow no-break space U+202F vs a normal space before AM/PM in
// newer ICU). That produces byte-level SSR/client hydration mismatches even
// when the underlying instant is identical. Instead we read numeric parts in
// the Asia/Kolkata timezone and assemble the string ourselves, so the output
// is byte-for-byte identical on the server and the client.

const IST = 'Asia/Kolkata'

// en-GB with hour12:false gives us stable, zero-padded 24h numeric parts.
const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function istParts(value: Date | string | number) {
  const d = value instanceof Date ? value : new Date(value)
  const map: Record<string, string> = {}
  for (const p of partsFormatter.formatToParts(d)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  const hour24 = Number(map.hour ?? '0') % 24
  const period = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return {
    day: map.day ?? '01',
    month: map.month ?? '01',
    year: map.year ?? '1970',
    hour12,
    minute: map.minute ?? '00',
    second: map.second ?? '00',
    period,
  }
}

/** e.g. "9:30:36 PM IST" — time only, IST. */
export function formatTime(value: Date | string | number): string {
  const p = istParts(value)
  return `${p.hour12}:${p.minute}:${p.second} ${p.period} IST`
}

/** e.g. "30/08/2026, 9:30:36 PM IST" — full date + time, IST. */
export function formatDateTime(value: Date | string | number): string {
  const p = istParts(value)
  return `${p.day}/${p.month}/${p.year}, ${p.hour12}:${p.minute}:${p.second} ${p.period} IST`
}
