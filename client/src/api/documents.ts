import { request } from './client'
import type {
  Document,
  DocFolder,
  DocComment,
  DocPermission,
  DocShare,
  DocRecent,
  DocFavorite,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  CreateFolderRequest,
  UpdateFolderRequest,
  CreateDocCommentRequest,
  UpdateDocShareRequest
} from '../types'

// ============= 文件夹相关 API =============

export function getFolders(teamId: string, parentId?: string) {
  const params = new URLSearchParams()
  if (parentId) params.set('parentId', parentId)
  return request<DocFolder[]>({
    method: 'GET',
    url: `/documents/folders/${teamId}?${params.toString()}`
  })
}

export function createFolder(data: CreateFolderRequest) {
  return request<DocFolder>({
    method: 'POST',
    url: '/documents/folders',
    data
  })
}

export function updateFolder(id: string, data: UpdateFolderRequest) {
  return request<DocFolder>({
    method: 'PUT',
    url: `/documents/folders/${id}`,
    data
  })
}

export function deleteFolder(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/documents/folders/${id}`
  })
}

// ============= 文档相关 API =============

export function getTeamDocuments(teamId: string, folderId?: string) {
  const params = new URLSearchParams()
  if (folderId) params.set('folderId', folderId)
  return request<Document[]>({
    method: 'GET',
    url: `/documents/team/${teamId}?${params.toString()}`
  })
}

export function getDocument(id: string) {
  return request<Document>({
    method: 'GET',
    url: `/documents/${id}`
  })
}

export function createDocument(data: CreateDocumentRequest) {
  return request<Document>({
    method: 'POST',
    url: '/documents',
    data
  })
}

export function updateDocument(id: string, data: UpdateDocumentRequest) {
  return request<Document>({
    method: 'PUT',
    url: `/documents/${id}`,
    data
  })
}

export function deleteDocument(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/documents/${id}`
  })
}

export function moveDocument(id: string, folderId: string) {
  return request<Document>({
    method: 'POST',
    url: `/documents/${id}/move`,
    data: { folderId }
  })
}

export function renameDocument(id: string, title: string) {
  return request<Document>({
    method: 'POST',
    url: `/documents/${id}/rename`,
    data: { title }
  })
}

// ============= 最近打开文档 =============

export function getRecentDocuments(limit?: number) {
  const params = new URLSearchParams()
  if (limit) params.set('limit', String(limit))
  return request<DocRecent[]>({
    method: 'GET',
    url: `/documents/recent/list?${params.toString()}`
  })
}

// ============= 收藏文档 =============

export function getFavoriteDocuments() {
  return request<DocFavorite[]>({
    method: 'GET',
    url: '/documents/favorites/list'
  })
}

export function toggleFavorite(id: string) {
  return request<{ isFavorite: boolean }>({
    method: 'POST',
    url: `/documents/${id}/favorite`
  })
}

// ============= 文档评论 API =============

export function getDocComments(documentId: string, blockId?: string) {
  const params = new URLSearchParams()
  if (blockId) params.set('blockId', blockId)
  return request<DocComment[]>({
    method: 'GET',
    url: `/doc-comments/${documentId}?${params.toString()}`
  })
}

export function createDocComment(documentId: string, data: CreateDocCommentRequest) {
  return request<DocComment>({
    method: 'POST',
    url: `/doc-comments/${documentId}`,
    data
  })
}

export function updateDocComment(commentId: string, content: string) {
  return request<DocComment>({
    method: 'PUT',
    url: `/doc-comments/${commentId}`,
    data: { content }
  })
}

export function deleteDocComment(commentId: string) {
  return request<void>({
    method: 'DELETE',
    url: `/doc-comments/${commentId}`
  })
}

export function resolveDocComment(commentId: string) {
  return request<DocComment>({
    method: 'POST',
    url: `/doc-comments/${commentId}/resolve`
  })
}

export function unresolveDocComment(commentId: string) {
  return request<DocComment>({
    method: 'POST',
    url: `/doc-comments/${commentId}/unresolve`
  })
}

// ============= 文档权限 API =============

export function getDocPermissions(documentId: string) {
  return request<DocPermission[]>({
    method: 'GET',
    url: `/doc-share/permissions/${documentId}`
  })
}

export function addDocPermission(documentId: string, userId: string, role: string) {
  return request<DocPermission>({
    method: 'POST',
    url: `/doc-share/permissions/${documentId}`,
    data: { userId, role }
  })
}

export function removeDocPermission(documentId: string, userId: string) {
  return request<void>({
    method: 'DELETE',
    url: `/doc-share/permissions/${documentId}/${userId}`
  })
}

// ============= 文档分享 API =============

export function getDocShare(documentId: string) {
  return request<DocShare>({
    method: 'GET',
    url: `/doc-share/share/${documentId}`
  })
}

export function updateDocShare(documentId: string, data: UpdateDocShareRequest) {
  return request<DocShare>({
    method: 'PUT',
    url: `/doc-share/share/${documentId}`,
    data
  })
}

export function getDocumentByLink(token: string) {
  return request<{ document: Document; role: string }>({
    method: 'POST',
    url: `/doc-share/share/link/${token}`
  })
}
