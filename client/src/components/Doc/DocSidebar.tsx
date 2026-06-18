import { useEffect, useState } from 'react'
import { getRecentDocuments, getFavoriteDocuments } from '../../api/documents'
import { getMyTeams } from '../../api/teams'
import type { DocRecent, DocFavorite, Team } from '../../types'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import dayjs from 'dayjs'

interface DocSidebarProps {
  selectedTeamId?: string | null
  viewType?: 'recent' | 'favorite' | 'team'
  onSelectView?: (view: 'recent' | 'favorite' | 'team') => void
  onSelectTeam?: (teamId: string) => void
  onSelectFolder?: (folderId: string | null) => void
  onCreateDoc?: () => void
  onCreateFolder?: () => void
}

function DocSidebar({
  selectedTeamId,
  viewType = 'team',
  onSelectView,
  onSelectTeam,
  onSelectFolder,
  onCreateDoc,
  onCreateFolder
}: DocSidebarProps) {
  const [recentDocs, setRecentDocs] = useState<DocRecent[]>([])
  const [favoriteDocs, setFavoriteDocs] = useState<DocFavorite[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    loadSidebarData()
  }, [])

  useEffect(() => {
    if (teams.length > 0 && viewType === 'team' && !selectedTeamId) {
      handleSelectTeam(teams[0].id)
    }
  }, [teams, viewType, selectedTeamId])

  const loadSidebarData = async () => {
    try {
      setLoading(true)
      
      try {
        const teamList = await getMyTeams()
        setTeams(teamList || [])
      } catch (err) {
        console.error('Failed to load teams:', err)
      }
      
      try {
        const recent = await getRecentDocuments(10)
        setRecentDocs(recent || [])
      } catch (err) {
        console.error('Failed to load recent docs:', err)
      }
      
      try {
        const favorites = await getFavoriteDocuments()
        setFavoriteDocs(favorites || [])
      } catch (err) {
        console.error('Failed to load favorite docs:', err)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectView = (view: 'recent' | 'favorite' | 'team') => {
    onSelectView?.(view)
    if (view !== 'team') {
      onSelectFolder?.(null)
    }
  }

  const handleSelectTeam = (teamId: string) => {
    onSelectView?.('team')
    onSelectTeam?.(teamId)
    onSelectFolder?.(null)
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col h-full">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-6 h-6 text-[#3370FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">文档</h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onCreateDoc}
              className="flex-1 px-3 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>新建文档</span>
            </button>
            <button
              onClick={onCreateFolder}
              className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors flex items-center justify-center"
              title="新建文件夹"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-2 mb-4">
            <button
              onClick={() => handleSelectView('recent')}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                viewType === 'recent' ? 'bg-[#3370FF]/10 text-[#3370FF]' : 'hover:bg-white text-gray-700'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">最近打开</span>
              {recentDocs.length > 0 && (
                <span className="ml-auto text-xs text-gray-400">{recentDocs.length}</span>
              )}
            </button>
            <button
              onClick={() => handleSelectView('favorite')}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                viewType === 'favorite' ? 'bg-[#3370FF]/10 text-[#3370FF]' : 'hover:bg-white text-gray-700'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="text-sm font-medium">我的收藏</span>
              {favoriteDocs.length > 0 && (
                <span className="ml-auto text-xs text-gray-400">{favoriteDocs.length}</span>
              )}
            </button>
          </div>

          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase">团队空间</span>
          </div>

          {loading ? (
            <div className="px-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-2 p-2 rounded-lg animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-gray-200" />
                  <div className="flex-1 h-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-gray-400">暂无团队</p>
            </div>
          ) : (
            <div className="px-2 space-y-0.5">
              {teams.map((team) => {
                const isActive = viewType === 'team' && selectedTeamId === team.id
                return (
                  <button
                    key={team.id}
                    onClick={() => handleSelectTeam(team.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-[#3370FF]/10 text-[#3370FF]' : 'hover:bg-white text-gray-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3370FF] to-[#5B8DEF] flex items-center justify-center text-white text-xs font-medium mr-3 flex-shrink-0">
                      {team.name.charAt(0)}
                    </div>
                    <span className="text-sm truncate flex-1 text-left">{team.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {viewType === 'recent' && recentDocs.length > 0 && (
            <div className="mt-4 px-3">
              <span className="text-xs font-medium text-gray-400 uppercase">最近文档</span>
              <div className="mt-2 space-y-1">
                {recentDocs.slice(0, 5).map((recent) => (
                  <div
                    key={recent.id}
                    className="px-3 py-2 rounded-lg hover:bg-white cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate flex-1">{recent.document.title}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 ml-6">
                      {dayjs(recent.openedAt).format('MM-DD HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewType === 'favorite' && favoriteDocs.length > 0 && (
            <div className="mt-4 px-3">
              <span className="text-xs font-medium text-gray-400 uppercase">收藏文档</span>
              <div className="mt-2 space-y-1">
                {favoriteDocs.slice(0, 5).map((favorite) => (
                  <div
                    key={favorite.id}
                    className="px-3 py-2 rounded-lg hover:bg-white cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate flex-1">{favorite.document.title}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 ml-6">
                      {dayjs(favorite.createdAt).format('MM-DD')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default DocSidebar
