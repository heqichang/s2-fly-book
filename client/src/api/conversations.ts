import { request } from './client'
import type { Conversation, Message, MessagesResponse } from '../types'

export function getConversations() {
  return request<Conversation[]>({
    method: 'GET',
    url: '/conversations'
  })
}

export function createConversation(withUserId: string) {
  return request<Conversation>({
    method: 'POST',
    url: '/conversations',
    data: { withUserId }
  })
}

export function getMessages(id: string, page = 1, pageSize = 50) {
  return request<MessagesResponse>({
    method: 'GET',
    url: `/conversations/${id}/messages`,
    params: { page, pageSize }
  })
}

export function sendMessage(id: string, content: string, type = 'text') {
  return request<Message>({
    method: 'POST',
    url: `/conversations/${id}/messages`,
    data: { content, type }
  })
}

export function markAsRead(id: string) {
  return request<void>({
    method: 'POST',
    url: `/conversations/${id}/read`
  })
}
