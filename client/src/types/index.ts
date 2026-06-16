export interface User {
  id: string
  email: string
  nickname: string
  avatar?: string | null
  status?: string
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  contactId: string
  remark?: string | null
  createdAt: string
  user: User
}

export interface FriendRequest {
  id: string
  fromId: string
  toId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  updatedAt: string
  from?: User
  to?: User
}

export interface Conversation {
  id: string
  type: string
  name?: string | null
  lastMessage?: string | null
  lastMessageAt?: string | null
  unreadCount: number
  otherUser?: User | null
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  type: string
  content: string
  status: string
  createdAt: string
  updatedAt: string
  sender?: { id: string; nickname: string; avatar?: string | null }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  nickname: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface UpdateProfileRequest {
  nickname?: string
  avatar?: string
}

export interface MessagesResponse {
  messages: Message[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
