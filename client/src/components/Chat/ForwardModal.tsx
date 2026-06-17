import { useState, useEffect } from 'react'
import { getConversations, forwardMessage } from '../../api/conversations'
import type { Conversation, Message } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

interface ForwardModalProps {
  visible: boolean
  onClose: () => void
  message: Message | null
  conversationId: string
}

function ForwardModal({ visible, onClose, message, conversationId }: ForwardModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (visible) {
      loadConversations()
    }
  }, [visible])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await getConversations()
      setConversations(data?.filter((c) => c.id !== conversationId) || [])
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

  const filteredConversations = conversations.filter((conv) => {
    if (!searchKeyword) return true
    const name = getConversationName(conv)
    return name.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!message || selectedIds.size === 0) return

    try {
      setSubmitting(true)
      await forwardMessage(conversationId, message.id, {
        targetConversationIds: Array.from(selectedIds)
      })
      showToast('转发成功', 'success')
      handleClose()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '转发失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setSelectedIds(new Set())
      setSearchKeyword('')
      onClose()
    }
  }

  if (!visible || !message) return null

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={handleClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">转发消息</h3>
            <p className="text-sm text-gray-500 mt-1">选择要转发到的会话</p>
          </div>

          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索会话"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-2">待转发消息</p>
            <div className="bg-white rounded-lg p-3 text-sm text-gray-700">
              {message.type === 'text' ? message.content : `[${message.type === 'image' ? '图片' : message.type === 'file' ? '文件' : '消息'}]`}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-6 h-6 text-[#3370FF] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-400 text-sm">暂无可转发的会话</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conv) => {
                  const name = getConversationName(conv)
                  const isSelected = selectedIds.has(conv.id)
                  const isGroup = conv.type === 'group'

                  return (
                    <div
                      key={conv.id}
                      onClick={() => toggleSelect(conv.id)}
                      className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#3370FF]/10'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative">
                        <Avatar
                          src={getConversationAvatar(conv) || undefined}
                          size="md"
                          nickname={name}
                        />
                        {isGroup && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M5 6a4 4 0 118 0 4 4 0 01-8 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#3370FF]' : 'text-gray-900'}`}>
                          {name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isGroup ? `${conv.memberCount || 0}人` : '单聊'}
                        </p>
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
            <span className="text-sm text-gray-500">
              已选择 {selectedIds.size} 个会话
            </span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || selectedIds.size === 0}
                className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all"
              >
                {submitting ? '转发中...' : '转发'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ForwardModal
