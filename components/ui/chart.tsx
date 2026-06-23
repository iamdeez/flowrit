'use client'

import * as React from 'react'
import { ResponsiveContainer } from 'recharts'

type ChartContainerProps = {
  children: React.ReactElement
  className?: string
}

export function ChartContainer({ children, className = '' }: ChartContainerProps) {
  return (
    <div className={`h-72 w-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

const PRETENDARD = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

export const chartTooltipProps = {
  contentStyle: {
    fontFamily: PRETENDARD,
    fontSize: '12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    padding: '8px 12px',
  },
  labelStyle: {
    fontFamily: PRETENDARD,
    fontWeight: 600,
    color: '#141b2b',
    marginBottom: '4px',
  },
  itemStyle: {
    fontFamily: PRETENDARD,
    color: '#464555',
  },
} as const

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flowrit-empty-state h-72 w-full">
      <p className="flowrit-empty-description">{message}</p>
    </div>
  )
}
