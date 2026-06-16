import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode, useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth'

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const location = useLocation()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let hasToken = false
    try {
      const stored = localStorage.getItem('flybook_auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        hasToken = !!parsed.token
      }
    } catch {
      // ignore
    }
    if (hasToken && !isAuthenticated) {
      checkAuth().finally(() => setChecked(true))
    } else {
      setChecked(true)
    }
  }, [checkAuth, isAuthenticated])

  if (!checked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default AuthGuard
