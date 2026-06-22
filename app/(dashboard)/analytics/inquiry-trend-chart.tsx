'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, EmptyChart } from '@/components/ui/chart'

type InquiryTrendChartProps = {
  data: { month: string; count: number }[]
}

export function InquiryTrendChart({ data }: InquiryTrendChartProps) {
  const hasData = data.some((item) => item.count > 0)
  if (!hasData) return <EmptyChart message="표시할 의뢰 접수 데이터가 없습니다." />

  return (
    <ChartContainer>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="count"
          name="신규 의뢰"
          stroke="#14b8a6"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
