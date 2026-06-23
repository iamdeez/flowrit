import { type ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <div className={`group relative inline-flex ${className ?? ''}`}>
      {children}
      <div
        role="tooltip"
        className={[
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md',
          'bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md',
          'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
          side === 'top'
            ? 'bottom-full left-1/2 mb-2 -translate-x-1/2'
            : 'top-full left-1/2 mt-2 -translate-x-1/2',
        ].join(' ')}
      >
        {content}
        <span
          className={[
            'absolute left-1/2 -translate-x-1/2 border-4 border-transparent',
            side === 'top' ? 'top-full border-t-gray-900' : 'bottom-full border-b-gray-900',
          ].join(' ')}
        />
      </div>
    </div>
  )
}
