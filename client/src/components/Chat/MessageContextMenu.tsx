import { useEffect, useRef } from 'react'
import type { Message } from '../../types'

interface MessageContextMenuProps {
  visible: boolean
  position: { x: number; y: number }
  message: Message | null
  isOwner: boolean
  isAdmin: boolean
  isPinned: boolean
  onClose: () => void
  onCopy: () => void
  onReply: () => void
  onForward: () => void
  onRecall: () => void
  onDelete: () => void
  onTogglePin: () => void
}

function MessageContextMenu({
  visible,
  position,
  message,
  isOwner,
  isAdmin,
  isPinned,
  onClose,
  onCopy,
  onReply,
  onForward,
  onRecall,
  onDelete,
  onTogglePin
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible, onClose])

  if (!visible || !message) return null

  const canRecall = isOwner && !message.isRecalled && !message.isDeleted &&
    (Date.now() - new Date(message.createdAt).getTime()) < 2 * 60 * 1000

  const canDelete = isOwner || isAdmin

  const menuItems = [
    {
      key: 'copy',
      label: '复制',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      onClick: onCopy,
      show: !message.isRecalled && !message.isDeleted
    },
    {
      key: 'reply',
      label: '回复',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      onClick: onReply,
      show: !message.isRecalled && !message.isDeleted
    },
    {
      key: 'forward',
      label: '转发',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      onClick: onForward,
      show: !message.isRecalled && !message.isDeleted
    },
    {
      key: 'recall',
      label: '撤回',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      onClick: onRecall,
      show: canRecall,
      danger: true
    },
    {
      key: 'pin',
      label: isPinned ? '取消置顶' : '置顶',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isPinned ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          )}
        </svg>
      ),
      onClick: onTogglePin,
      show: isAdmin && !message.isRecalled && !message.isDeleted
    },
    {
      key: 'delete',
      label: '删除',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: onDelete,
      show: canDelete && !message.isRecalled && !message.isDeleted,
      danger: true
    }
  ]

  const visibleItems = menuItems.filter((item) => item.show)

  if (visibleItems.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 min-w-[140px]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(4px, 4px)'
      }}
    >
      {visibleItems.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            item.onClick()
            onClose()
          }}
          className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors ${
            item.danger
              ? 'text-red-500 hover:bg-red-50'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export default MessageContextMenu
