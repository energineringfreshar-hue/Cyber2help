import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'

export default async function Page() {
  const user = await getCurrentUser()
  redirect(user ? '/dashboard' : '/sign-in')
}
