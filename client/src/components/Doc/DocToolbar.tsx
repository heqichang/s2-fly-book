import { useState, useRef, useEffect } from 'react'
import type { DocBlockType } from '../../types'

interface DocToolbarProps {
  onFormat: (type: DocBlockType, level?: number) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

function DocToolbar({ onFormat, onUndo, onRedo, canUndo, canRedo }: DocToolbarProps) {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [showInsertMenu, setShowInsertMenu] = useState(false)
  const headingRef = useRef<HTMLDivElement>(null)
  const insertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
        setShowHeadingMenu(false)
      }
      if (insertRef.current && !insertRef.current.contains(e.target as Node)) {
        setShowInsertMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toolbarButtonClass = (active?: boolean) =>
    `p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors ${
      active ? 'bg-gray-100 text-gray-900' : ''
    }`

  const headingOptions = [
    { level: 1, label: '标题 1', size: 'text-2xl' },
    { level: 2, label: '标题 2', size: 'text-xl' },
    { level: 3, label: '标题 3', size: 'text-lg' }
  ]

  const insertOptions: { type: DocBlockType; label: string; icon: JSX.Element }[] = [
    {
      type: 'orderedList',
      label: '有序列表',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      )
    },
    {
      type: 'unorderedList',
      label: '无序列表',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )
    },
    {
      type: 'taskList',
      label: '任务列表',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      type: 'quote',
      label: '引用',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      type: 'code',
      label: '代码块',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      type: 'table',
      label: '表格',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      type: 'image',
      label: '图片',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      type: 'divider',
      label: '分割线',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      )
    }
  ]

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`${toolbarButtonClass()} disabled:opacity-40 disabled:cursor-not-allowed`}
          title="撤销 (Ctrl+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`${toolbarButtonClass()} disabled:opacity-40 disabled:cursor-not-allowed`}
          title="重做 (Ctrl+Y)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      <div className="relative" ref={headingRef}>
        <button
          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
          className={toolbarButtonClass()}
          title="标题"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </button>
        {showHeadingMenu && (
          <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]">
            {headingOptions.map((h) => (
              <button
                key={h.level}
                onClick={() => {
                  onFormat('heading', h.level)
                  setShowHeadingMenu(false)
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${h.size} font-semibold text-gray-700`}
              >
                {h.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 px-3 border-r border-gray-200">
        <button
          onClick={() => onFormat('paragraph')}
          className={toolbarButtonClass()}
          title="正文"
        >
          <span className="text-sm font-serif">¶</span>
        </button>
      </div>

      <div className="flex items-center gap-1 px-3 border-r border-gray-200">
        <button
          onClick={() => onFormat('bold' as unknown as DocBlockType)}
          className={toolbarButtonClass()}
          title="加粗"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>
        <button
          onClick={() => onFormat('italic' as unknown as DocBlockType)}
          className={toolbarButtonClass()}
          title="斜体"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0l-4 16m0 0h4" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-1 px-3 border-r border-gray-200">
        <button
          onClick={() => onFormat('orderedList')}
          className={toolbarButtonClass()}
          title="有序列表"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => onFormat('unorderedList')}
          className={toolbarButtonClass()}
          title="无序列表"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => onFormat('taskList')}
          className={toolbarButtonClass()}
          title="任务列表"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </button>
      </div>

      <div className="relative" ref={insertRef}>
        <button
          onClick={() => setShowInsertMenu(!showInsertMenu)}
          className={toolbarButtonClass()}
          title="插入"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        {showInsertMenu && (
          <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
            {insertOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={() => {
                  onFormat(opt.type)
                  setShowInsertMenu(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DocToolbar
