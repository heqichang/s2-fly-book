import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { getMessages, sendMessage, markAsRead, getConversations } from '../../api/conversations'
import type { Message, Conversation } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import { useAuthStore } from '../../store/auth'
import { useSocketStore } from '../../store/socket'

function MessageStatusIcon({ status }: { status: string }) {
  if (status === 'sending') {
    return (
      <svg className="w-3 h-3 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )
  }
  if (status === 'sent') {
    return (
      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41zM18 7l-1.41-1.41-6.34 6.34 1.41 1.41z" />
      </svg>
    )
  }
  if (status === 'read') {
    return (
      <svg className="w-4 h-4 text-[#3370FF]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
      </svg>
    )
  }
  return null
}

function ChatWindow() {
  const { id } = useParams()
  const { user: currentUser } = useAuthStore()
  const { socket, addSocketListener } = useSocketStore()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [textAreaHeight, setTextAreaHeight] = useState(40)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const [failedMessageIds, setFailedMessageIds] = useState<Set<string>>(new Set())
  const { toast, showToast, hideToast } = useToast()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (id) {
      loadConversation()
      loadMessages()
      handleMarkAsRead()
    }
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (!id || !socket) return

    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === id) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.message.id)
          if (exists) return prev
          return [...prev, data.message]
        })
        handleMarkAsRead()
      }
    }

    addSocketListener('new_message', handleNewMessage as never)
  }, [id, socket, addSocketListener])

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto'
      const newHeight = Math.min(textAreaRef.current.scrollHeight, 150)
      setTextAreaHeight(Math.max(newHeight, 40))
    }
  }, [inputText])

  const loadConversation = async () => {
    try {
      const convs = await getConversations()
      const found = convs?.find((c) => c.id === id) || null
      setConversation(found)
    } catch {
      // ignore
    }
  }

  const loadMessages = async () => {
    if (!id) return
    try {
      setLoadingMessages(true)
      const data = await getMessages(id)
      setMessages(data?.messages || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载消息失败', 'error')
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleMarkAsRead = async () => {
    if (!id) return
    try {
      await markAsRead(id)
    } catch {
      // ignore
    }
  }

  const handleSend = async (originalMessage?: Message) => {
    if (!id) return
    const content = originalMessage ? originalMessage.content : inputText.trim()
    if (!content) return

    let tempId = originalMessage?.id
    if (!originalMessage) {
      tempId = `temp-${Date.now()}`
      const tempMessage: Message = {
        id: tempId,
        conversationId: id,
        senderId: currentUser?.id || '',
        type: 'text',
        content,
        status: 'sending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: currentUser ? {
          id: currentUser.id,
          nickname: currentUser.nickname,
          avatar: currentUser.avatar || null
        } : undefined
      }
      setMessages((prev) => [...prev, tempMessage])
      setInputText('')
      if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto'
        setTextAreaHeight(40)
      }
    } else {
      setFailedMessageIds((prev) => {
        const next = new Set(prev)
        next.delete(tempId!)
        return next
      })
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sending' } : m))
      )
    }

    try {
      const sentMessage = await sendMessage(id, content, 'text')
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...sentMessage, status: 'sent' } as Message : m))
      )
    } catch (err: unknown) {
      setFailedMessageIds((prev) => new Set(prev).add(tempId!))
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      )
      const error = err as { message?: string }
      showToast(error.message || '发送失败', 'error')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!id) {
    return (
      <>
        <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
        <div className="h-full flex flex-col items-center justify-center bg-gray-50">
          <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-[#3370FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-gray-500 text-base">选择一个会话开始聊天</p>
          <p className="text-gray-400 text-sm mt-2">左侧选择已有会话，或添加新好友开启新对话</p>
        </div>
      </>
    )
  }

  const otherUser = conversation?.otherUser
  const conversationName = conversation?.name || otherUser?.nickname || '聊天'
  const conversationAvatar = otherUser?.avatar || undefined
  const conversationStatus = (otherUser?.status === 'online' || otherUser?.status === 'offline' || otherUser?.status === 'busy' || otherUser?.status === 'away')
    ? otherUser.status
    : undefined

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="h-full flex flex-col bg-white">
        <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <Avatar
              src={conversationAvatar}
              size="md"
              nickname={conversationName}
              status={conversationStatus}
            />
            <div>
              <h3 className="font-semibold text-gray-900">{conversationName}</h3>
              <p className="text-xs text-gray-500">
                {conversationStatus === 'online' ? '在线' :
                 conversationStatus === 'busy' ? '忙碌' :
                 conversationStatus === 'away' ? '离开' : '离线'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
          {loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full">
              <svg className="w-8 h-8 text-[#3370FF] animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-400 text-sm">加载消息中...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">暂无消息，发送第一条消息吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isMine = msg.senderId === currentUser?.id
                const isFailed = failedMessageIds.has(msg.id)
                const senderName = msg.sender?.nickname || '用户'
                const senderAvatar = msg.sender?.avatar || undefined

                return (
                  <div key={msg.id} className={`flex items-end gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <Avatar
                      src={senderAvatar}
                      size="sm"
                      nickname={senderName}
                    />
                    <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && (
                        <span className="text-xs text-gray-400 mb-1 ml-1">{senderName}</span>
                      )}
                      <div className="flex items-end gap-2">
                        {isMine && isFailed && (
                          <button
                            onClick={() => handleSend(msg)}
                            className="text-red-500 hover:text-red-600 shrink-0 p-1"
                            title="重新发送"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                          </button>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${isMine ? 'bg-[#3370FF] text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'}`}>
                          {msg.content}
                        </div>
                        {!isMine && <div className="w-4" />}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                        {isMine && <MessageStatusIcon status={msg.status} />}
                        <span className="text-[10px] text-gray-400">
                          {dayjs(msg.createdAt).format('HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-white px-6 py-4 shrink-0">
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-1 pb-2">
              <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={textAreaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                style={{ height: textAreaHeight }}
                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all placeholder-gray-400 border border-transparent focus:border-[#3370FF]/20"
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ChatWindow
