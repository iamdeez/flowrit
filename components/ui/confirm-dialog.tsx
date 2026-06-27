'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Modal } from './modal'

interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** 파괴적 동작이면 확인 버튼을 빨간색으로 */
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * 앱 공용 확인 다이얼로그.
 * 네이티브 confirm() 대신 `const confirm = useConfirm()` 후
 * `if (!(await confirm({...}))) return` 형태로 사용한다.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result)
    resolver.current = null
    setOptions(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ''}
        description={options?.description}
        maxWidth="sm"
        footer={
          <>
            <button type="button" className="flowrit-button-secondary" onClick={() => settle(false)}>
              {options?.cancelLabel ?? '취소'}
            </button>
            <button
              type="button"
              className={
                options?.danger
                  ? 'flowrit-button-primary flowrit-button-danger'
                  : 'flowrit-button-primary'
              }
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? '확인'}
            </button>
          </>
        }
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
