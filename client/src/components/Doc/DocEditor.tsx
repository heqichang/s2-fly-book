import { useState, useEffect, useCallback, useRef } from 'react'
import DocBlockComponent from './DocBlock'
import DocToolbar from './DocToolbar'
import DocShareModal from './DocShareModal'
import DocCommentPanel from './DocCommentPanel'
import { getDocument, updateDocument, toggleFavorite } from '../../api/documents'
import type { DocBlock, DocBlockType, Document } from '../../types'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

interface DocEditorProps {
  documentId: string
  onBack?: () => void
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function createBlock(type: DocBlockType = 'paragraph', content: string = ''): DocBlock {
  return {
    id: generateId(),
    type,
    content,
    level: type === 'heading' ? 1 : undefined,
    checked: type === 'taskList' ? false : undefined,
    language: type === 'code' ? 'javascript' : undefined,
    cells: type === 'table' ? [['', '', ''], ['', '', ''], ['', '', '']] : undefined,
    imageUrl: type === 'image' ? '' : undefined
  }
}

function parseBlocksFromContent(content: string): DocBlock[] {
  if (!content) {
    return [createBlock('paragraph', '')]
  }
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch {
    const lines = content.split('\n')
    if (lines.length > 0) {
      return lines.map((line) => createBlock('paragraph', line))
    }
  }
  return [createBlock('paragraph', '')]
}

function serializeBlocksToContent(blocks: DocBlock[]): string {
  return JSON.stringify(blocks)
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

function DocEditor({ documentId, onBack }: DocEditorProps) {
  const [, setDocument] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<DocBlock[]>([createBlock('paragraph', '')])
  const [focusedBlockIndex, setFocusedBlockIndex] = useState(0)
  const [history, setHistory] = useState<DocBlock[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isFavorite, setIsFavorite] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast, showToast, hideToast } = useToast()

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitializedRef = useRef(false)

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true)
      const doc = await getDocument(documentId)
      if (doc) {
        setDocument(doc)
        setTitle(doc.title)
        setIsFavorite(doc.isFavorite)
        const parsedBlocks = parseBlocksFromContent(doc.content)
        setBlocks(parsedBlocks)
        setHistory([parsedBlocks])
        setHistoryIndex(0)
        isInitializedRef.current = true
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载文档失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [documentId, showToast])

  useEffect(() => {
    loadDocument()
  }, [loadDocument])

  const pushToHistory = useCallback(
    (newBlocks: DocBlock[]) => {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(newBlocks)
      if (newHistory.length > 50) {
        newHistory.shift()
      } else {
        setHistoryIndex(historyIndex + 1)
      }
      setHistory(newHistory)
    },
    [history, historyIndex]
  )

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setBlocks(history[newIndex])
    }
  }, [history, historyIndex])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setBlocks(history[newIndex])
    }
  }, [history, historyIndex])

  const scheduleSave = useCallback(
    (newTitle: string, newBlocks: DocBlock[]) => {
      if (!isInitializedRef.current) return

      setSaveStatus('unsaved')

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      saveTimerRef.current = setTimeout(async () => {
        try {
          setSaveStatus('saving')
          const content = serializeBlocksToContent(newBlocks)
          const updated = await updateDocument(documentId, {
            title: newTitle,
            content
          })
          if (updated) {
            setDocument(updated)
            setSaveStatus('saved')
          }
        } catch (err: unknown) {
          const error = err as { message?: string }
          setSaveStatus('error')
          showToast(error.message || '保存失败', 'error')
        }
      }, 2000)
    },
    [documentId, showToast]
  )

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    scheduleSave(newTitle, blocks)
  }

  const handleBlockChange = (index: number, block: DocBlock) => {
    const newBlocks = [...blocks]
    newBlocks[index] = block
    setBlocks(newBlocks)
    pushToHistory(newBlocks)
    scheduleSave(title, newBlocks)
  }

  const handleAddBlock = (afterIndex: number, type: DocBlockType = 'paragraph') => {
    const newBlock = createBlock(type)
    const newBlocks = [...blocks]
    newBlocks.splice(afterIndex + 1, 0, newBlock)
    setBlocks(newBlocks)
    setFocusedBlockIndex(afterIndex + 1)
    pushToHistory(newBlocks)
    scheduleSave(title, newBlocks)
  }

  const handleDeleteBlock = (index: number) => {
    if (blocks.length <= 1) return
    const newBlocks = blocks.filter((_, i) => i !== index)
    setBlocks(newBlocks)
    const newFocusIndex = Math.max(0, index - 1)
    setFocusedBlockIndex(newFocusIndex)
    pushToHistory(newBlocks)
    scheduleSave(title, newBlocks)
  }

  const handleBlockFocus = (index: number) => {
    setFocusedBlockIndex(index)
  }

  const handleTypeChange = (index: number, type: DocBlockType) => {
    const newBlocks = [...blocks]
    const oldBlock = newBlocks[index]
    newBlocks[index] = {
      ...createBlock(type),
      id: oldBlock.id,
      content: oldBlock.content
    }
    setBlocks(newBlocks)
    pushToHistory(newBlocks)
    scheduleSave(title, newBlocks)
  }

  const handleFormat = (type: DocBlockType, level?: number) => {
    const currentBlock = blocks[focusedBlockIndex]
    if (!currentBlock) return

    if (type === 'heading') {
      const newBlocks = [...blocks]
      newBlocks[focusedBlockIndex] = {
        ...currentBlock,
        type: 'heading',
        level: level || 1
      }
      setBlocks(newBlocks)
      pushToHistory(newBlocks)
      scheduleSave(title, newBlocks)
    } else if (type === 'paragraph') {
      const newBlocks = [...blocks]
      newBlocks[focusedBlockIndex] = {
        ...currentBlock,
        type: 'paragraph',
        level: undefined
      }
      setBlocks(newBlocks)
      pushToHistory(newBlocks)
      scheduleSave(title, newBlocks)
    } else {
      handleAddBlock(focusedBlockIndex, type)
    }
  }

  const handleToggleFavorite = async () => {
    try {
      const result = await toggleFavorite(documentId)
      if (result) {
        setIsFavorite(result.isFavorite)
        showToast(result.isFavorite ? '已收藏' : '已取消收藏', 'success')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        handleRedo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (saveStatus === 'unsaved') {
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
          }
          const content = serializeBlocksToContent(blocks)
          updateDocument(documentId, { title, content })
            .then((updated) => {
              if (updated) {
                setDocument(updated)
                setSaveStatus('saved')
                showToast('已保存', 'success')
              }
            })
            .catch(() => {
              setSaveStatus('error')
              showToast('保存失败', 'error')
            })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, saveStatus, blocks, title, documentId, showToast])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saved':
        return '已保存'
      case 'saving':
        return '保存中...'
      case 'unsaved':
        return '未保存'
      case 'error':
        return '保存失败'
      default:
        return ''
    }
  }

  const getSaveStatusColor = () => {
    switch (saveStatus) {
      case 'saved':
        return 'text-green-500'
      case 'saving':
        return 'text-blue-500'
      case 'unsaved':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3370FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="返回"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite
                  ? 'text-yellow-500 hover:bg-yellow-50'
                  : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
              }`}
              title={isFavorite ? '取消收藏' : '收藏'}
            >
              <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className={`p-2 rounded-lg transition-colors ${
                showComments
                  ? 'bg-blue-50 text-[#3370FF]'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="评论"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="分享"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs ${getSaveStatusColor()}`}>
              {getSaveStatusText()}
            </span>
          </div>
        </div>

        <DocToolbar
          onFormat={handleFormat}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 py-8">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="无标题文档"
                className="w-full text-3xl font-bold text-gray-900 outline-none mb-6 placeholder-gray-300 bg-transparent"
              />

              <div className="space-y-1">
                {blocks.map((block, index) => (
                  <DocBlockComponent
                    key={block.id}
                    block={block}
                    index={index}
                    totalBlocks={blocks.length}
                    onChange={(b) => handleBlockChange(index, b)}
                    onAddBlock={handleAddBlock}
                    onDeleteBlock={handleDeleteBlock}
                    onFocus={handleBlockFocus}
                    onTypeChange={handleTypeChange}
                    isFocused={focusedBlockIndex === index}
                  />
                ))}
              </div>
            </div>
          </div>

          {showComments && (
            <div className="w-[380px] border-l border-gray-100 flex-shrink-0 bg-gray-50 flex flex-col">
              <DocCommentPanel
                documentId={documentId}
                mode="document"
                onClose={() => setShowComments(false)}
              />
            </div>
          )}
        </div>

        <DocShareModal
          documentId={documentId}
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      </div>
    </>
  )
}

export default DocEditor
