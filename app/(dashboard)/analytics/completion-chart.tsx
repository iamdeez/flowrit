'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, EmptyChart } from '@/components/ui/chart'

type CompletionChartProps = {
  data: { month: string; created: number; completed: number }[]
}

export function CompletionChart({ data }: CompletionChartProps) {
  const hasData = data.some((item) => item.created > 0 || item.completed > 0)
  if (!hasData) return <EmptyChart message="표시할 프로젝트 데이터가 없습니다." />

  return (
    <ChartContainer>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip cursor={{ fill: '#f3f4f6' }} />
        <Legend />
        <Bar dataKey="created" name="생성" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" name="완료" fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
