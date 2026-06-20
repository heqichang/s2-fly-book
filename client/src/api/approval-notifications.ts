import { request } from './client'
import type {
  ApprovalNotification,
  ApprovalNotificationListResponse,
  ApprovalNotificationType
} from '../types'

export function getApprovalNotifications(params?: {
  type?: ApprovalNotificationType
  isRead?: boolean
  page?: number
  pageSize?: number
}) {
  return request<ApprovalNotificationListResponse>({
    method: 'GET',
    url: '/approval-notifications',
    params
  })
}

export function getApprovalNotification(id: string) {
  return request<ApprovalNotification>({
    method: 'GET',
    url: `/approval-notifications/${id}`
  })
}

export function getUnreadApprovalNotificationCount() {
  return request<{ count: number }>({
    method: 'GET',
    url: '/approval-notifications/unread-count'
  })
}

export function markApprovalNotificationAsRead(id: string) {
  return request<ApprovalNotification>({
    method: 'POST',
    url: `/approval-notifications/${id}/read`
  })
}

export function markAllApprovalNotificationsAsRead() {
  return request<{ updatedCount: number }>({
    method: 'POST',
    url: '/approval-notifications/read-all'
  })
}

export function deleteApprovalNotification(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/approval-notifications/${id}`
  })
}

export function clearAllApprovalNotifications() {
  return request<{ deletedCount: number }>({
    method: 'DELETE',
    url: '/approval-notifications/all'
  })
}
