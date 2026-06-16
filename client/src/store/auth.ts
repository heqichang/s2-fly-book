import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthResponse } from '../types'
import { getMe, logout as apiLogout } from '../api/auth'
import { setToken as setCachedToken, removeToken } from '../api/client'

const AUTH_KEY = 'flybook_auth'

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

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: AuthResponse) => void
  logout: () => Promise<void>
  setUser: (user: User) => void
  checkAuth: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: (data: AuthResponse) => {
        setCachedToken(data.token)
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true
        })
      },

      logout: async () => {
        try {
          await apiLogout()
        } catch (e) {
          // ignore
        }
        removeToken()
        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
      },

      setUser: (user: User) => {
        set({ user })
      },

      checkAuth: async () => {
        try {
          const token = getTokenFromPersistStorage()
          if (!token) {
            set({ isAuthenticated: false, user: null, token: null })
            return false
          }
          set({ isLoading: true })
          setCachedToken(token)
          const user = await getMe()
          if (user) {
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false
            })
            return true
          }
          removeToken()
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          })
          return false
        } catch (e) {
          removeToken()
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          })
          return false
        }
      }
    }),
    {
      name: AUTH_KEY,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export default useAuthStore
