import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '../types'

const AUTH_KEY = 'flybook_auth'

const client: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

function getTokenFromStorage(): string | null {
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.token || null
    }
  } catch {
    // ignore
  }
  return null
}

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getTokenFromStorage()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

client.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data
    if (res && res.success === false) {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_KEY)
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export function getToken(): string | null {
  return getTokenFromStorage()
}

export function setToken(token: string): void {
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    parsed.token = token
    localStorage.setItem(AUTH_KEY, JSON.stringify(parsed))
  } catch {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token }))
  }
}

export function removeToken(): void {
  localStorage.removeItem(AUTH_KEY)
}

export function request<T = unknown>(config: AxiosRequestConfig): Promise<ApiResponse<T>['data']> {
  return client.request<ApiResponse<T>>(config).then((res) => res.data.data as T)
}

export default client
