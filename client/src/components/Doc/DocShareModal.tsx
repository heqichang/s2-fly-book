import { useState, useEffect } from 'react'
import {
  getDocPermissions,
  addDocPermission,
  removeDocPermission,
  getDocShare,
  updateDocShare
} from '../../api/documents'
import { searchUsers } from '../../api/users'
import type { DocPermission, DocShare, User, DocRole, UpdateDocShareRequest } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import { useAuthStore } from '../../store/auth'

interface DocShareModalProps {
  documentId: string
  visible: boolean
  onClose: () => void
  onUpdated?: () => void
}

type ShareType = 'private' | 'team' | 'link'

interface SearchUser {
  id: string
  nickname: string
  avatar?: string | null
  email?: string
}

const roleLabels: Record<DocRole, string> = {
  viewer: '可阅读',
  commenter: '可评论',
  editor: '可编辑',
  admin: '管理员'
}

const shareTypeLabels: Record<ShareType, { label: string; desc: string }> = {
  private: {
    label: '私有',
    desc: '只有被邀请的成员可以访问'
  },
  team: {
    label: '团队内可访问',
    desc: '团队内所有成员都可以访问'
  },
  link: {
    label: '链接访问',
    desc: '获得链接的任何人都可以访问'
  }
}

function DocShareModal({ documentId, visible, onClose, onUpdated }: DocShareModalProps) {
  const { user: currentUser } = useAuthStore()
  const { toast, showToast, hideToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [permissions, setPermissions] = useState<DocPermission[]>([])
  const [docShare, setDocShare] = useState<DocShare | null>(null)

  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)

  const [selectedRole, setSelectedRole] = useState<DocRole>('viewer')
  const [submitting, setSubmitting] = useState(false)
  const [updatingShare, setUpdatingShare] = useState(false)

  const [copying, setCopying] = useState(false)

  useEffect(() => {
    if (visible && documentId) {
      loadData()
      setSearchKeyword('')
      setSearchResults([])
    }
  }, [visible, documentId])

  useEffect(() => {
    if (searchKeyword.trim()) {
      handleSearch()
    } else {
      setSearchResults([])
    }
  }, [searchKeyword])

  const loadData = async () => {
    try {
      setLoading(true)
      const [permsData, shareData] = await Promise.all([
        getDocPermissions(documentId),
        getDocShare(documentId)
      ])
      setPermissions(permsData || [])
      setDocShare(shareData || null)
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    try {
      setSearching(true)
      const data = await searchUsers(searchKeyword)
      const users: SearchUser[] = (data || [])
        .filter((u: User) => u.id !== currentUser?.id)
        .filter((u: User) => !permissions.some((p) => p.userId === u.id))
        .map((u: User) => ({
          id: u.id,
          nickname: u.nickname,
          avatar: u.avatar,
          email: u.email
        }))
      setSearchResults(users.slice(0, 10))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = async (user: SearchUser) => {
    try {
      setSubmitting(true)
      const result = await addDocPermission(documentId, user.id, selectedRole)
      if (result) {
        setPermissions((prev) => [...prev, result])
        setSearchResults((prev) => prev.filter((u) => u.id !== user.id))
        setSearchKeyword('')
        showToast('添加成功', 'success')
        onUpdated?.()
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '添加失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('确定要移除该成员的访问权限吗？')) return
    try {
      setSubmitting(true)
      await removeDocPermission(documentId, userId)
      setPermissions((prev) => prev.filter((p) => p.userId !== userId))
      showToast('已移除', 'success')
      onUpdated?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '移除失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateRole = async (permissionId: string, newRole: string) => {
    // 使用 addDocPermission 来更新角色（通常后端会是 upsert 逻辑）
    // 这里我们先移除再加回来模拟更新
    const perm = permissions.find((p) => p.id === permissionId)
    if (!perm) return

    try {
      setSubmitting(true)
      const result = await addDocPermission(documentId, perm.userId, newRole)
      if (result) {
        setPermissions((prev) =>
          prev.map((p) => (p.id === permissionId ? { ...p, role: newRole } : p))
        )
        showToast('权限已更新', 'success')
        onUpdated?.()
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleShareTypeChange = async (shareType: ShareType) => {
    try {
      setUpdatingShare(true)
      const data: UpdateDocShareRequest = { shareType }
      const result = await updateDocShare(documentId, data)
      if (result) {
        setDocShare(result)
        showToast('分享设置已更新', 'success')
        onUpdated?.()
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setUpdatingShare(false)
    }
  }

  const handleLinkToggle = async (enabled: boolean) => {
    try {
      setUpdatingShare(true)
      const data: UpdateDocShareRequest = { linkEnabled: enabled }
      const result = await updateDocShare(documentId, data)
      if (result) {
        setDocShare(result)
        showToast(enabled ? '链接分享已开启' : '链接分享已关闭', 'success')
        onUpdated?.()
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setUpdatingShare(false)
    }
  }

  const handleLinkRoleChange = async (role: string) => {
    try {
      setUpdatingShare(true)
      const data: UpdateDocShareRequest = { linkRole: role }
      const result = await updateDocShare(documentId, data)
      if (result) {
        setDocShare(result)
        showToast('链接权限已更新', 'success')
        onUpdated?.()
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setUpdatingShare(false)
    }
  }

  const handleTeamRoleChange = async (role: string) => {
    try {
      setUpdatingShare(true)
      const data: UpdateDocShareRequest = { teamRole: role }
      const result = await updateDocShare(documentId, data)
      if (result) {
        setDocShare(result)
        showToast('团队权限已更新', 'success')
        onUpdated?.()
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setUpdatingShare(false)
    }
  }

  const handleCopyLink = async () => {
    if (!docShare?.linkToken) return

    const link = `${window.location.origin}/doc/share/${docShare.linkToken}`
    try {
      await navigator.clipboard.writeText(link)
      setCopying(true)
      showToast('链接已复制到剪贴板', 'success')
      setTimeout(() => setCopying(false), 2000)
    } catch {
      showToast('复制失败，请手动复制', 'error')
    }
  }

  const getCurrentUserRole = (): string => {
    if (docShare?.canManage) return '管理员'
    const myPermission = permissions.find((p) => p.userId === currentUser?.id)
    if (myPermission) {
      return roleLabels[myPermission.role as DocRole] || myPermission.role
    }
    return '可阅读'
  }

  const handleClose = () => {
    if (!submitting && !updatingShare) {
      onClose()
    }
  }

  if (!visible) return null

  const currentShareType = (docShare?.shareType as ShareType) || 'private'

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">分享文档</h3>
              <p className="text-xs text-gray-500 mt-1">
                当前角色：<span className="font-medium text-gray-700">{getCurrentUserRole()}</span>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-3">分享范围</h4>
              <div className="space-y-2">
                {(Object.keys(shareTypeLabels) as ShareType[]).map((type) => (
                  <div
                    key={type}
                    onClick={() => !updatingShare && handleShareTypeChange(type)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      currentShareType === type
                        ? 'border-[#3370FF] bg-[#3370FF]/5'
                        : 'border-gray-100 hover:border-gray-200'
                    } ${updatingShare ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            currentShareType === type
                              ? 'border-[#3370FF] bg-[#3370FF]'
                              : 'border-gray-300'
                          }`}
                        >
                          {currentShareType === type && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {shareTypeLabels[type].label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {shareTypeLabels[type].desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {currentShareType === 'team' && docShare && (
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">团队成员默认权限</span>
                  <select
                    value={docShare.teamRole || 'viewer'}
                    onChange={(e) => handleTeamRoleChange(e.target.value)}
                    disabled={updatingShare}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 disabled:opacity-50"
                  >
                    <option value="viewer">可阅读</option>
                    <option value="commenter">可评论</option>
                    <option value="editor">可编辑</option>
                  </select>
                </div>
              </div>
            )}

            {currentShareType === 'link' && docShare && (
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">链接分享</span>
                  </div>
                  <button
                    onClick={() => handleLinkToggle(!docShare.linkEnabled)}
                    disabled={updatingShare}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      docShare.linkEnabled ? 'bg-[#3370FF]' : 'bg-gray-300'
                    } ${updatingShare ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        docShare.linkEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {docShare.linkEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-20">权限级别</span>
                      <select
                        value={docShare.linkRole || 'viewer'}
                        onChange={(e) => handleLinkRoleChange(e.target.value)}
                        disabled={updatingShare}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 disabled:opacity-50"
                      >
                        <option value="viewer">可阅读</option>
                        <option value="commenter">可评论</option>
                        <option value="editor">可编辑</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg">
                        <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="text-xs text-gray-500 truncate flex-1">
                          {docShare.linkToken
                            ? `${window.location.origin}/doc/share/${docShare.linkToken}`
                            : '生成中...'}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        disabled={copying || !docShare.linkToken}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          copying
                            ? 'bg-green-100 text-green-600'
                            : 'bg-[#3370FF] text-white hover:bg-[#2a5fd9]'
                        } disabled:opacity-50`}
                      >
                        {copying ? '已复制' : '复制链接'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">成员权限</h4>

              <div className="relative mb-4">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索用户添加成员..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-24 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as DocRole)}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                  >
                    <option value="viewer">可阅读</option>
                    <option value="commenter">可评论</option>
                    <option value="editor">可编辑</option>
                  </select>
                </div>

                {searchKeyword && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-[240px] overflow-y-auto z-10">
                    {searching ? (
                      <div className="px-4 py-3 text-xs text-gray-400 text-center">搜索中...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-400 text-center">没有找到匹配的用户</div>
                    ) : (
                      searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleAddMember(user)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={user.avatar || undefined}
                              size="sm"
                              nickname={user.nickname}
                            />
                            <div>
                              <p className="text-sm text-gray-900">{user.nickname}</p>
                              {user.email && (
                                <p className="text-xs text-gray-400">{user.email}</p>
                              )}
                            </div>
                          </div>
                          <button
                            disabled={submitting}
                            className="px-3 py-1 bg-[#3370FF] text-white text-xs rounded-lg hover:bg-[#2a5fd9] transition-colors disabled:opacity-50"
                          >
                            添加
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="w-6 h-6 text-[#3370FF] animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : permissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-400 text-sm">暂无成员，搜索用户添加</p>
                  </div>
                ) : (
                  permissions.map((perm) => {
                    const isMe = perm.userId === currentUser?.id
                    const canManage = docShare?.canManage

                    return (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={perm.user.avatar || undefined}
                            size="sm"
                            nickname={perm.user.nickname}
                          />
                          <div>
                            <p className="text-sm text-gray-900">
                              {perm.user.nickname}
                              {isMe && (
                                <span className="text-gray-400 font-normal ml-1">（我）</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">{perm.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManage && !isMe ? (
                            <select
                              value={perm.role}
                              onChange={(e) => handleUpdateRole(perm.id, e.target.value)}
                              disabled={submitting}
                              className="px-2 py-1 bg-gray-100 border border-transparent rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white focus:border-[#3370FF]/20 disabled:opacity-50"
                            >
                              <option value="viewer">可阅读</option>
                              <option value="commenter">可评论</option>
                              <option value="editor">可编辑</option>
                              <option value="admin">管理员</option>
                            </select>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                              {roleLabels[perm.role as DocRole] || perm.role}
                            </span>
                          )}
                          {canManage && !isMe && (
                            <button
                              onClick={() => handleRemoveMember(perm.userId)}
                              disabled={submitting}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="移除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex items-center justify-end">
            <button
              onClick={handleClose}
              disabled={submitting || updatingShare}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default DocShareModal
