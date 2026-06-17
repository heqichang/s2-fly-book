import { useEffect, useState } from 'react'
import { getMyTeams } from '../../api/teams'
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

function TeamList({ selectedTeamId, onSelectTeam, onTeamCreated }: TeamListProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)
  
  const currentSelectedId = selectedTeamId ?? internalSelectedId
  
  const handleSelectTeam = (teamId: string) => {
    setInternalSelectedId(teamId)
    onSelectTeam?.(teamId)
  }
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    loadTeams()
  }, [])

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
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜索团队"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
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
