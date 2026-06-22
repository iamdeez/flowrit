'use client'

import { useRouter } from 'next/navigation'
import type { AnalyticsPeriod } from '@/lib/utils/analytics'

const options: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'this-month', label: '이번 달' },
  { value: '3months', label: '지난 3개월' },
  { value: '6months', label: '지난 6개월' },
  { value: 'this-year', label: '올해' },
]

export function PeriodSelector({ current }: { current: AnalyticsPeriod }) {
  const router = useRouter()

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => router.push(`/dashboard?period=${option.value}`)}
          className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${
            current === option.value
              ? 'bg-indigo-600 text-white'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
