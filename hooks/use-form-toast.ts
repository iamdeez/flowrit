'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

type FormState = { error?: string; success?: string | boolean } | null | undefined

export function useFormToast(state: FormState) {
  const prevRef = useRef<FormState>(undefined)

  useEffect(() => {
    if (prevRef.current === undefined) {
      prevRef.current = state
      return
    }
    if (state === prevRef.current) return
    prevRef.current = state

    if (!state) return

    if (state.error) {
      toast.error(state.error, { duration: 5000 })
    } else if (state.success) {
      toast.success(
        typeof state.success === 'string' ? state.success : '저장되었습니다.',
        { duration: 4000 }
      )
    }
  }, [state])
}
