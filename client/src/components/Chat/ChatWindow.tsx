import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  getMessages,
  sendMessage,
  markAsRead,
  getConversations,
  getConversation,
  getPinnedMessages,
  recallMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  getConversationMembers
} from '../../api/conversations'
import { uploadFile, formatFileSize } from '../../api/files'
import type {
  Message,
  Conversation,
  PinnedMessage,
  ConversationMember,
  SendMessageRequest
} from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import { useAuthStore } from '../../store/auth'
import { useSocketStore } from '../../store/socket'
import MessageContextMenu from './MessageContextMenu'
import ForwardModal from './ForwardModal'
import GroupInfoPanel from './GroupInfoPanel'

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

interface MentionUser {
  id: string
  nickname: string
  avatar?: string | null
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [failedMessageIds, setFailedMessageIds] = useState<Set<string>>(new Set())
  const { toast, showToast, hideToast } = useToast()

  const [showMembersSidebar, setShowMembersSidebar] = useState(false)
  const [showGroupInfoPanel, setShowGroupInfoPanel] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [members, setMembers] = useState<ConversationMember[]>([])

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    position: { x: number; y: number }
    message: Message | null
  }>({ visible: false, position: { x: 0, y: 0 }, message: null })

  const [showForwardModal, setShowForwardModal] = useState(false)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)

  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)

  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null)

  const [imagePreview, setImagePreview] = useState<{ visible: boolean; url: string; name: string }>({
    visible: false,
    url: '',
    name: ''
  })

  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (id) {
      loadConversation()
      loadMessages()
      loadPinnedMessages()
      handleMarkAsRead()
      if (id && conversation?.type === 'group') {
        loadMembers()
      }
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

    const handleMessageRecalled = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId === id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, isRecalled: true, content: '消息已撤回' } : m
          )
        )
      }
    }

    const handleMessageDeleted = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId === id) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId))
      }
    }

    const handleMessagePinned = (data: { conversationId: string; pinnedMessage: PinnedMessage }) => {
      if (data.conversationId === id) {
        setPinnedMessages((prev) => {
          const exists = prev.some((p) => p.messageId === data.pinnedMessage.messageId)
          if (exists) return prev
          return [...prev, data.pinnedMessage]
        })
      }
    }

    const handleMessageUnpinned = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId === id) {
        setPinnedMessages((prev) => prev.filter((p) => p.messageId !== data.messageId))
      }
    }

    const handleMessageRead = (data: { conversationId: string }) => {
      if (data.conversationId === id) {
        loadConversation()
      }
    }

    const handleConversationUpdated = (data: { conversationId: string }) => {
      if (data.conversationId === id) {
        loadConversation()
        loadMembers()
      }
    }

    const unsubscribers = [
      addSocketListener('new_message', handleNewMessage as never),
      addSocketListener('message_recalled', handleMessageRecalled as never),
      addSocketListener('message_deleted', handleMessageDeleted as never),
      addSocketListener('message_pinned', handleMessagePinned as never),
      addSocketListener('message_unpinned', handleMessageUnpinned as never),
      addSocketListener('message_read', handleMessageRead as never),
      addSocketListener('conversation_updated', handleConversationUpdated as never)
    ]

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
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
      if (id) {
        const conv = await getConversation(id)
        setConversation(conv || null)
      }
    } catch {
      const convs = await getConversations()
      const found = convs?.find((c) => c.id === id) || null
      setConversation(found)
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

  const loadPinnedMessages = async () => {
    if (!id) return
    try {
      const data = await getPinnedMessages(id)
      setPinnedMessages(data || [])
    } catch {
      setPinnedMessages([])
    }
  }

  const loadMembers = async () => {
    if (!id) return
    try {
      const data = await getConversationMembers(id)
      setMembers(data || [])
    } catch {
      setMembers([])
    }
  }

  const handleMarkAsRead = async () => {
    if (!id) return
    try {
      await markAsRead(id)
    } catch {
    }
  }

  const getMentionUsers = (): MentionUser[] => {
    const search = mentionSearch.toLowerCase()
    const allUsers: MentionUser[] = [
      { id: 'all', nickname: '所有人' },
      ...members.map((m) => ({
        id: m.userId,
        nickname: m.user.nickname,
        avatar: m.user.avatar
      }))
    ]
    if (!search) return allUsers.slice(0, 10)
    return allUsers.filter((u) => u.nickname.toLowerCase().includes(search)).slice(0, 10)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart

    const lastAtIndex = value.lastIndexOf('@', cursorPos - 1)

    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1, cursorPos)
      if (!textAfterAt.includes(' ')) {
        setMentionStartPos(lastAtIndex)
        setMentionSearch(textAfterAt)
        setShowMentionList(true)
        setSelectedMentionIndex(0)

        if (textAreaRef.current) {
          const rect = textAreaRef.current.getBoundingClientRect()
          const lineHeight = 20
          const lines = value.substring(0, lastAtIndex).split('\n').length
          setMentionPosition({
            top: rect.top + lines * lineHeight - 10,
            left: rect.left + 10
          })
        }
      } else {
        setShowMentionList(false)
        setMentionStartPos(null)
      }
    } else {
      setShowMentionList(false)
      setMentionStartPos(null)
    }

    setInputText(value)
  }

  const insertMention = (user: MentionUser) => {
    if (mentionStartPos === null || !textAreaRef.current) return

    const mentionText = user.id === 'all' ? '@所有人 ' : `@${user.nickname} `
    const before = inputText.substring(0, mentionStartPos)
    const after = inputText.substring(mentionStartPos + mentionSearch.length + 1)
    const newValue = before + mentionText + after

    setInputText(newValue)
    setShowMentionList(false)
    setMentionStartPos(null)

    setTimeout(() => {
      if (textAreaRef.current) {
        const newPos = before.length + mentionText.length
        textAreaRef.current.focus()
        textAreaRef.current.setSelectionRange(newPos, newPos)
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionList) {
      const users = getMentionUsers()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => Math.min(prev + 1, users.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => Math.max(prev - 1, 0))
        return
      }
      if (e.key === 'Enter' && users.length > 0) {
        e.preventDefault()
        insertMention(users[selectedMentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentionList(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const parseMentions = (text: string): { userId: string; isAll?: boolean }[] => {
    const mentions: { userId: string; isAll?: boolean }[] = []
    const allMatch = text.match(/@所有人/g)
    if (allMatch) {
      mentions.push({ userId: currentUser?.id || '', isAll: true })
    }

    const userMentions = text.match(/@(\S+)/g) || []
    userMentions.forEach((mention) => {
      const nickname = mention.substring(1)
      if (nickname === '所有人') return
      const member = members.find((m) => m.user.nickname === nickname)
      if (member) {
        mentions.push({ userId: member.userId })
      }
    })

    return mentions
  }

  const handleSend = async (originalMessage?: Message) => {
    if (!id) return
    const content = originalMessage ? originalMessage.content : inputText.trim()
    if (!content && !originalMessage?.file) return

    const mentions = parseMentions(content)

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
        isRecalled: false,
        isDeleted: false,
        replyToId: replyToMessage?.id || null,
        replyTo: replyToMessage
          ? {
              id: replyToMessage.id,
              content: replyToMessage.content,
              type: replyToMessage.type,
              isRecalled: replyToMessage.isRecalled,
              sender: replyToMessage.sender
            }
          : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: currentUser
          ? {
              id: currentUser.id,
              nickname: currentUser.nickname,
              avatar: currentUser.avatar || null
            }
          : undefined,
        mentions: mentions.length > 0 ? mentions.map((m, i) => {
          const member = members.find((mem) => mem.userId === m.userId)
          const user = member?.user
          return {
            id: `temp-${i}`,
            messageId: tempId!,
            userId: m.userId,
            isAll: m.isAll || false,
            createdAt: new Date().toISOString(),
            user: {
              id: m.userId,
              email: user?.email || '',
              nickname: m.isAll ? '所有人' : (user?.nickname || ''),
              avatar: user?.avatar || null,
              createdAt: user?.createdAt || new Date().toISOString(),
              updatedAt: user?.updatedAt || new Date().toISOString()
            }
          }
        }) : undefined
      }
      setMessages((prev) => [...prev, tempMessage])
      setInputText('')
      setReplyToMessage(null)
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
      const request: SendMessageRequest = {
        content,
        type: 'text',
        replyToId: replyToMessage?.id,
        mentions: mentions.length > 0 ? mentions : undefined
      }
      const sentMessage = await sendMessage(id, request)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return

    try {
      setUploadingFile(true)
      setUploadProgress(0)

      const uploadedFile = await uploadFile(file, (progress) => {
        setUploadProgress(progress)
      })

      const tempId = `temp-${Date.now()}`
      const isImage = file.type.startsWith('image/')

      const tempMessage: Message = {
        id: tempId,
        conversationId: id,
        senderId: currentUser?.id || '',
        type: isImage ? 'image' : 'file',
        content: file.name,
        status: 'sending',
        isRecalled: false,
        isDeleted: false,
        file: {
          id: uploadedFile.id,
          name: uploadedFile.name,
          originalName: uploadedFile.originalName,
          mimeType: uploadedFile.mimeType,
          size: uploadedFile.size,
          url: uploadedFile.url,
          thumbnail: uploadedFile.thumbnail,
          icon: uploadedFile.icon,
          isImage: uploadedFile.isImage,
          createdAt: uploadedFile.createdAt
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: currentUser
          ? {
              id: currentUser.id,
              nickname: currentUser.nickname,
              avatar: currentUser.avatar || null
            }
          : undefined
      }
      setMessages((prev) => [...prev, tempMessage])

      const request: SendMessageRequest = {
        type: isImage ? 'image' : 'file',
        fileId: uploadedFile.id,
        content: file.name
      }
      const sentMessage = await sendMessage(id, request)
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...sentMessage, status: 'sent' } as Message : m))
      )
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '上传失败', 'error')
    } finally {
      setUploadingFile(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      message
    })
  }

  const handleCopyMessage = () => {
    if (!contextMenu.message) return
    navigator.clipboard.writeText(contextMenu.message.content)
    showToast('已复制到剪贴板', 'success')
  }

  const handleReplyMessage = () => {
    if (!contextMenu.message) return
    setReplyToMessage(contextMenu.message)
    textAreaRef.current?.focus()
  }

  const handleForwardMessage = () => {
    if (!contextMenu.message) return
    setForwardMessage(contextMenu.message)
    setShowForwardModal(true)
  }

  const handleRecallMessage = async () => {
    if (!contextMenu.message || !id) return
    try {
      await recallMessage(id, contextMenu.message.id)
      showToast('消息已撤回', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '撤回失败', 'error')
    }
  }

  const handleDeleteMessage = async () => {
    if (!contextMenu.message || !id) return
    if (!window.confirm('确定要删除这条消息吗？')) return
    try {
      await deleteMessage(id, contextMenu.message.id)
      showToast('消息已删除', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '删除失败', 'error')
    }
  }

  const handleTogglePinMessage = async () => {
    if (!contextMenu.message || !id) return
    const isPinned = pinnedMessages.some((p) => p.messageId === contextMenu.message?.id)
    try {
      if (isPinned) {
        await unpinMessage(id, contextMenu.message.id)
        showToast('已取消置顶', 'success')
      } else {
        await pinMessage(id, contextMenu.message.id)
        showToast('消息已置顶', 'success')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    }
  }

  const renderMessageContent = (message: Message) => {
    if (message.isRecalled) {
      return (
        <span className="text-gray-400 italic text-xs">消息已撤回</span>
      )
    }

    if (message.type === 'image' && message.file) {
      return (
        <div
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setImagePreview({ visible: true, url: message.file!.url, name: message.file!.originalName })}
        >
          {message.file.thumbnail ? (
            <img
              src={message.file.thumbnail}
              alt={message.file.originalName}
              className="max-w-[250px] max-h-[250px] rounded-lg object-cover"
            />
          ) : (
            <img
              src={message.file.url}
              alt={message.file.originalName}
              className="max-w-[250px] max-h-[250px] rounded-lg object-cover"
            />
          )}
        </div>
      )
    }

    if (message.type === 'file' && message.file) {
      return (
        <a
          href={message.file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-3 p-3 rounded-lg bg-white/50 min-w-[200px]"
          download
        >
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {message.file.icon ? (
              <span className="text-2xl">{message.file.icon}</span>
            ) : (
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{message.file.originalName}</p>
            <p className="text-xs text-gray-500">{formatFileSize(message.file.size)}</p>
          </div>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      )
    }

    let content = message.content
    if (message.mentions && message.mentions.length > 0) {
      message.mentions.forEach((mention) => {
        if (mention.isAll) {
          content = content.replace(/@所有人/g, '<span class="text-[#3370FF] font-medium">@所有人</span>')
        } else {
          const name = mention.user.nickname || '用户'
          content = content.replace(
            new RegExp(`@${name}`, 'g'),
            `<span class="text-[#3370FF] font-medium">@${name}</span>`
          )
        }
      })
    }

    return (
      <span dangerouslySetInnerHTML={{ __html: content }} className="whitespace-pre-wrap break-words" />
    )
  }

  const renderReadStatus = (message: Message, isMine: boolean) => {
    if (!isMine || message.isRecalled || message.isDeleted) return null

    const readCount = message.readReceipts?.length || 0
    // const totalMembers = members.length > 0 ? members.length : 1
    // const unreadCount = Math.max(0, totalMembers - readCount - 1)

    if (readCount > 0) {
      return (
        <span className="text-[10px] text-[#337000] ml-1">
          {readCount}人已读
        </span>
      )
    }

    return null
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

  const isGroup = conversation?.type === 'group'
  const isAdmin = conversation?.role === 'owner' || conversation?.role === 'admin'

  const otherUser = conversation?.otherUser
  const conversationName = conversation?.name || otherUser?.nickname || '聊天'
  const conversationAvatar = conversation?.avatar || otherUser?.avatar || undefined
  const conversationStatus = (otherUser?.status === 'online' || otherUser?.status === 'offline' || otherUser?.status === 'busy' || otherUser?.status === 'away')
    ? otherUser.status
    : undefined

  const isMessagePinned = (messageId: string) => {
    return pinnedMessages.some((p) => p.messageId === messageId)
  }

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
              status={!isGroup ? conversationStatus : undefined}
            />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">{conversationName}</h3>
                {isGroup && (
                  <span className="text-xs text-gray-500">
                    {conversation?.memberCount || members.length}人
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {isGroup ? (
                  conversation?.subtype === 'department' ? '部门群' :
                  conversation?.subtype === 'team' ? '项目群' : '普通群'
                ) : (
                  conversationStatus === 'online' ? '在线' :
                  conversationStatus === 'busy' ? '忙碌' :
                  conversationStatus === 'away' ? '离开' : '离线'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {isGroup && pinnedMessages.length > 0 && (
              <button
                onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                className={`p-2.5 rounded-lg transition-colors ${showPinnedMessages ? 'bg-[#3370FF]/10 text-[#3370FF]' : 'text-gray-500 hover:bg-gray-100'}`}
                title={`${pinnedMessages.length}条置顶消息`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}
            {isGroup && (
              <button
                onClick={() => setShowMembersSidebar(!showMembersSidebar)}
                className={`p-2.5 rounded-lg transition-colors ${showMembersSidebar ? 'bg-[#3370FF]/10 text-[#3370FF]' : 'text-gray-500 hover:bg-gray-100'}`}
                title="群成员"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
            )}
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
            {isGroup && (
              <button
                onClick={() => setShowGroupInfoPanel(true)}
                className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                title="群信息"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {isGroup && conversation?.announcement && (
          <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-100 flex items-center space-x-2">
            <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <p className="text-sm text-yellow-800 truncate">群公告：{conversation.announcement}</p>
          </div>
        )}

        {showPinnedMessages && pinnedMessages.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">置顶消息 ({pinnedMessages.length})</span>
              <button
                onClick={() => setShowPinnedMessages(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                收起
              </button>
            </div>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {pinnedMessages.map((pinned) => (
                <div
                  key={pinned.id}
                  className="p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const el = document.getElementById(`msg-${pinned.messageId}`)
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      {pinned.pinnedBy.nickname}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {dayjs(pinned.createdAt).format('MM-DD HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {pinned.message.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
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
                    const isPinned = isMessagePinned(msg.id)

                    return (
                      <div
                        key={msg.id}
                        id={`msg-${msg.id}`}
                        className={`flex items-end gap-3 ${isMine ? 'flex-row-reverse' : ''}`}
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                      >
                        <Avatar
                          src={senderAvatar}
                          size="sm"
                          nickname={senderName}
                        />
                        <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                          {!isMine && isGroup && (
                            <span className="text-xs text-gray-400 mb-1 ml-1">{senderName}</span>
                          )}
                          {msg.replyTo && !msg.replyTo.isRecalled && (
                            <div
                              className={`mb-1 px-3 py-1.5 rounded-lg bg-gray-100/80 text-xs text-gray-500 cursor-pointer hover:bg-gray-200/80 max-w-full ${isMine ? 'text-right' : 'text-left'}`}
                              onClick={() => {
                                const el = document.getElementById(`msg-${msg.replyTo!.id}`)
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              }}
                            >
                              <span className="font-medium text-gray-600">
                                {msg.replyTo.sender?.nickname || '用户'}：
                              </span>
                              <span className="ml-1">
                                {msg.replyTo.content.length > 30
                                  ? msg.replyTo.content.substring(0, 30) + '...'
                                  : msg.replyTo.content}
                              </span>
                            </div>
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
                            <div className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${isMine ? 'bg-[#3370FF] text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'}`}>
                              {isPinned && (
                                <div className="absolute -top-1 -right-1 text-yellow-500">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                </div>
                              )}
                              {renderMessageContent(msg)}
                            </div>
                            {!isMine && <div className="w-4" />}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                            {isMine && <MessageStatusIcon status={msg.status} />}
                            {renderReadStatus(msg, isMine)}
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

            {replyToMessage && (
              <div className="px-6 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700">
                      回复 {replyToMessage.sender?.nickname || '用户'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {replyToMessage.content.length > 50
                        ? replyToMessage.content.substring(0, 50) + '...'
                        : replyToMessage.content}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyToMessage(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="border-t border-gray-100 bg-white px-6 py-4 shrink-0">
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-1 pb-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    title="上传文件"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" title="表情">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  {isGroup && (
                    <button
                      onClick={() => {
                        const atPos = inputText.length
                        setInputText(inputText + '@')
                        setMentionStartPos(atPos)
                        setMentionSearch('')
                        setShowMentionList(true)
                        textAreaRef.current?.focus()
                      }}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                      title="@提及"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.55 0 1-.45 1-1s-.45-1-1-1c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8c0 2.21-.9 4.2-2.35 5.65-.26.26-.67.29-.97.07-.28-.2-.32-.59-.12-.84C18.45 14.64 19 13.38 19 12c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7c.77 0 1.51-.13 2.21-.37.44-.15.92.08 1.09.52.19.52-.29 1.02-.82 1.09C14.23 20.41 13.14 21 12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9c0 1.28-.27 2.55-.8 3.75C19.67 16.5 18 18 16 18c-.71 0-1.37-.25-1.92-.66-.38-.28-.44-.82-.16-1.21.24-.33.71-.41 1.05-.16.29.22.65.33 1.03.33 1.1 0 2-.9 2-2 0-.73-.41-1.38-1.02-1.73.1-.08.17-.18.17-.27V12c0-.55-.45-1-1-1s-1 .45-1 1v2c0 .55.45 1 1 1z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex-1 relative">
                  <textarea
                    ref={textAreaRef}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`${isGroup ? '输入消息，@提及成员...' : '输入消息...'} (Enter 发送, Shift+Enter 换行)`}
                    style={{ height: textAreaHeight }}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all placeholder-gray-400 border border-transparent focus:border-[#3370FF]/20"
                  />
                  {uploadingFile && (
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-[#3370FF] animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm text-gray-600">上传中 {uploadProgress}%</span>
                      </div>
                    </div>
                  )}
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

          {showMembersSidebar && isGroup && (
            <div className="w-64 border-l border-gray-100 bg-white flex flex-col">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">群成员</h4>
                  <span className="text-sm text-gray-500">{members.length}人</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                  {members
                    .sort((a, b) => {
                      const roleOrder = { owner: 0, admin: 1, member: 2 }
                      return (roleOrder[a.role as keyof typeof roleOrder] || 2) - (roleOrder[b.role as keyof typeof roleOrder] || 2)
                    })
                    .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Avatar
                          src={member.user.avatar || undefined}
                          size="sm"
                          nickname={member.user.nickname}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <p className="text-sm text-gray-900 truncate">
                              {member.user.nickname}
                              {member.userId === currentUser?.id && (
                                <span className="text-gray-400 font-normal">（我）</span>
                              )}
                            </p>
                            {member.role === 'owner' && (
                              <span className="px-1 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-600">
                                群主
                              </span>
                            )}
                            {member.role === 'admin' && (
                              <span className="px-1 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-600">
                                管理员
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <MessageContextMenu
        visible={contextMenu.visible}
        position={contextMenu.position}
        message={contextMenu.message}
        isOwner={contextMenu.message?.senderId === currentUser?.id || false}
        isAdmin={isAdmin}
        isPinned={contextMenu.message ? isMessagePinned(contextMenu.message.id) : false}
        onClose={() => setContextMenu({ visible: false, position: { x: 0, y: 0 }, message: null })}
        onCopy={handleCopyMessage}
        onReply={handleReplyMessage}
        onForward={handleForwardMessage}
        onRecall={handleRecallMessage}
        onDelete={handleDeleteMessage}
        onTogglePin={handleTogglePinMessage}
      />

      <ForwardModal
        visible={showForwardModal}
        onClose={() => {
          setShowForwardModal(false)
          setForwardMessage(null)
        }}
        message={forwardMessage}
        conversationId={id || ''}
      />

      <GroupInfoPanel
        visible={showGroupInfoPanel}
        onClose={() => setShowGroupInfoPanel(false)}
        conversation={conversation}
        currentUserId={currentUser?.id || ''}
        onConversationUpdated={() => {
          loadConversation()
          loadMembers()
        }}
      />

      {showMentionList && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 min-w-[200px] max-h-[240px] overflow-y-auto"
          style={{ top: mentionPosition.top, left: mentionPosition.left }}
        >
          {getMentionUsers().map((user, index) => (
            <div
              key={user.id}
              onClick={() => insertMention(user)}
              className={`flex items-center space-x-2 px-3 py-2 cursor-pointer transition-colors ${
                index === selectedMentionIndex ? 'bg-[#3370FF]/10' : 'hover:bg-gray-50'
              }`}
            >
              <Avatar
                src={user.avatar}
                size="sm"
                nickname={user.nickname}
              />
              <span className={`text-sm ${index === selectedMentionIndex ? 'text-[#3370FF] font-medium' : 'text-gray-700'}`}>
                {user.nickname}
              </span>
            </div>
          ))}
        </div>
      )}

      {imagePreview.visible && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setImagePreview({ visible: false, url: '', name: '' })}
        >
          <button
            onClick={() => setImagePreview({ visible: false, url: '', name: '' })}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-[90vw] max-h-[90vh]">
            <img
              src={imagePreview.url}
              alt={imagePreview.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}

export default ChatWindow
