import { request } from './client'
import type {
  Conversation,
  ConversationMember,
  Message,
  MessagesResponse,
  CreateGroupChatRequest,
  CreateDepartmentGroupRequest,
  UpdateConversationRequest,
  SendMessageRequest,
  ForwardMessageRequest,
  PinnedMessage
} from '../types'

export function getConversations() {
  return request<Conversation[]>({
    method: 'GET',
    url: '/conversations'
  })
}

export function getConversation(id: string) {
  return request<Conversation>({
    method: 'GET',
    url: `/conversations/${id}`
  })
}

export function createConversation(withUserId: string) {
  return request<Conversation>({
    method: 'POST',
    url: '/conversations',
    data: { withUserId }
  })
}

export function createGroupChat(data: CreateGroupChatRequest) {
  return request<Conversation>({
    method: 'POST',
    url: '/conversations/group',
    data
  })
}

export function createDepartmentGroup(data: CreateDepartmentGroupRequest) {
  return request<Conversation>({
    method: 'POST',
    url: '/conversations/department',
    data
  })
}

export function updateConversation(id: string, data: UpdateConversationRequest) {
  return request<Conversation>({
    method: 'PUT',
    url: `/conversations/${id}`,
    data
  })
}

export function deleteConversation(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/conversations/${id}`
  })
}

export function getConversationMembers(id: string) {
  return request<ConversationMember[]>({
    method: 'GET',
    url: `/conversations/${id}/members`
  })
}

export function addMembers(id: string, memberIds: string[]) {
  return request<ConversationMember[]>({
    method: 'POST',
    url: `/conversations/${id}/members`,
    data: { memberIds }
  })
}

export function leaveConversation(id: string) {
  return request<void>({
    method: 'POST',
    url: `/conversations/${id}/leave`
  })
}

export function updateMemberRole(
  conversationId: string,
  memberId: string,
  role: string
) {
  return request<ConversationMember>({
    method: 'PUT',
    url: `/conversations/${conversationId}/members/${memberId}/role`,
    data: { role }
  })
}

export function removeMember(conversationId: string, memberId: string) {
  return request<void>({
    method: 'DELETE',
    url: `/conversations/${conversationId}/members/${memberId}`
  })
}

export function getMessages(id: string, page = 1, pageSize = 50) {
  return request<MessagesResponse>({
    method: 'GET',
    url: `/conversations/${id}/messages`,
    params: { page, pageSize }
  })
}

export function sendMessage(id: string, data: SendMessageRequest) {
  return request<Message>({
    method: 'POST',
    url: `/conversations/${id}/messages`,
    data
  })
}

export function recallMessage(conversationId: string, messageId: string) {
  return request<Message>({
    method: 'PUT',
    url: `/conversations/${conversationId}/messages/${messageId}/recall`
  })
}

export function deleteMessage(conversationId: string, messageId: string) {
  return request<void>({
    method: 'DELETE',
    url: `/conversations/${conversationId}/messages/${messageId}`
  })
}

export function forwardMessage(
  conversationId: string,
  messageId: string,
  data: ForwardMessageRequest
) {
  return request<Message[]>({
    method: 'POST',
    url: `/conversations/${conversationId}/messages/${messageId}/forward`,
    data
  })
}

export function getPinnedMessages(id: string) {
  return request<PinnedMessage[]>({
    method: 'GET',
    url: `/conversations/${id}/pinned`
  })
}

export function pinMessage(conversationId: string, messageId: string) {
  return request<PinnedMessage>({
    method: 'POST',
    url: `/conversations/${conversationId}/pin/${messageId}`
  })
}

export function unpinMessage(conversationId: string, messageId: string) {
  return request<void>({
    method: 'DELETE',
    url: `/conversations/${conversationId}/pin/${messageId}`
  })
}

export function markAsRead(id: string) {
  return request<void>({
    method: 'POST',
    url: `/conversations/${id}/read`
  })
}

export function markAllAsRead() {
  return request<void>({
    method: 'POST',
    url: '/conversations/read/all'
  })
}
