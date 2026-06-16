import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getContacts,
  sendRequest,
  getReceivedRequests,
  getSentRequests,
  acceptRequest,
  rejectRequest,
  deleteContact
} from '../../api/contacts'
import { searchUsers } from '../../api/users'
import { createConversation } from '../../api/conversations'
import type { Contact, FriendRequest, User } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import { useAuthStore } from '../../store/auth'

type TabType = 'contacts' | 'requests'

function ContactList() {
  const [activeTab, setActiveTab] = useState<TabType>('contacts')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; contact: Contact } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; contact: Contact | null }>({ show: false, contact: null })
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set())
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [contactsData, receivedData, sentData] = await Promise.all([
        getContacts(),
        getReceivedRequests(),
        getSentRequests()
      ])
      setContacts(contactsData || [])
      setReceivedRequests(receivedData || [])
      setSentRequests(sentData || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchUsers = async () => {
    if (!searchEmail.trim()) return
    try {
      setSearching(true)
      const results = await searchUsers(searchEmail.trim())
      setSearchResults(results || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '搜索失败', 'error')
    } finally {
      setSearching(false)
    }
  }

  const handleSendRequest = async (userId: string) => {
    try {
      setActionLoadingIds((prev) => new Set(prev).add(`send-${userId}`))
      await sendRequest(userId)
      showToast('好友申请已发送', 'success')
      await loadAllData()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '发送申请失败', 'error')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(`send-${userId}`)
        return next
      })
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setActionLoadingIds((prev) => new Set(prev).add(`accept-${requestId}`))
      await acceptRequest(requestId)
      showToast('已接受好友申请', 'success')
      await loadAllData()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(`accept-${requestId}`)
        return next
      })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      setActionLoadingIds((prev) => new Set(prev).add(`reject-${requestId}`))
      await rejectRequest(requestId)
      showToast('已拒绝好友申请', 'info')
      await loadAllData()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(`reject-${requestId}`)
        return next
      })
    }
  }

  const handleStartChat = async (contact: Contact) => {
    setContextMenu(null)
    try {
      const conv = await createConversation(contact.contactId)
      if (conv) {
        navigate(`/chats/${conv.id}`)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '创建会话失败', 'error')
    }
  }

  const handleDeleteContact = async () => {
    const contact = deleteModal.contact
    if (!contact) return
    try {
      setActionLoadingIds((prev) => new Set(prev).add(`delete-${contact.id}`))
      await deleteContact(contact.id)
      showToast('已删除好友', 'success')
      setDeleteModal({ show: false, contact: null })
      await loadAllData()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '删除失败', 'error')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(`delete-${contact?.id || ''}`)
        return next
      })
    }
  }

  const handleContextMenu = (e: React.MouseEvent, contact: Contact) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, contact })
  }

  const pendingCount = receivedRequests.filter((r) => r.status === 'pending').length
  const contactIds = new Set(contacts.map((c) => c.contactId))
  const sentRequestUserIds = new Set(
    sentRequests.filter((r) => r.status === 'pending').map((r) => r.toId)
  )

  const filteredContacts = contacts.filter((c) => {
    if (!searchKeyword) return true
    const name = c.remark || c.user.nickname || c.user.email
    return name.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">联系人</h2>
          <button
            onClick={() => {
              setShowSearchModal(true)
              setSearchEmail('')
              setSearchResults([])
            }}
            className="p-2 rounded-lg text-[#3370FF] hover:bg-[#3370FF]/10 transition-colors"
            title="添加好友"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all duration-150 ${activeTab === 'contacts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            联系人
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all duration-150 flex items-center justify-center gap-1.5 ${activeTab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            新的好友
            {pendingCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        </div>
        {activeTab === 'contacts' && (
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索联系人"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'contacts' ? (
          filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">{searchKeyword ? '没有找到匹配的联系人' : '暂无联系人，点击右上角添加好友吧'}</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredContacts.map((contact) => {
                const displayName = contact.remark || contact.user.nickname
                const status = (contact.user.status === 'online' || contact.user.status === 'offline' || contact.user.status === 'busy' || contact.user.status === 'away')
                  ? contact.user.status
                  : undefined
                return (
                  <div
                    key={contact.id}
                    onContextMenu={(e) => handleContextMenu(e, contact)}
                    className="flex items-center space-x-3 px-3 py-2.5 mx-2 rounded-lg cursor-pointer hover:bg-white transition-all duration-150"
                  >
                    <Avatar
                      src={contact.user.avatar || undefined}
                      size="md"
                      nickname={displayName}
                      status={status}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {contact.user.email}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div className="py-2">
            {receivedRequests.filter((r) => r.status === 'pending').length > 0 && (
              <div className="px-3 py-2">
                <p className="text-xs font-medium text-gray-500 mb-2 px-1">收到的申请</p>
                <div className="space-y-1">
                  {receivedRequests.filter((r) => r.status === 'pending').map((req) => {
                    const sender = req.from
                    const isAcceptLoading = actionLoadingIds.has(`accept-${req.id}`)
                    const isRejectLoading = actionLoadingIds.has(`reject-${req.id}`)
                    return (
                      <div key={req.id} className="flex items-center space-x-3 px-2 py-2.5 rounded-lg hover:bg-white transition-all">
                        <Avatar
                          src={sender?.avatar || undefined}
                          size="md"
                          nickname={sender?.nickname || '用户'}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {sender?.nickname || '未知用户'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {sender?.email || ''}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            disabled={isAcceptLoading}
                            className="px-3 py-1.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 text-white rounded-md text-xs font-medium transition-all"
                          >
                            {isAcceptLoading ? '处理中...' : '接受'}
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            disabled={isRejectLoading}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-md text-xs font-medium transition-all"
                          >
                            {isRejectLoading ? '...' : '拒绝'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {sentRequests.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-100 mt-2">
                <p className="text-xs font-medium text-gray-500 mb-2 px-1">发出的申请</p>
                <div className="space-y-1">
                  {sentRequests.map((req) => {
                    const receiver = req.to
                    return (
                      <div key={req.id} className="flex items-center space-x-3 px-2 py-2.5 rounded-lg hover:bg-white transition-all">
                        <Avatar
                          src={receiver?.avatar || undefined}
                          size="md"
                          nickname={receiver?.nickname || '用户'}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {receiver?.nickname || '未知用户'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {receiver?.email || ''}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-md shrink-0 ${req.status === 'pending' ? 'bg-amber-50 text-amber-600' : req.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                          {req.status === 'pending' ? '等待中' : req.status === 'rejected' ? '已拒绝' : '已通过'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {receivedRequests.filter((r) => r.status === 'pending').length === 0 && sentRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">暂无好友申请</p>
              </div>
            )}
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-32 overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleStartChat(contextMenu.contact)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            发消息
          </button>
          <button
            onClick={() => {
              setDeleteModal({ show: true, contact: contextMenu.contact })
              setContextMenu(null)
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            删除好友
          </button>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDeleteModal({ show: false, contact: null })}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">删除好友</h3>
            <p className="text-sm text-gray-500 mb-6">
              确定要删除好友 <span className="font-medium text-gray-700">{deleteModal.contact?.remark || deleteModal.contact?.user.nickname}</span> 吗？删除后无法恢复。
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ show: false, contact: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
              >
                取消
              </button>
              <button
                onClick={handleDeleteContact}
                disabled={actionLoadingIds.has(`delete-${deleteModal.contact?.id}`)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
              >
                {actionLoadingIds.has(`delete-${deleteModal.contact?.id}`) ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowSearchModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">添加好友</h3>
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="email"
                    placeholder="输入邮箱搜索用户"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                  />
                </div>
                <button
                  onClick={handleSearchUsers}
                  disabled={searching || !searchEmail.trim()}
                  className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all"
                >
                  {searching ? '搜索中...' : '搜索'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {searchEmail ? '没有找到匹配的用户' : '输入邮箱搜索用户'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((user) => {
                    const isSelf = user.id === currentUser?.id
                    const isFriend = contactIds.has(user.id)
                    const isSentPending = sentRequestUserIds.has(user.id)
                    const isLoading = actionLoadingIds.has(`send-${user.id}`)
                    const status = (user.status === 'online' || user.status === 'offline' || user.status === 'busy' || user.status === 'away')
                      ? user.status
                      : undefined
                    return (
                      <div key={user.id} className="flex items-center space-x-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-all">
                        <Avatar
                          src={user.avatar || undefined}
                          size="md"
                          nickname={user.nickname}
                          status={status}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {user.nickname}
                            {isSelf && <span className="ml-2 text-xs text-gray-400">(我)</span>}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        {!isSelf && (
                          <button
                            onClick={() => handleSendRequest(user.id)}
                            disabled={isFriend || isSentPending || isLoading}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${isFriend ? 'bg-green-50 text-green-600 cursor-default' : isSentPending ? 'bg-amber-50 text-amber-600 cursor-default' : 'bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 text-white'}`}
                          >
                            {isFriend ? '已添加' : isSentPending ? '已发送' : isLoading ? '发送中...' : '添加'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowSearchModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ContactList
