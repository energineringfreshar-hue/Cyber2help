import { NextResponse } from 'next/server'
import { getEvents } from '@/app/(app)/actions/surveillance'

// Real-time polling endpoint for the Alerts page. The client refreshes this on
// an interval so new surveillance events surface without a manual reload.
// requireUser() inside getEvents scopes results to the signed-in officer.
export async function GET() {
  try {
    const events = await getEvents(200)
    return NextResponse.json(
      { events, serverTime: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
