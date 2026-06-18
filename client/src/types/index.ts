export interface User {
  id: string
  email: string
  nickname: string
  avatar?: string | null
  phone?: string | null
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

export interface Team {
  id: string
  name: string
  logo?: string | null
  description?: string | null
  ownerId: string
  owner?: User
  role?: string
  memberCount?: number
  departmentCount?: number
  joinedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: string
  joinedAt: string
  user: User
}

export interface Department {
  id: string
  teamId: string
  name: string
  parentId?: string | null
  parent?: { id: string; name: string } | null
  description?: string | null
  memberCount?: number
  childrenCount?: number
  members?: DepartmentMember[]
  children?: Department[]
  createdAt: string
  updatedAt: string
}

export interface DepartmentMember {
  id: string
  departmentId: string
  userId: string
  position?: string | null
  phone?: string | null
  email?: string | null
  joinedAt: string
  user: User
}

export interface Conversation {
  id: string
  type: string
  subtype?: string | null
  name?: string | null
  avatar?: string | null
  announcement?: string | null
  teamId?: string | null
  team?: Team | null
  departmentId?: string | null
  lastMessage?: string | null
  lastMessageAt?: string | null
  unreadCount: number
  role?: string
  otherUser?: User | null
  members?: ConversationMember[]
  memberCount?: number
  pinnedMessages?: PinnedMessage[]
  createdAt: string
}

export interface ConversationMember {
  id: string
  conversationId: string
  userId: string
  role: string
  unreadCount?: number
  lastReadAt?: string | null
  joinedAt?: string
  user: User
}

export interface FileInfo {
  id: string
  name: string
  originalName: string
  mimeType: string
  size: number
  url: string
  thumbnail?: string | null
  icon?: string
  isImage?: boolean
  uploadedBy?: User
  messageId?: string | null
  expiresAt?: string | null
  createdAt: string
}

export interface MessageMention {
  id: string
  messageId: string
  userId: string
  isAll: boolean
  createdAt: string
  user: User
}

export interface PinnedMessage {
  id: string
  conversationId: string
  messageId: string
  pinnedById: string
  createdAt: string
  message: Message
  pinnedBy: User
}

export interface ReadReceipt {
  id: string
  messageId: string
  userId: string
  readAt: string
  user?: User
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  type: string
  content: string
  status: string
  isRecalled: boolean
  isDeleted: boolean
  replyToId?: string | null
  replyTo?: {
    id: string
    content: string
    type: string
    isRecalled: boolean
    sender?: { id: string; nickname: string }
  } | null
  forwardFromId?: string | null
  file?: FileInfo | null
  mentions?: MessageMention[]
  readReceipts?: ReadReceipt[]
  sender?: { id: string; nickname: string; avatar?: string | null }
  createdAt: string
  updatedAt: string
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
  phone?: string
}

export interface CreateTeamRequest {
  name: string
  logo?: string
  description?: string
}

export interface UpdateTeamRequest {
  name?: string
  logo?: string
  description?: string
}

export interface CreateDepartmentRequest {
  name: string
  parentId?: string
  description?: string
}

export interface UpdateDepartmentRequest {
  name?: string
  description?: string
  parentId?: string
}

export interface AddDepartmentMemberRequest {
  userId: string
  position?: string
  phone?: string
  email?: string
}

export interface UpdateDepartmentMemberRequest {
  position?: string
  phone?: string
  email?: string
}

export interface CreateGroupChatRequest {
  name: string
  avatar?: string
  teamId?: string
  memberIds: string[]
}

export interface CreateDepartmentGroupRequest {
  departmentId: string
  name?: string
}

export interface UpdateConversationRequest {
  name?: string
  avatar?: string
  announcement?: string
}

export interface SendMessageRequest {
  content?: string
  type?: string
  replyToId?: string
  forwardFromId?: string
  mentions?: { userId: string; isAll?: boolean }[]
  fileId?: string
}

export interface ForwardMessageRequest {
  targetConversationIds: string[]
}

export interface MessagesResponse {
  messages: Message[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface UploadFileResponse {
  id: string
  name: string
  originalName: string
  mimeType: string
  size: number
  url: string
  thumbnail?: string | null
  icon: string
  isImage: boolean
  expiresAt?: string
  createdAt: string
}

// ============= 文档相关类型 =============

export type DocBlockType =
  | 'heading'
  | 'paragraph'
  | 'orderedList'
  | 'unorderedList'
  | 'taskList'
  | 'quote'
  | 'code'
  | 'table'
  | 'image'
  | 'divider'

export interface DocBlock {
  id: string
  type: DocBlockType
  content: string
  level?: number
  checked?: boolean
  language?: string
  cells?: string[][]
  imageUrl?: string
}

export interface DocFolder {
  id: string
  teamId: string
  name: string
  parentId?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  createdBy?: User
  _count?: {
    children: number
    documents: number
  }
}

export interface Document {
  id: string
  teamId: string
  folderId?: string | null
  title: string
  content: string
  createdById: string
  updatedById: string
  isDeleted: boolean
  isFavorite: boolean
  role?: string
  createdAt: string
  updatedAt: string
  createdBy?: User
  updatedBy?: User
  folder?: {
    id: string
    name: string
    parentId?: string | null
  }
}

export interface DocPermission {
  id: string
  documentId: string
  userId: string
  role: string
  createdAt: string
  user: User
}

export interface DocComment {
  id: string
  documentId: string
  userId: string
  content: string
  blockId?: string | null
  blockText?: string | null
  parentId?: string | null
  isResolved: boolean
  resolvedById?: string | null
  resolvedAt?: string | null
  createdAt: string
  updatedAt: string
  user: User
  replies?: DocComment[]
  mentions?: DocMention[]
  resolvedBy?: User
}

export interface DocMention {
  id: string
  commentId: string
  userId: string
  createdAt: string
  user: User
}

export interface DocRecent {
  id: string
  userId: string
  documentId: string
  openedAt: string
  document: Document
}

export interface DocFavorite {
  id: string
  userId: string
  documentId: string
  createdAt: string
  document: Document
}

export interface DocShare {
  id: string
  documentId: string
  shareType: 'private' | 'team' | 'link'
  teamRole?: string | null
  linkEnabled: boolean
  linkRole?: string | null
  linkToken?: string | null
  canManage?: boolean
  createdAt: string
  updatedAt: string
}

export type DocRole = 'viewer' | 'commenter' | 'editor' | 'admin'

export interface CreateDocumentRequest {
  teamId: string
  folderId?: string
  title?: string
  template?: string
}

export interface UpdateDocumentRequest {
  title?: string
  content?: string
  folderId?: string
}

export interface CreateFolderRequest {
  teamId: string
  name: string
  parentId?: string
}

export interface UpdateFolderRequest {
  name?: string
  parentId?: string
}

export interface CreateDocCommentRequest {
  content: string
  blockId?: string
  blockText?: string
  parentId?: string
}

export interface UpdateDocShareRequest {
  shareType?: string
  teamRole?: string
  linkEnabled?: boolean
  linkRole?: string
}
