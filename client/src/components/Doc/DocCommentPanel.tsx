import { useState, useEffect, useRef, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  getDocComments,
  createDocComment,
  updateDocComment,
  deleteDocComment,
  resolveDocComment,
  unresolveDocComment
} from '../../api/documents'
import { searchUsers } from '../../api/users'
import type { DocComment, User, CreateDocCommentRequest } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import { useAuthStore } from '../../store/auth'

interface DocCommentPanelProps {
  documentId: string
  blockId?: string
  blockText?: string
  mode?: 'document' | 'selection'
  onClose?: () => void
  onCommentCountChange?: (count: number) => void
}

interface MentionUser {
  id: string
  nickname: string
  avatar?: string | null
}

type FilterType = 'all' | 'unresolved' | 'resolved'

function DocCommentPanel({
  documentId,
  blockId,
  blockText,
  mode = 'document',
  onClose,
  onCommentCountChange
}: DocCommentPanelProps) {
  const { user: currentUser } = useAuthStore()
  const { toast, showToast, hideToast } = useToast()

  const [comments, setComments] = useState<DocComment[]>([])
  const [loading, setLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showResolved, setShowResolved] = useState(false)

  const [replyToComment, setReplyToComment] = useState<DocComment | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null)
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const editTextAreaRef = useRef<HTMLTextAreaElement>(null)

  const loadComments = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getDocComments(documentId, blockId)
      setComments(data || [])
      if (onCommentCountChange) {
        const unresolvedCount = (data || []).filter((c) => !c.isResolved).length
        onCommentCountChange(unresolvedCount)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载评论失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [documentId, blockId, onCommentCountChange, showToast])

  useEffect(() => {
    if (documentId) {
      loadComments()
    }
  }, [documentId, blockId, loadComments])

  useEffect(() => {
    if (mentionSearch && showMentionList) {
      searchMentionUsers()
    } else {
      setMentionUsers([])
    }
  }, [mentionSearch, showMentionList])

  const searchMentionUsers = async () => {
    try {
      setSearchingUsers(true)
      const data = await searchUsers(mentionSearch)
      const users: MentionUser[] = (data || []).map((u: User) => ({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar
      }))
      setMentionUsers(users.slice(0, 10))
      setSelectedMentionIndex(0)
    } catch {
      setMentionUsers([])
    } finally {
      setSearchingUsers(false)
    }
  }

  const renderCommentContent = (content: string) => {
    let rendered = content
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    rendered = rendered.replace(
      mentionRegex,
      '<span class="text-[#3370FF] font-medium cursor-pointer hover:underline">@$1</span>'
    )
    return (
      <span
        dangerouslySetInnerHTML={{ __html: rendered }}
        className="whitespace-pre-wrap break-words"
      />
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart

    const lastAtIndex = value.lastIndexOf('@', cursorPos - 1)

    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1, cursorPos)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
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

    const mentionText = `@[${user.nickname}](${user.id}) `
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
    if (showMentionList && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => Math.min(prev + 1, mentionUsers.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => Math.max(prev - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        insertMention(mentionUsers[selectedMentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentionList(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    const content = inputText.trim()
    if (!content || submitting) return

    try {
      setSubmitting(true)
      const requestData: CreateDocCommentRequest = {
        content,
        blockId: mode === 'selection' ? blockId : undefined,
        blockText: mode === 'selection' ? blockText : undefined,
        parentId: replyToComment?.id
      }
      const newComment = await createDocComment(documentId, requestData)
      if (newComment) {
        setInputText('')
        setReplyToComment(null)
        await loadComments()
        showToast('评论已发送', 'success')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '发送失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolve = async (commentId: string) => {
    try {
      await resolveDocComment(commentId)
      await loadComments()
      showToast('评论已解决', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    }
  }

  const handleUnresolve = async (commentId: string) => {
    try {
      await unresolveDocComment(commentId)
      await loadComments()
      showToast('评论已重新打开', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('确定要删除这条评论吗？')) return
    try {
      await deleteDocComment(commentId)
      await loadComments()
      showToast('评论已删除', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '删除失败', 'error')
    }
  }

  const handleStartEdit = (comment: DocComment) => {
    setEditingCommentId(comment.id)
    setEditText(comment.content)
    setTimeout(() => {
      editTextAreaRef.current?.focus()
    }, 0)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditText('')
  }

  const handleSaveEdit = async (commentId: string) => {
    const content = editText.trim()
    if (!content) return

    try {
      await updateDocComment(commentId, content)
      setEditingCommentId(null)
      setEditText('')
      await loadComments()
      showToast('评论已更新', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    }
  }

  const handleReply = (comment: DocComment) => {
    setReplyToComment(comment)
    textAreaRef.current?.focus()
  }

  const filteredComments = comments.filter((c) => {
    if (filterType === 'all') return true
    if (filterType === 'unresolved') return !c.isResolved
    if (filterType === 'resolved') return c.isResolved
    return true
  })

  const unresolvedCount = comments.filter((c) => !c.isResolved).length
  const resolvedCount = comments.filter((c) => c.isResolved).length

  const renderCommentItem = (comment: DocComment, isReply = false) => {
    const isMine = comment.userId === currentUser?.id
    const isEditing = editingCommentId === comment.id

    return (
      <div
        key={comment.id}
        className={`${!isReply ? 'border-b border-gray-100 pb-4 mb-4 last:border-b-0 last:mb-0 last:pb-0' : 'ml-10 mt-3 pt-3 border-l-2 border-gray-100 pl-3'}`}
      >
        <div className="flex gap-3">
          <Avatar
            src={comment.user.avatar || undefined}
            size="sm"
            nickname={comment.user.nickname}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {comment.user.nickname}
                </span>
                {comment.isResolved && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                    已解决
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!isReply && !comment.parentId && (
                  comment.isResolved ? (
                    <button
                      onClick={() => handleUnresolve(comment.id)}
                      className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                      title="重新打开"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResolve(comment.id)}
                      className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors"
                      title="标记为已解决"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )
                )}
                {isMine && (
                  <>
                    <button
                      onClick={() => handleStartEdit(comment)}
                      className="p-1 text-gray-400 hover:text-[#3370FF] hover:bg-[#3370FF]/10 rounded transition-colors"
                      title="编辑"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-1">
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    ref={editTextAreaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveEdit(comment.id)}
                      className="px-3 py-1 bg-[#3370FF] text-white text-xs rounded-lg hover:bg-[#2a5fd9] transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {renderCommentContent(comment.content)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-400">
                {dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}
              </span>
              {!isReply && !comment.parentId && (
                <button
                  onClick={() => handleReply(comment)}
                  className="text-xs text-gray-400 hover:text-[#3370FF] transition-colors"
                >
                  回复
                </button>
              )}
            </div>

            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-2 space-y-0">
                {comment.replies.map((reply) => renderCommentItem(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <div className="h-full flex flex-col bg-white border-l border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">
              {mode === 'selection' ? '选中内容评论' : '文档评论'}
            </h3>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {comments.length}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {mode === 'selection' && blockText && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
            <p className="text-xs text-yellow-800 line-clamp-2">
              <span className="font-medium">选中内容：</span>
              {blockText}
            </p>
          </div>
        )}

        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1 shrink-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-[#3370FF]/10 text-[#3370FF]'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            全部 {comments.length}
          </button>
          <button
            onClick={() => setFilterType('unresolved')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'unresolved'
                ? 'bg-orange-100 text-orange-600'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            未解决 {unresolvedCount}
          </button>
          <button
            onClick={() => {
              setFilterType('resolved')
              setShowResolved(!showResolved)
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'resolved'
                ? 'bg-green-100 text-green-600'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            已解决 {resolvedCount}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <svg className="w-6 h-6 text-[#3370FF] animate-spin mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-400 text-sm">加载评论中...</p>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">
                {filterType === 'all' ? '暂无评论，快来发表第一条评论吧' : 
                 filterType === 'unresolved' ? '暂无未解决的评论' : '暂无已解决的评论'}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredComments.map((comment) => renderCommentItem(comment))}
            </div>
          )}
        </div>

        {replyToComment && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700">
                  回复 {replyToComment.user.nickname}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {replyToComment.content.length > 50
                    ? replyToComment.content.substring(0, 50) + '...'
                    : replyToComment.content}
                </p>
              </div>
            </div>
            <button
              onClick={() => setReplyToComment(null)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="border-t border-gray-100 bg-white p-4 shrink-0">
          <div className="relative">
            <textarea
              ref={textAreaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="写下你的评论... (Enter 发送, Shift+Enter 换行, @提及用户)"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all placeholder-gray-400 border border-transparent focus:border-[#3370FF]/20"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => {
                const atPos = inputText.length
                setInputText(inputText + '@')
                setMentionStartPos(atPos)
                setMentionSearch('')
                setShowMentionList(true)
                textAreaRef.current?.focus()
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-[#3370FF] hover:bg-[#3370FF]/10 transition-colors"
              title="@提及用户"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.55 0 1-.45 1-1s-.45-1-1-1c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8c0 2.21-.9 4.2-2.35 5.65-.26.26-.67.29-.97.07-.28-.2-.32-.59-.12-.84C18.45 14.64 19 13.38 19 12c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7c.77 0 1.51-.13 2.21-.37.44-.15.92.08 1.09.52.19.52-.29 1.02-.82 1.09C14.23 20.41 13.14 21 12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9c0 1.28-.27 2.55-.8 3.75C19.67 16.5 18 18 16 18c-.71 0-1.37-.25-1.92-.66-.38-.28-.44-.82-.16-1.21.24-.33.71-.41 1.05-.16.29.22.65.33 1.03.33 1.1 0 2-.9 2-2 0-.73-.41-1.38-1.02-1.73.1-.08.17-.18.17-.27V12c0-.55-.45-1-1-1s-1 .45-1 1v2c0 .55.45 1 1 1z" />
              </svg>
            </button>
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim() || submitting}
              className="px-5 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none"
            >
              {submitting ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </div>

      {showMentionList && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 min-w-[200px] max-h-[240px] overflow-y-auto"
          style={{ top: mentionPosition.top, left: mentionPosition.left }}
        >
          {searchingUsers ? (
            <div className="px-3 py-2 text-xs text-gray-400">搜索中...</div>
          ) : mentionUsers.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">没有找到匹配的用户</div>
          ) : (
            mentionUsers.map((user, index) => (
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
            ))
          )}
        </div>
      )}
    </>
  )
}

export default DocCommentPanel
