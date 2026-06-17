import { useState, useEffect } from 'react'
import {
  getConversationMembers,
  addMembers,
  updateMemberRole,
  removeMember,
  updateConversation,
  leaveConversation,
  deleteConversation
} from '../../api/conversations'
import { getContacts } from '../../api/contacts'
import type { Conversation, ConversationMember, Contact } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

interface GroupInfoPanelProps {
  visible: boolean
  onClose: () => void
  conversation: Conversation | null
  currentUserId: string
  onConversationUpdated: () => void
}

type TabType = 'info' | 'members' | 'settings'

function GroupInfoPanel({
  visible,
  onClose,
  conversation,
  currentUserId,
  onConversationUpdated
}: GroupInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [members, setMembers] = useState<ConversationMember[]>([])
  const [editingName, setEditingName] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [announcementInput, setAnnouncementInput] = useState('')
  const [avatarInput, setAvatarInput] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (visible && conversation) {
      loadMembers()
      setNameInput(conversation.name || '')
      setAnnouncementInput(conversation.announcement || '')
      setAvatarInput(conversation.avatar || '')
    }
  }, [visible, conversation])

  useEffect(() => {
    if (showInviteModal) {
      loadContacts()
    }
  }, [showInviteModal])

  const loadMembers = async () => {
    if (!conversation) return
    try {
      setLoading(true)
      const data = await getConversationMembers(conversation.id)
      setMembers(data || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载成员失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const data = await getContacts()
      setContacts(data || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载联系人失败', 'error')
    }
  }

  const isOwner = conversation?.role === 'owner'
  const isAdmin = conversation?.role === 'owner' || conversation?.role === 'admin'

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'owner':
        return '群主'
      case 'admin':
        return '管理员'
      default:
        return '成员'
    }
  }

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'owner':
        return 'text-orange-500 bg-orange-50'
      case 'admin':
        return 'text-blue-500 bg-blue-50'
      default:
        return 'text-gray-500 bg-gray-50'
    }
  }

  const handleUpdateName = async () => {
    if (!conversation || !nameInput.trim()) return
    try {
      setSubmitting(true)
      await updateConversation(conversation.id, { name: nameInput.trim() })
      setEditingName(false)
      showToast('群名称已更新', 'success')
      onConversationUpdated()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateAnnouncement = async () => {
    if (!conversation) return
    try {
      setSubmitting(true)
      await updateConversation(conversation.id, { announcement: announcementInput.trim() })
      setEditingAnnouncement(false)
      showToast('群公告已更新', 'success')
      onConversationUpdated()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateAvatar = async () => {
    if (!conversation) return
    try {
      setSubmitting(true)
      await updateConversation(conversation.id, { avatar: avatarInput.trim() || undefined })
      showToast('群头像已更新', 'success')
      onConversationUpdated()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, role: string) => {
    if (!conversation) return
    try {
      setSubmitting(true)
      await updateMemberRole(conversation.id, memberId, role)
      await loadMembers()
      showToast('角色已更新', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!conversation) return
    if (!window.confirm('确定要移除该成员吗？')) return
    try {
      setSubmitting(true)
      await removeMember(conversation.id, memberId)
      await loadMembers()
      showToast('成员已移除', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '移除失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInviteMembers = async () => {
    if (!conversation || selectedMemberIds.size === 0) return
    try {
      setSubmitting(true)
      await addMembers(conversation.id, Array.from(selectedMemberIds))
      await loadMembers()
      setShowInviteModal(false)
      setSelectedMemberIds(new Set())
      showToast('成员已添加', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '添加失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!conversation) return
    if (isOwner) {
      if (!window.confirm('确定要解散该群聊吗？解散后所有成员将无法访问。')) return
    } else {
      if (!window.confirm('确定要退出该群聊吗？')) return
    }
    try {
      setSubmitting(true)
      if (isOwner) {
        await deleteConversation(conversation.id)
      } else {
        await leaveConversation(conversation.id)
      }
      showToast(isOwner ? '群聊已解散' : '已退出群聊', 'success')
      onClose()
      onConversationUpdated()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || (isOwner ? '解散失败' : '退出失败'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMemberSelect = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const existingMemberIds = new Set(members.map((m) => m.userId))
  const filteredContacts = contacts.filter((c) => {
    if (existingMemberIds.has(c.contactId)) return false
    if (!searchKeyword) return true
    return c.user.nickname.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  if (!visible || !conversation) return null

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[360px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">群信息</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {(['info', 'members', 'settings'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-[#3370FF] border-b-2 border-[#3370FF]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'info' ? '群信息' : tab === 'members' ? '群成员' : '设置'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'info' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar
                  src={conversation.avatar || undefined}
                  size="xl"
                  nickname={conversation.name || '群'}
                />
                <div className="flex-1">
                  {editingName ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                        autoFocus
                      />
                      <button
                        onClick={handleUpdateName}
                        disabled={submitting || !nameInput.trim()}
                        className="px-3 py-1.5 bg-[#3370FF] text-white rounded-lg text-sm disabled:opacity-50"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false)
                          setNameInput(conversation.name || '')
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h4 className="text-lg font-semibold text-gray-900">{conversation.name || '群聊'}</h4>
                      {isAdmin && (
                        <button
                          onClick={() => setEditingName(true)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{members.length} 位成员</p>
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">群头像 URL</label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={avatarInput || ''}
                      onChange={(e) => setAvatarInput(e.target.value)}
                      placeholder="请输入头像图片链接"
                      className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                    />
                    <button
                      onClick={handleUpdateAvatar}
                      disabled={submitting}
                      className="px-4 py-2 bg-[#3370FF] text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      保存
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">群公告</label>
                  {isAdmin && !editingAnnouncement && (
                    <button
                      onClick={() => setEditingAnnouncement(true)}
                      className="text-xs text-[#3370FF] hover:text-[#2a5fd9]"
                    >
                      编辑
                    </button>
                  )}
                </div>
                {editingAnnouncement ? (
                  <div className="space-y-2">
                    <textarea
                      value={announcementInput}
                      onChange={(e) => setAnnouncementInput(e.target.value)}
                      placeholder="请输入群公告..."
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 resize-none"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={handleUpdateAnnouncement}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-[#3370FF] text-white rounded-lg text-sm disabled:opacity-50"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingAnnouncement(false)
                          setAnnouncementInput(conversation.announcement || '')
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    {conversation.announcement ? (
                      <p className="text-sm text-yellow-800">{conversation.announcement}</p>
                    ) : (
                      <p className="text-sm text-yellow-600 italic">暂无群公告</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">群类型</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-sm text-gray-600">
                    {conversation.subtype === 'department' ? '部门群' :
                     conversation.subtype === 'team' ? '项目群' : '普通群'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="p-4">
              {isAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full flex items-center justify-center space-x-2 py-3 mb-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-[#3370FF] hover:text-[#3370FF] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm font-medium">添加成员</span>
                </button>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-6 h-6 text-[#3370FF] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : (
                <div className="space-y-1">
                  {members
                    .sort((a, b) => {
                      const roleOrder = { owner: 0, admin: 1, member: 2 }
                      return (roleOrder[a.role as keyof typeof roleOrder] || 2) - (roleOrder[b.role as keyof typeof roleOrder] || 2)
                    })
                    .map((member) => {
                      const isCurrentUser = member.userId === currentUserId
                      return (
                        <div
                          key={member.id}
                          className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <Avatar
                            src={member.user.avatar || undefined}
                            size="md"
                            nickname={member.user.nickname}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {member.user.nickname}
                                {isCurrentUser && <span className="text-gray-400 font-normal">（我）</span>}
                              </p>
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getRoleColor(member.role)}`}>
                                {getRoleLabel(member.role)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                          </div>
                          {isAdmin && !isCurrentUser && member.role !== 'owner' && (
                            <div className="flex items-center space-x-1">
                              {member.role !== 'admin' && (
                                <button
                                  onClick={() => handleUpdateMemberRole(member.userId, 'admin')}
                                  disabled={submitting}
                                  className="p-1.5 text-gray-400 hover:text-[#3370FF] hover:bg-blue-50 rounded-lg transition-colors"
                                  title="设为管理员"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                </button>
                              )}
                              {member.role === 'admin' && (
                                <button
                                  onClick={() => handleUpdateMemberRole(member.userId, 'member')}
                                  disabled={submitting}
                                  className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="取消管理员"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={submitting}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="移除成员"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <button
                  onClick={handleLeaveGroup}
                  disabled={submitting}
                  className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    isOwner
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{isOwner ? '解散群聊' : '退出群聊'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">添加成员</h3>
              <p className="text-sm text-gray-500 mt-1">选择要添加的联系人</p>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索联系人"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-400 text-sm">暂无可添加的联系人</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredContacts.map((contact) => {
                    const isSelected = selectedMemberIds.has(contact.contactId)
                    return (
                      <div
                        key={contact.id}
                        onClick={() => toggleMemberSelect(contact.contactId)}
                        className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#3370FF]/10'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <Avatar
                          src={contact.user.avatar || undefined}
                          size="md"
                          nickname={contact.user.nickname}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#3370FF]' : 'text-gray-900'}`}>
                            {contact.remark || contact.user.nickname}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{contact.user.email}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#3370FF] border-[#3370FF]'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">已选择 {selectedMemberIds.size} 人</span>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-all"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleInviteMembers}
                  disabled={submitting || selectedMemberIds.size === 0}
                  className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all"
                >
                  {submitting ? '添加中...' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GroupInfoPanel
