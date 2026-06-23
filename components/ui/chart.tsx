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

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flowrit-empty-state h-72 w-full">
      <p className="flowrit-empty-description">{message}</p>
    </div>
  )
}
