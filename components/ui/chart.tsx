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
    <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
      {message}
    </div>
  )
}
