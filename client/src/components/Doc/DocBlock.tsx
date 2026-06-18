import { useState, useRef, useEffect, useCallback } from 'react'
import type { DocBlock, DocBlockType } from '../../types'

interface DocBlockProps {
  block: DocBlock
  index: number
  totalBlocks: number
  onChange: (block: DocBlock) => void
  onAddBlock: (afterIndex: number, type?: DocBlockType) => void
  onDeleteBlock: (index: number) => void
  onFocus: (index: number) => void
  onTypeChange: (index: number, type: DocBlockType) => void
  isFocused: boolean
}

function DocBlock({
  block,
  index,
  totalBlocks,
  onChange,
  onAddBlock,
  onDeleteBlock,
  onFocus,
  onTypeChange,
  isFocused
}: DocBlockProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const blockTypes: { type: DocBlockType; label: string; icon: string }[] = [
    { type: 'paragraph', label: '正文', icon: '¶' },
    { type: 'heading', label: '标题', icon: 'H' },
    { type: 'orderedList', label: '有序列表', icon: '1.' },
    { type: 'unorderedList', label: '无序列表', icon: '•' },
    { type: 'taskList', label: '任务列表', icon: '☑' },
    { type: 'quote', label: '引用', icon: '"' },
    { type: 'code', label: '代码块', icon: '</>' },
    { type: 'table', label: '表格', icon: '⊞' },
    { type: 'image', label: '图片', icon: '🖼' },
    { type: 'divider', label: '分割线', icon: '—' }
  ]

  const handleContentChange = useCallback((content: string) => {
    onChange({ ...block, content })
  }, [block, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
      e.preventDefault()
      onAddBlock(index, block.type === 'heading' ? 'paragraph' : block.type)
    }

    if (e.key === 'Backspace' && block.content === '' && totalBlocks > 1) {
      e.preventDefault()
      onDeleteBlock(index)
    }

    if (e.key === '/' && block.content === '') {
      e.preventDefault()
      setShowTypeMenu(true)
    }
  }

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerText
    handleContentChange(content)

    if (block.type === 'paragraph') {
      checkMarkdownShortcuts(content)
    }
  }

  const checkMarkdownShortcuts = (content: string) => {
    const shortcuts: Record<string, { type: DocBlockType; level?: number }> = {
      '# ': { type: 'heading', level: 1 },
      '## ': { type: 'heading', level: 2 },
      '### ': { type: 'heading', level: 3 },
      '1. ': { type: 'orderedList' },
      '- ': { type: 'unorderedList' },
      '* ': { type: 'unorderedList' },
      '[] ': { type: 'taskList' },
      '[ ] ': { type: 'taskList' },
      '> ': { type: 'quote' },
      '``` ': { type: 'code' },
      '--- ': { type: 'divider' }
    }

    for (const [shortcut, config] of Object.entries(shortcuts)) {
      if (content === shortcut) {
        handleContentChange('')
        onTypeChange(index, config.type)
        if (config.level) {
          onChange({ ...block, type: config.type, level: config.level, content: '' })
        }
        return
      }
    }
  }

  const handleTypeSelect = (type: DocBlockType) => {
    onTypeChange(index, type)
    setShowTypeMenu(false)
    setShowMenu(false)
    setTimeout(() => {
      contentRef.current?.focus()
    }, 0)
  }

  const handleAddBefore = () => {
    onAddBlock(index - 1, 'paragraph')
    setShowMenu(false)
  }

  const handleAddAfter = () => {
    onAddBlock(index, 'paragraph')
    setShowMenu(false)
  }

  const handleDelete = () => {
    if (totalBlocks > 1) {
      onDeleteBlock(index)
    }
    setShowMenu(false)
  }

  const handleCheckboxChange = (checked: boolean) => {
    onChange({ ...block, checked })
  }

  const handleTableCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newCells = [...(block.cells || [])]
    if (!newCells[rowIndex]) {
      newCells[rowIndex] = []
    }
    newCells[rowIndex][colIndex] = value
    onChange({ ...block, cells: newCells })
  }

  const addTableRow = () => {
    const cols = block.cells?.[0]?.length || 3
    const newRow = Array(cols).fill('')
    onChange({ ...block, cells: [...(block.cells || []), newRow] })
  }

  const addTableColumn = () => {
    const newCells = (block.cells || []).map(row => [...row, ''])
    onChange({ ...block, cells: newCells })
  }

  const handleImageUrlChange = (url: string) => {
    onChange({ ...block, imageUrl: url, content: url })
  }

  useEffect(() => {
    if (isFocused && contentRef.current) {
      contentRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(contentRef.current)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isFocused])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
        setShowTypeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const renderContent = () => {
    const baseClasses = "outline-none w-full"

    switch (block.type) {
      case 'heading':
        const headingSizes: Record<number, string> = {
          1: 'text-3xl font-bold',
          2: 'text-2xl font-bold',
          3: 'text-xl font-semibold'
        }
        const level = block.level || 1
        return (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className={`${baseClasses} ${headingSizes[level]} text-gray-900`}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => onFocus(index)}
            data-placeholder={`Heading ${level}`}
          >
            {block.content}
          </div>
        )

      case 'paragraph':
        return (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className={`${baseClasses} text-gray-700 leading-relaxed`}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => onFocus(index)}
            data-placeholder="输入 '/' 打开命令菜单..."
          >
            {block.content}
          </div>
        )

      case 'orderedList':
        return (
          <div className="flex items-start gap-3">
            <span className="text-gray-400 mt-0.5 min-w-[20px] text-right">{index + 1}.</span>
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className={`${baseClasses} flex-1 text-gray-700`}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => onFocus(index)}
              data-placeholder="列表项"
            >
              {block.content}
            </div>
          </div>
        )

      case 'unorderedList':
        return (
          <div className="flex items-start gap-3">
            <span className="text-gray-400 mt-1.5 min-w-[20px]">
              <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full" />
            </span>
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className={`${baseClasses} flex-1 text-gray-700`}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => onFocus(index)}
              data-placeholder="列表项"
            >
              {block.content}
            </div>
          </div>
        )

      case 'taskList':
        return (
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={block.checked || false}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#3370FF] focus:ring-[#3370FF] cursor-pointer"
            />
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className={`${baseClasses} flex-1 ${block.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => onFocus(index)}
              data-placeholder="待办事项"
            >
              {block.content}
            </div>
          </div>
        )

      case 'quote':
        return (
          <div className="border-l-4 border-gray-300 pl-4 py-1">
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className={`${baseClasses} text-gray-600 italic`}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => onFocus(index)}
              data-placeholder="引用内容..."
            >
              {block.content}
            </div>
          </div>
        )

      case 'code':
        return (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-xs text-gray-400">
              <input
                type="text"
                value={block.language || 'javascript'}
                onChange={(e) => onChange({ ...block, language: e.target.value })}
                className="bg-transparent border-none outline-none text-gray-400 text-xs w-24"
                placeholder="语言"
              />
              <span>{block.language || 'javascript'}</span>
            </div>
            <textarea
              ref={contentRef as unknown as React.RefObject<HTMLTextAreaElement>}
              value={block.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onFocus={() => onFocus(index)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault()
                  const target = e.target as HTMLTextAreaElement
                  const start = target.selectionStart
                  const end = target.selectionEnd
                  const newContent = block.content.substring(0, start) + '  ' + block.content.substring(end)
                  handleContentChange(newContent)
                  setTimeout(() => {
                    target.selectionStart = target.selectionEnd = start + 2
                  }, 0)
                }
              }}
              className="w-full p-4 bg-gray-900 text-green-400 font-mono text-sm outline-none resize-none min-h-[120px]"
              placeholder="// 输入代码..."
              rows={6}
            />
          </div>
        )

      case 'table':
        const cells = block.cells || [
          ['', '', ''],
          ['', '', ''],
          ['', '', '']
        ]
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <tbody>
                {cells.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className={`border border-gray-200 p-2 ${rowIndex === 0 ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => handleTableCellChange(rowIndex, colIndex, e.target.value)}
                          onFocus={() => onFocus(index)}
                          className="w-full bg-transparent outline-none text-sm"
                          placeholder={rowIndex === 0 ? '表头' : '内容'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2 mt-2">
              <button
                onClick={addTableRow}
                className="text-xs text-gray-500 hover:text-[#3370FF] px-2 py-1 hover:bg-gray-100 rounded"
              >
                + 添加行
              </button>
              <button
                onClick={addTableColumn}
                className="text-xs text-gray-500 hover:text-[#3370FF] px-2 py-1 hover:bg-gray-100 rounded"
              >
                + 添加列
              </button>
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="space-y-2">
            {block.imageUrl ? (
              <div className="relative group">
                <img
                  src={block.imageUrl}
                  alt={block.content || '图片'}
                  className="max-w-full rounded-lg"
                />
                <button
                  onClick={() => handleImageUrlChange('')}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="text"
                  value={block.imageUrl || ''}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                  onFocus={() => onFocus(index)}
                  placeholder="输入图片URL..."
                  className="mt-2 w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                />
              </div>
            )}
          </div>
        )

      case 'divider':
        return (
          <div className="py-2">
            <hr className="border-gray-200" />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div
      className={`group relative flex items-start gap-1 py-1 px-2 -mx-2 rounded-lg transition-colors ${
        isFocused ? 'bg-blue-50/50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
          title="更多操作"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        <button
          onClick={() => setShowTypeMenu(!showTypeMenu)}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded text-xs font-mono"
          title="切换块类型"
        >
          {blockTypes.find(t => t.type === block.type)?.icon || '¶'}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {renderContent()}
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]"
        >
          <button
            onClick={handleAddBefore}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            在上方插入
          </button>
          <button
            onClick={handleAddAfter}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            在下方插入
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={totalBlocks <= 1}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        </div>
      )}

      {showTypeMenu && (
        <div
          ref={menuRef}
          className="absolute left-10 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px] max-h-[300px] overflow-y-auto"
        >
          {blockTypes.map((bt) => (
            <button
              key={bt.type}
              onClick={() => handleTypeSelect(bt.type)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3 ${
                block.type === bt.type ? 'bg-blue-50 text-[#3370FF]' : 'text-gray-700'
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs">
                {bt.icon}
              </span>
              {bt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default DocBlock
