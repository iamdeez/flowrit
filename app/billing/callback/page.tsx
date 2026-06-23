import { redirect } from 'next/navigation'

export default function BillingCallbackPage() {
  redirect('/settings?tab=billing')
}
