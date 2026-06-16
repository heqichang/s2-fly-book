import { useState, useCallback } from 'react'
import type { ToastType } from '../components/common/Toast'

interface ToastState {
  message: string
  type: ToastType
  visible: boolean
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    visible: false
  })

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, visible: true })
  }, [])

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }))
  }, [])

  return { toast, showToast, hideToast }
}

export default useToast
