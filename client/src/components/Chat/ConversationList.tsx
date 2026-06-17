import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { getConversations, markAllAsRead } from '../../api/conversations'
import type { Conversation } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import CreateGroupModal from './CreateGroupModal'

function formatConversationTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  const date = dayjs(dateStr)
  const now = dayjs()
  if (date.isSame(now, 'day')) {
    return date.format('HH:mm')
  }
  if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天'
  }
  if (date.isSame(now, 'year')) {
    return date.format('MM-DD')
  }
  return date.format('YYYY-MM-DD')
}

function getGroupTypeLabel(subtype?: string | null): string {
  switch (subtype) {
    case 'department':
      return '部门群'
    case 'team':
      return '项目群'
    default:
      return '普通群'
  }
}

function getGroupTypeColor(subtype?: string | null): string {
  switch (subtype) {
    case 'department':
      return 'bg-purple-100 text-purple-600'
    case 'team':
      return 'bg-blue-100 text-blue-600'
    default:
      return 'bg-green-100 text-green-600'
  }
}

function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const navigate = useNavigate()
  const { id } = useParams()
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await getConversations()
      setConversations(data || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载会话失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getConversationName = (conv: Conversation): string => {
    if (conv.name) return conv.name
    return conv.otherUser?.nickname || '未知用户'
  }

  const getConversationAvatar = (conv: Conversation): string | null | undefined => {
    return conv.otherUser?.avatar || conv.avatar
  }

  const getConversationStatus = (conv: Conversation): 'online' | 'offline' | 'busy' | 'away' | undefined => {
    const s = conv.otherUser?.status
    if (s === 'online' || s === 'offline' || s === 'busy' || s === 'away') return s
    return undefined
  }

  const getLastMessagePreview = (conv: Conversation): string => {
    if (!conv.lastMessage) return '暂无消息'
    if (conv.lastMessage.length > 30) {
      return conv.lastMessage.substring(0, 30) + '...'
    }
    return conv.lastMessage
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setConversations((prev) =>
        prev.map((c) => ({ ...c, unreadCount: 0 }))
      )
      showToast('已全部标为已读', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    }
  }

  const handleGroupCreated = (conversation: Conversation) => {
    setConversations((prev) => [conversation, ...prev])
    navigate(`/chats/${conversation.id}`)
    setShowCreateGroupModal(false)
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!searchKeyword) return true
    const name = getConversationName(conv)
    const lastMsg = conv.lastMessage || ''
    return name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  const isGroup = (conv: Conversation) => conv.type === 'group'

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">消息</h2>
          <div className="flex items-center space-x-1">
            {totalUnread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-2.5 py-1 text-xs text-gray-500 hover:text-[#3370FF] hover:bg-[#3370FF]/5 rounded-lg transition-colors"
              >
                全部已读
              </button>
            )}
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="p-2 text-gray-500 hover:text-[#3370FF] hover:bg-[#3370FF]/5 rounded-lg transition-colors"
              title="创建群聊"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜索会话"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-3 w-12 bg-gray-200 rounded" />
                  </div>
                  <div className="h-3 w-full bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">暂无会话</p>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="mt-4 px-4 py-2 text-sm text-[#3370FF] hover:bg-[#3370FF]/5 rounded-lg transition-colors"
            >
              创建群聊
            </button>
          </div>
        ) : (
          <div className="py-2">
            {filteredConversations.map((conv) => {
              const name = getConversationName(conv)
              const isActive = id === conv.id
              const isGroupConv = isGroup(conv)

              return (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/chats/${conv.id}`)}
                  className={`flex items-start space-x-3 px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-150 ${isActive ? 'bg-[#3370FF]/10' : 'hover:bg-white'}`}
                >
                  <div className="relative">
                    <Avatar
                      src={getConversationAvatar(conv) || undefined}
                      size="md"
                      nickname={name}
                      status={!isGroupConv ? getConversationStatus(conv) : undefined}
                    />
                    {isGroupConv && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M5 6a4 4 0 118 0 4 4 0 01-8 0z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className={`font-medium text-sm truncate ${isActive ? 'text-[#3370FF]' : 'text-gray-900'}`}>
                          {name}
                        </span>
                        {isGroupConv && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${getGroupTypeColor(conv.subtype)}`}>
                            {getGroupTypeLabel(conv.subtype)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatConversationTime(conv.lastMessageAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        {isGroupConv && conv.lastMessage && (
                          <span className="text-xs text-gray-400 mr-1 shrink-0">
                            {conv.lastMessage.split(':')[0]}:
                          </span>
                        )}
                        <p className="text-xs text-gray-500 truncate pr-2">
                          {getLastMessagePreview(conv)}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CreateGroupModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreated={handleGroupCreated}
      />
    </>
  )
}

export default ConversationList
