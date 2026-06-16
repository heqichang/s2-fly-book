import { request } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types'

export function register(data: RegisterRequest) {
  return request<AuthResponse>({
    method: 'POST',
    url: '/auth/register',
    data
  })
}

export function login(data: LoginRequest) {
  return request<AuthResponse>({
    method: 'POST',
    url: '/auth/login',
    data
  })
}

export function logout() {
  return request<void>({
    method: 'POST',
    url: '/auth/logout'
  })
}

export function getMe() {
  return request<User>({
    method: 'GET',
    url: '/auth/me'
  })
}
