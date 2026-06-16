import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthResponse } from '../types'
import { getMe, logout as apiLogout } from '../api/auth'
import { removeToken } from '../api/client'

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
          const stored = localStorage.getItem('flybook_auth')
          if (!stored) {
            set({ isAuthenticated: false, user: null, token: null })
            return false
          }
          const parsed = JSON.parse(stored)
          if (!parsed.token) {
            set({ isAuthenticated: false, user: null, token: null })
            return false
          }
          set({ isLoading: true })
          const user = await getMe()
          if (user) {
            set({
              user,
              token: parsed.token,
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
      name: 'flybook_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export default useAuthStore
