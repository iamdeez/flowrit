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

type WorkloadChartProps = {
  data: { name: string; activeProjects: number; pendingRevisions: number }[]
}

export function WorkloadChart({ data }: WorkloadChartProps) {
  const hasData = data.some(
    (item) => item.activeProjects > 0 || item.pendingRevisions > 0
  )
  if (!hasData) return <EmptyChart message="표시할 팀 워크로드 데이터가 없습니다." />

  return (
    <ChartContainer>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <Tooltip />
        <Legend />
        <Bar dataKey="activeProjects" name="진행 중" fill="#4f46e5" radius={[0, 4, 4, 0]} />
        <Bar dataKey="pendingRevisions" name="수정 요청" fill="#f59e0b" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
