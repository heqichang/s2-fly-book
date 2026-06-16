import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode, useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth'

const AUTH_KEY = 'flybook_auth'

interface AuthGuardProps {
  children: ReactNode
}

function getTokenFromPersistStorage(): string | null {
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.token || parsed?.token || null
    }
  } catch {
    // ignore
  }
  return null
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const location = useLocation()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = getTokenFromPersistStorage()
    if (token && !isAuthenticated) {
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
