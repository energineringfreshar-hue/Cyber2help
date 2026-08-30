import { NextResponse } from 'next/server'
import { getDashboardData } from '@/app/(app)/actions/dashboard'

// Real-time polling endpoint for the Command Center. The dashboard refreshes
// this on an interval so KPIs, severity counts, and recent activity stay live.
export async function GET() {
  try {
    const data = await getDashboardData()
    return NextResponse.json(
      { ...data, serverTime: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
