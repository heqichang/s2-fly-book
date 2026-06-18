import { useEffect, useState, useRef } from 'react'
import {
  getTeamDocuments,
  getFolders,
  deleteDocument,
  renameDocument,
  toggleFavorite,
  getRecentDocuments,
  getFavoriteDocuments
} from '../../api/documents'
import type { Document, DocFolder, DocRecent, DocFavorite } from '../../types'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import Avatar from '../common/Avatar'
import dayjs from 'dayjs'

interface DocListProps {
  teamId?: string | null
  folderId?: string | null
  viewType: 'recent' | 'favorite' | 'team'
  onSelectFolder?: (folderId: string | null) => void
  onOpenDocument?: (docId: string) => void
  onCreateDoc?: () => void
  onCreateFolder?: () => void
}

interface ActionMenuState {
  visible: boolean
  type: 'document' | 'folder'
  id: string
  x: number
  y: number
}

function DocList({
  teamId,
  folderId,
  viewType,
  onSelectFolder,
  onOpenDocument,
  onCreateDoc,
  onCreateFolder
}: DocListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<DocFolder[]>([])
  const [recentDocs, setRecentDocs] = useState<DocRecent[]>([])
  const [favoriteDocs, setFavoriteDocs] = useState<DocFavorite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [actionMenu, setActionMenu] = useState<ActionMenuState>({
    visible: false,
    type: 'document',
    id: '',
    x: 0,
    y: 0
  })
  const [renameModal, setRenameModal] = useState<{
    visible: boolean
    type: 'document' | 'folder'
    id: string
    name: string
  }>({ visible: false, type: 'document', id: '', name: '' })
  const [renameInput, setRenameInput] = useState('')
  const [breadcrumbs, setBreadcrumbs] = useState<DocFolder[]>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    loadData()
  }, [teamId, folderId, viewType])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionMenu((prev) => ({ ...prev, visible: false }))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      if (viewType === 'recent') {
        const data = await getRecentDocuments()
        setRecentDocs(data || [])
      } else if (viewType === 'favorite') {
        const data = await getFavoriteDocuments()
        setFavoriteDocs(data || [])
      } else if (viewType === 'team' && teamId) {
        const [docs, folderList] = await Promise.all([
          getTeamDocuments(teamId, folderId || undefined),
          getFolders(teamId, folderId || undefined)
        ])
        setDocuments(docs || [])
        setFolders(folderList || [])
        if (folderId) {
          loadBreadcrumbs(folderId)
        } else {
          setBreadcrumbs([])
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadBreadcrumbs = async (_currentFolderId: string) => {
    // 简化版面包屑，实际应该逐级加载父文件夹
    setBreadcrumbs([])
  }

  const handleActionClick = (e: React.MouseEvent, type: 'document' | 'folder', id: string) => {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setActionMenu({
      visible: true,
      type,
      id,
      x: rect.left,
      y: rect.bottom + 4
    })
  }

  const handleRename = () => {
    const item = getCurrentItem(actionMenu.type, actionMenu.id)
    if (item) {
      const name = actionMenu.type === 'document'
        ? (item as Document).title
        : (item as DocFolder).name
      setRenameModal({
        visible: true,
        type: actionMenu.type,
        id: actionMenu.id,
        name
      })
      setRenameInput(name)
    }
    setActionMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleDelete = async () => {
    try {
      if (actionMenu.type === 'document') {
        await deleteDocument(actionMenu.id)
        setDocuments((prev) => prev.filter((d) => d.id !== actionMenu.id))
        showToast('删除成功', 'success')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '删除失败', 'error')
    }
    setActionMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleToggleFavorite = async () => {
    try {
      const result = await toggleFavorite(actionMenu.id)
      if (result) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === actionMenu.id ? { ...d, isFavorite: result.isFavorite } : d
          )
        )
        showToast(result.isFavorite ? '已收藏' : '已取消收藏', 'success')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    }
    setActionMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleRenameSubmit = async () => {
    if (!renameInput.trim()) {
      showToast('名称不能为空', 'error')
      return
    }
    try {
      if (renameModal.type === 'document') {
        const result = await renameDocument(renameModal.id, renameInput.trim())
        if (result) {
          setDocuments((prev) =>
            prev.map((d) => (d.id === renameModal.id ? { ...d, title: result.title } : d))
          )
          showToast('重命名成功', 'success')
        }
      }
      setRenameModal((prev) => ({ ...prev, visible: false }))
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '重命名失败', 'error')
    }
  }

  const getCurrentItem = (type: 'document' | 'folder', id: string) => {
    if (type === 'document') {
      return documents.find((d) => d.id === id)
    }
    return folders.find((f) => f.id === id)
  }

  const getDisplayDocuments = (): Document[] => {
    if (viewType === 'recent') {
      return recentDocs.map((r) => r.document)
    }
    if (viewType === 'favorite') {
      return favoriteDocs.map((f) => f.document)
    }
    return documents
  }

  const filteredDocuments = getDisplayDocuments().filter((doc) => {
    if (!searchKeyword) return true
    return doc.title.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  const filteredFolders = folders.filter((folder) => {
    if (!searchKeyword) return true
    return folder.name.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  const getTitle = () => {
    if (viewType === 'recent') return '最近打开'
    if (viewType === 'favorite') return '我的收藏'
    return '团队文档'
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />

      <div className="flex-1 flex flex-col bg-white h-full">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {viewType === 'team' && (
                <nav className="flex items-center space-x-1 text-sm">
                  <button
                    onClick={() => onSelectFolder?.(null)}
                    className="text-gray-500 hover:text-[#3370FF] transition-colors"
                  >
                    全部文件
                  </button>
                  {breadcrumbs.map((crumb) => (
                    <div key={crumb.id} className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <button
                        onClick={() => onSelectFolder?.(crumb.id)}
                        className="text-gray-500 hover:text-[#3370FF] transition-colors"
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </nav>
              )}
              {(viewType === 'recent' || viewType === 'favorite') && (
                <h2 className="text-lg font-semibold text-gray-900">{getTitle()}</h2>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索文档或文件夹"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center space-x-2">
              {viewType === 'team' && (
                <>
                  <button
                    onClick={onCreateFolder}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <span>新建文件夹</span>
                  </button>
                  <button
                    onClick={onCreateDoc}
                    className="px-3 py-2 text-sm font-medium text-white bg-[#3370FF] hover:bg-[#2a5fd9] rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>新建文档</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-3 rounded-lg animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                  </div>
                  <div className="w-20 h-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : filteredFolders.length === 0 && filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                {searchKeyword ? '没有找到匹配的文档' : '暂无文档，点击上方按钮创建第一个文档'}
              </p>
              {viewType === 'team' && !searchKeyword && (
                <button
                  onClick={onCreateDoc}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#3370FF] hover:bg-[#2a5fd9] rounded-lg transition-colors"
                >
                  创建文档
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredFolders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => onSelectFolder?.(folder.id)}
                  className="flex items-center px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 truncate">{folder.name}</span>
                    </div>
                    <div className="flex items-center mt-1 space-x-3">
                      {folder.createdBy && (
                        <div className="flex items-center">
                          <Avatar
                            src={folder.createdBy.avatar || undefined}
                            size="sm"
                            nickname={folder.createdBy.nickname}
                          />
                          <span className="text-xs text-gray-500 ml-1.5">
                            {folder.createdBy.nickname}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-gray-400">
                        {folder._count?.documents || 0} 个文档
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mr-4 flex-shrink-0">
                    {dayjs(folder.updatedAt).format('YYYY-MM-DD')}
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={(e) => handleActionClick(e, 'folder', folder.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onOpenDocument?.(doc.id)}
                  className="flex items-center px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 truncate">{doc.title}</span>
                      {doc.isFavorite && (
                        <svg className="w-4 h-4 text-yellow-500 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center mt-1 space-x-3">
                      {doc.createdBy && (
                        <div className="flex items-center">
                          <Avatar
                            src={doc.createdBy.avatar || undefined}
                            size="sm"
                            nickname={doc.createdBy.nickname}
                          />
                          <span className="text-xs text-gray-500 ml-1.5">
                            {doc.createdBy.nickname}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mr-4 flex-shrink-0">
                    {dayjs(doc.updatedAt).format('YYYY-MM-DD HH:mm')}
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={(e) => handleActionClick(e, 'document', doc.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {actionMenu.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[140px]"
          style={{ left: actionMenu.x, top: actionMenu.y }}
        >
          <button
            onClick={handleRename}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>重命名</span>
          </button>
          {actionMenu.type === 'document' && (
            <button
              onClick={handleToggleFavorite}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>收藏</span>
            </button>
          )}
          <button
            onClick={() => setActionMenu((prev) => ({ ...prev, visible: false }))}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>移动</span>
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>删除</span>
          </button>
        </div>
      )}

      {renameModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setRenameModal((prev) => ({ ...prev, visible: false }))}>
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">重命名</h3>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              placeholder="请输入新名称"
              className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all mb-6"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
              }}
            />
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setRenameModal((prev) => ({ ...prev, visible: false }))}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRenameSubmit}
                className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] text-white rounded-xl text-sm font-medium transition-all"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DocList
