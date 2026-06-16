import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { getConversations } from '../../api/conversations'
import type { Conversation } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

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

function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
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
    return conv.otherUser?.avatar
  }

  const getConversationStatus = (conv: Conversation): 'online' | 'offline' | 'busy' | 'away' | undefined => {
    const s = conv.otherUser?.status
    if (s === 'online' || s === 'offline' || s === 'busy' || s === 'away') return s
    return undefined
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!searchKeyword) return true
    const name = getConversationName(conv)
    const lastMsg = conv.lastMessage || ''
    return name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="p-4 border-b border-gray-100 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">消息</h2>
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
            <p className="text-gray-500 text-sm">暂无会话，去添加好友开始聊天吧</p>
          </div>
        ) : (
          <div className="py-2">
            {filteredConversations.map((conv) => {
              const name = getConversationName(conv)
              const isActive = id === conv.id
              return (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/chats/${conv.id}`)}
                  className={`flex items-start space-x-3 px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-150 ${isActive ? 'bg-[#3370FF]/10' : 'hover:bg-white'}`}
                >
                  <Avatar
                    src={getConversationAvatar(conv) || undefined}
                    size="md"
                    nickname={name}
                    status={getConversationStatus(conv)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium text-sm truncate ${isActive ? 'text-[#3370FF]' : 'text-gray-900'}`}>
                        {name}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatConversationTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 truncate pr-2">
                        {conv.lastMessage || '暂无消息'}
                      </p>
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
    </>
  )
}

export default ConversationList
