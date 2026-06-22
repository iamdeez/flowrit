import { redirect } from 'next/navigation'

type AnalyticsPageProps = {
  searchParams: Promise<{ period?: string }>
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const { period } = await searchParams
  const query = period ? `?period=${encodeURIComponent(period)}` : ''

  redirect(`/dashboard${query}`)
}
