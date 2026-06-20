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

// ============= 表单相关类型 =============

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'select'
  | 'multiSelect'
  | 'member'
  | 'department'
  | 'attachment'
  | 'money'
  | 'detailTable'

export interface FormFieldOption {
  label: string
  value: string
}

export interface FormFieldValidation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  customMessage?: string
}

export interface DetailTableColumn {
  key: string
  label: string
  type: FormFieldType
  isRequired?: boolean
  options?: FormFieldOption[]
}

export interface FormFieldConfig {
  detailTableColumns?: DetailTableColumn[]
  precision?: number
  allowMultiple?: boolean
  maxCount?: number
  acceptTypes?: string[]
}

export interface FormField {
  id: string
  formTemplateId: string
  fieldKey: string
  label: string
  type: FormFieldType
  placeholder?: string | null
  helpText?: string | null
  defaultValue?: unknown
  isRequired: boolean
  isHidden: boolean
  isDisabled: boolean
  sortOrder: number
  options?: FormFieldOption[] | null
  validation?: FormFieldValidation | null
  config?: FormFieldConfig | null
  createdAt: string
  updatedAt: string
}

export interface FormTemplate {
  id: string
  teamId: string
  name: string
  icon?: string | null
  description?: string | null
  category?: string | null
  isEnabled: boolean
  isDefault: boolean
  sortOrder: number
  fields?: FormField[]
  createdById: string
  createdAt: string
  updatedAt: string
}

export type FormRecordStatus = 'draft' | 'submitted' | 'processing' | 'approved' | 'rejected' | 'withdrawn'

export interface FormRecord {
  id: string
  formTemplateId: string
  approvalInstanceId?: string | null
  submitterId: string
  formData: Record<string, unknown>
  status: FormRecordStatus
  submittedAt?: string | null
  submitter?: User
  formTemplate?: FormTemplate
  approvalInstance?: ApprovalInstance
  createdAt: string
  updatedAt: string
}

export interface CreateFormTemplateRequest {
  teamId: string
  name: string
  icon?: string
  description?: string
  category?: string
  isDefault?: boolean
  sortOrder?: number
  fields?: Array<Omit<FormField, 'id' | 'formTemplateId' | 'createdAt' | 'updatedAt'>>
}

export interface UpdateFormTemplateRequest {
  name?: string
  icon?: string
  description?: string
  category?: string
  isEnabled?: boolean
  isDefault?: boolean
  sortOrder?: number
  fields?: Array<Omit<FormField, 'id' | 'formTemplateId' | 'createdAt' | 'updatedAt'> & { id?: string }>
}

// ============= 审批相关类型 =============

export type ApprovalNodeType =
  | 'initiator'
  | 'approver'
  | 'cc'
  | 'condition'
  | 'countersign'
  | 'orSign'
  | 'autoApprove'
  | 'autoReject'

export type AssigneeType = 'user' | 'department' | 'role' | 'formField' | 'initiator' | 'initiatorLeader'

export type SignType = 'all' | 'any' | 'order'

export type AutoAction = 'approve' | 'reject'

export interface ApprovalNodeConfig {
  allowTransfer?: boolean
  allowAddSign?: boolean
  allowUrge?: boolean
  autoApproveWhenEmpty?: boolean
}

export interface ApprovalNode {
  id: string
  approvalTemplateId: string
  parentNodeId?: string | null
  nodeType: ApprovalNodeType
  nodeName: string
  sortOrder: number
  assigneeType?: AssigneeType | null
  assigneeIds?: string[] | null
  assigneeFieldKey?: string | null
  signType?: SignType | null
  conditionExpression?: string | null
  autoAction?: AutoAction | null
  ccUserIds?: string[] | null
  config?: ApprovalNodeConfig | null
  childNodes?: ApprovalNode[]
  createdAt: string
  updatedAt: string
}

export interface ApprovalTemplate {
  id: string
  formTemplateId: string
  teamId: string
  name: string
  description?: string | null
  isEnabled: boolean
  timeoutHours?: number | null
  nodes?: ApprovalNode[]
  createdById: string
  createdAt: string
  updatedAt: string
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'processing'

export interface ApprovalInstance {
  id: string
  approvalTemplateId: string
  formTemplateId: string
  formData: Record<string, unknown>
  initiatorId: string
  teamId: string
  title: string
  status: ApprovalStatus
  currentNodeId?: string | null
  startedAt?: string | null
  completedAt?: string | null
  tasks?: ApprovalTask[]
  actions?: ApprovalAction[]
  comments?: ApprovalComment[]
  ccs?: ApprovalCc[]
  initiator?: User
  formTemplate?: FormTemplate
  currentNode?: ApprovalNode
  createdAt: string
  updatedAt: string
}

export type ApprovalTaskStatus = 'pending' | 'approved' | 'rejected' | 'transferred' | 'delegated'

export interface ApprovalTask {
  id: string
  approvalInstanceId: string
  approvalNodeId: string
  assigneeId: string
  status: ApprovalTaskStatus
  action?: ApprovalActionType | null
  comment?: string | null
  assignedAt: string
  actedAt?: string | null
  assignee?: User
  approvalInstance?: ApprovalInstance
  createdAt: string
  updatedAt: string
}

export type ApprovalActionType =
  | 'approve'
  | 'reject'
  | 'transfer'
  | 'addSign'
  | 'withdraw'
  | 'urge'
  | 'comment'
  | 'submit'

export type ApprovalActionStatus = 'success' | 'failed' | 'pending'

export interface ApprovalAction {
  id: string
  approvalInstanceId: string
  actorId: string
  actionType: ApprovalActionType
  actionStatus: ApprovalActionStatus
  comment?: string | null
  fromNodeId?: string | null
  toNodeId?: string | null
  targetUserId?: string | null
  extraData?: Record<string, unknown> | null
  actor?: User
  createdAt: string
}

export interface ApprovalComment {
  id: string
  approvalInstanceId: string
  commenterId: string
  content: string
  parentId?: string | null
  commenter?: User
  replies?: ApprovalComment[]
  createdAt: string
}

export interface ApprovalCc {
  id: string
  approvalInstanceId: string
  ccUserId: string
  readAt?: string | null
  ccUser?: User
  createdAt: string
}

export type ApprovalNotificationType =
  | 'pending_approval'
  | 'approval_result'
  | 'cc'
  | 'urge'
  | 'timeout'

export interface ApprovalNotification {
  id: string
  userId: string
  approvalInstanceId: string
  approvalTaskId?: string | null
  notificationType: ApprovalNotificationType
  title: string
  content: string
  isRead: boolean
  readAt?: string | null
  approvalInstance?: ApprovalInstance
  approvalTask?: ApprovalTask
  createdAt: string
}

export interface CreateApprovalTemplateRequest {
  formTemplateId: string
  teamId: string
  name: string
  description?: string
  timeoutHours?: number
  nodes?: Array<Omit<ApprovalNode, 'id' | 'approvalTemplateId' | 'createdAt' | 'updatedAt' | 'childNodes'> & { childNodes?: any[] }>
}

export interface UpdateApprovalTemplateRequest {
  name?: string
  description?: string
  isEnabled?: boolean
  timeoutHours?: number
  nodes?: Array<Omit<ApprovalNode, 'approvalTemplateId' | 'createdAt' | 'updatedAt' | 'childNodes'> & { id?: string; childNodes?: any[] }>
}

export interface CreateApprovalInstanceRequest {
  approvalTemplateId: string
  formTemplateId: string
  formData: Record<string, unknown>
  title: string
  teamId: string
}

export interface ApproveRequest {
  comment?: string
}

export interface RejectRequest {
  comment: string
}

export interface TransferRequest {
  targetUserId: string
  comment?: string
}

export interface AddSignRequest {
  targetUserId: string
  nodeName?: string
  signType?: SignType
  comment?: string
}

export interface CreateApprovalCommentRequest {
  content: string
  parentId?: string
}

export interface ApprovalInstanceListResponse {
  items: ApprovalInstance[]
  total: number
  page: number
  pageSize: number
}

export interface ApprovalTaskListResponse {
  items: ApprovalTask[]
  total: number
  page: number
  pageSize: number
}

export interface ApprovalNotificationListResponse {
  items: ApprovalNotification[]
  total: number
  page: number
  pageSize: number
  unreadCount: number
}
