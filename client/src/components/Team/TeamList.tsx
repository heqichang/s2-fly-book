import { useEffect, useState } from 'react'
import { getMyTeams, searchTeams, joinTeam } from '../../api/teams'
import type { Team } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import CreateTeamModal from './CreateTeamModal'

interface TeamListProps {
  selectedTeamId?: string | null
  onSelectTeam?: (teamId: string) => void
  onTeamCreated?: (team: Team) => void
}

type TabType = 'mine' | 'search'

type SearchTeamResult = {
  id: string
  name: string
  logo?: string | null
  description?: string | null
  ownerId: string
  owner?: { id: string; nickname: string; avatar?: string | null }
  memberCount: number
  hasJoined: boolean
  createdAt: string
}

function TeamList({ selectedTeamId, onSelectTeam, onTeamCreated }: TeamListProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)
  
  const currentSelectedId = selectedTeamId ?? internalSelectedId
  
  const handleSelectTeam = (teamId: string) => {
    setInternalSelectedId(teamId)
    onSelectTeam?.(teamId)
  }
  const [teams, setTeams] = useState<Team[]>([])
  const [searchResults, setSearchResults] = useState<SearchTeamResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [joinLoadingIds, setJoinLoadingIds] = useState<Set<string>>(new Set())
  const [selectedTab, setSelectedTab] = useState<TabType>('mine')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    loadTeams()
  }, [])

  useEffect(() => {
    if (selectedTab === 'search' && searchKeyword.trim()) {
      handleSearchTeams()
    } else if (selectedTab === 'search') {
      setSearchResults([])
    }
  }, [selectedTab, searchKeyword])

  const loadTeams = async () => {
    try {
      setLoading(true)
      const data = await getMyTeams()
      setTeams(data || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载团队列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchTeams = async () => {
    try {
      setSearchLoading(true)
      const keyword = searchKeyword.trim()
      const data = await searchTeams(keyword)
      setSearchResults(data || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleJoinTeam = async (teamId: string) => {
    try {
      setJoinLoadingIds((prev) => new Set(prev).add(teamId))
      const team = await joinTeam(teamId)
      if (team) {
        showToast('加入团队成功', 'success')
        setSearchResults((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, hasJoined: true } : t))
        )
        setTeams((prev) => {
          if (prev.some((t) => t.id === teamId)) return prev
          return [team, ...prev]
        })
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加入团队失败', 'error')
    } finally {
      setJoinLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(teamId)
        return next
      })
    }
  }

  const handleTeamCreated = (team: Team) => {
    setTeams((prev) => [team, ...prev])
    onTeamCreated?.(team)
    setShowCreateModal(false)
    showToast('团队创建成功', 'success')
  }

  const filteredTeams = teams.filter((team) => {
    if (!searchKeyword) return true
    return team.name.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">团队</h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setSelectedTab(selectedTab === 'search' ? 'mine' : 'search')}
              className={`p-2 rounded-lg transition-colors ${
                selectedTab === 'search'
                  ? 'text-[#3370FF] bg-[#3370FF]/10'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title={selectedTab === 'search' ? '我的团队' : '加入团队'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {selectedTab === 'search' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                )}
              </svg>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-lg text-[#3370FF] hover:bg-[#3370FF]/10 transition-colors"
              title="创建团队"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={selectedTab === 'mine' ? '搜索已加入的团队' : '搜索团队名称加入'}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
          />
        </div>
        <div className="flex border-b border-gray-100 mt-3">
          <button
            type="button"
            onClick={() => {
              setSelectedTab('mine')
              setSearchKeyword('')
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === 'mine'
                ? 'text-[#3370FF] border-b-2 border-[#3370FF]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            我的团队
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTab('search')
              setSearchKeyword('')
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === 'search'
                ? 'text-[#3370FF] border-b-2 border-[#3370FF]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            搜索团队
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {selectedTab === 'mine' ? (
          loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-20 bg-gray-200 rounded" />
                      <div className="h-3 w-12 bg-gray-200 rounded" />
                    </div>
                    <div className="h-3 w-full bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">
                {searchKeyword ? '没有找到匹配的团队' : '暂无团队，点击右上角创建团队吧'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredTeams.map((team) => {
                const isActive = currentSelectedId === team.id
                return (
                  <div
                    key={team.id}
                    onClick={() => handleSelectTeam(team.id)}
                    className={`flex items-start space-x-3 px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-150 ${isActive ? 'bg-[#3370FF]/10' : 'hover:bg-white'}`}
                  >
                    <Avatar
                      src={team.logo || undefined}
                      size="md"
                      nickname={team.name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium text-sm truncate ${isActive ? 'text-[#3370FF]' : 'text-gray-900'}`}>
                          {team.name}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {team.memberCount || 0}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {team.description || '暂无简介'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          searchLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                      <div className="h-6 w-16 bg-gray-200 rounded" />
                    </div>
                    <div className="h-3 w-full bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : !searchKeyword.trim() ? (
            <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">输入团队名称搜索并加入</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">没有找到匹配的团队</p>
            </div>
          ) : (
            <div className="py-2">
              {searchResults.map((team) => {
                const isJoinLoading = joinLoadingIds.has(team.id)
                return (
                  <div
                    key={team.id}
                    className="flex items-start justify-between space-x-3 px-3 py-3 mx-2 rounded-lg hover:bg-white transition-all duration-150"
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <Avatar
                        src={team.logo || undefined}
                        size="md"
                        nickname={team.name}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-1">
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {team.name}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {team.memberCount}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mb-1">
                          {team.owner && (
                            <div className="flex items-center">
                              <Avatar
                                src={team.owner.avatar || undefined}
                                size="sm"
                                nickname={team.owner.nickname}
                              />
                              <span className="text-xs text-gray-400 ml-1.5">
                                {team.owner.nickname}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {team.description || '暂无简介'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {team.hasJoined ? (
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium">
                          已加入
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinTeam(team.id)}
                          disabled={isJoinLoading}
                          className="px-3 py-1.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-all flex items-center"
                        >
                          {isJoinLoading ? (
                            <>
                              <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              加入中
                            </>
                          ) : (
                            '加入'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      <CreateTeamModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleTeamCreated}
      />
    </>
  )
}

export default TeamList
