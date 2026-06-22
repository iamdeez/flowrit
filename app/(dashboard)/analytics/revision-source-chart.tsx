'use client'

import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts'
import { ChartContainer, EmptyChart } from '@/components/ui/chart'

type RevisionSourceChartProps = {
  data: { manual: number; portal: number }
}

const colors = {
  manual: '#4f46e5',
  portal: '#14b8a6',
}

export function RevisionSourceChart({ data }: RevisionSourceChartProps) {
  const chartData = [
    { name: '직접 등록', key: 'manual', value: data.manual },
    { name: '고객 포털', key: 'portal', value: data.portal },
  ]
  const hasData = chartData.some((item) => item.value > 0)
  if (!hasData) return <EmptyChart message="표시할 수정 요청 데이터가 없습니다." />

  return (
    <ChartContainer>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={3}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.key}
              fill={colors[entry.key as keyof typeof colors]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartContainer>
  )
}
