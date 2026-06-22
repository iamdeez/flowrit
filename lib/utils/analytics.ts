export type AnalyticsPeriod = 'this-month' | '3months' | '6months' | 'this-year'

export function toAnalyticsPeriod(value: string | undefined): AnalyticsPeriod {
  if (value === '3months' || value === '6months' || value === 'this-year') {
    return value
  }
  return 'this-month'
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 0, 0, 0, 0)
}

export function getPeriodRange(period: AnalyticsPeriod, now = new Date()) {
  const to = endOfDay(now)

  if (period === '3months') {
    return { from: startOfMonth(addMonths(now, -2)), to }
  }

  if (period === '6months') {
    return { from: startOfMonth(addMonths(now, -5)), to }
  }

  if (period === 'this-year') {
    return { from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), to }
  }

  return { from: startOfMonth(now), to }
}

export function getRecentMonthKeys(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = addMonths(now, index - count + 1)
    return monthKey(date)
  })
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [, month] = key.split('-')
  return `${Number(month)}월`
}

export function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}
