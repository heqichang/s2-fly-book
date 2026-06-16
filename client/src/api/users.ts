import { request } from './client'
import type { UpdateProfileRequest, User } from '../types'

export function updateProfile(data: UpdateProfileRequest) {
  return request<User>({
    method: 'PUT',
    url: '/users/profile',
    data
  })
}

export function searchUsers(email: string) {
  return request<User[]>({
    method: 'GET',
    url: '/users/search',
    params: { email }
  })
}
