import { useState, useEffect } from 'react'
import { createGroupChat } from '../../api/conversations'
import { getContacts } from '../../api/contacts'
import { getMyTeams, getTeamMembers } from '../../api/teams'
import { getDepartments, getDepartmentMembers } from '../../api/departments'
import type { Conversation, Team, TeamMember, Department, DepartmentMember, CreateGroupChatRequest } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

interface CreateGroupModalProps {
  visible: boolean
  onClose: () => void
  onCreated: (conversation: Conversation) => void
}

type SelectableUser = {
  id: string
  nickname: string
  avatar?: string | null
  source: 'contact' | 'team' | 'department'
  sourceName?: string
}

type TabType = 'contacts' | 'teams'

function CreateGroupModal({ visible, onClose, onCreated }: CreateGroupModalProps) {
  const [formData, setFormData] = useState<CreateGroupChatRequest>({
    name: '',
    avatar: '',
    memberIds: []
  })
  const [selectedTab, setSelectedTab] = useState<TabType>('contacts')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const [members, setMembers] = useState<SelectableUser[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (visible) {
      loadData()
    }
  }, [visible])

  useEffect(() => {
    if (selectedTab === 'contacts') {
      loadContacts()
    } else if (selectedTab === 'teams') {
      loadTeams()
    }
  }, [selectedTab])

  useEffect(() => {
    if (selectedTeamId) {
      loadDepartments(selectedTeamId)
      loadTeamMembers(selectedTeamId)
    }
  }, [selectedTeamId])

  useEffect(() => {
    if (selectedDeptId) {
      loadDepartmentMembers(selectedDeptId)
    }
  }, [selectedDeptId])

  const loadData = async () => {
    setSelectedTab('contacts')
    setSelectedTeamId(null)
    setSelectedDeptId(null)
    await loadContacts()
  }

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await getContacts()
      const users: SelectableUser[] = (data || []).map((c) => ({
        id: c.user.id,
        nickname: c.user.nickname,
        avatar: c.user.avatar,
        source: 'contact'
      }))
      setMembers(users)
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载联系人失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      setLoading(true)
      const data = await getMyTeams()
      setTeams(data || [])
      setMembers([])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载团队失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async (teamId: string) => {
    try {
      const data = await getDepartments(teamId)
      setDepartments(data || [])
    } catch {
      setDepartments([])
    }
  }

  const loadTeamMembers = async (teamId: string) => {
    try {
      const data = await getTeamMembers(teamId)
      const team = teams.find((t) => t.id === teamId)
      const users: SelectableUser[] = (data || []).map((m: TeamMember) => ({
        id: m.user.id,
        nickname: m.user.nickname,
        avatar: m.user.avatar,
        source: 'team',
        sourceName: team?.name
      }))
      setMembers(users)
    } catch {
      setMembers([])
    }
  }

  const loadDepartmentMembers = async (deptId: string) => {
    try {
      setLoading(true)
      const data = await getDepartmentMembers(deptId)
      const dept = departments.find((d) => d.id === deptId)
      const users: SelectableUser[] = (data || []).map((m: DepartmentMember) => ({
        id: m.user.id,
        nickname: m.user.nickname,
        avatar: m.user.avatar,
        source: 'department',
        sourceName: dept?.name
      }))
      setMembers(users)
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter((m) => {
    if (!searchKeyword) return true
    return m.nickname.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    const allIds = filteredMembers.map((m) => m.id)
    setSelectedIds(new Set(allIds))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = '群名称不能为空'
    } else if (formData.name.length > 50) {
      newErrors.name = '群名称不能超过50个字符'
    }
    if (selectedIds.size === 0) {
      newErrors.members = '请至少选择一个成员'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSubmitting(true)
      const conversation = await createGroupChat({
        name: formData.name.trim(),
        avatar: formData.avatar || undefined,
        memberIds: Array.from(selectedIds)
      })
      if (conversation) {
        onCreated(conversation)
        handleClose()
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '创建群聊失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setFormData({ name: '', avatar: '', memberIds: [] })
      setSelectedIds(new Set())
      setSearchKeyword('')
      setSelectedTab('contacts')
      setSelectedTeamId(null)
      setSelectedDeptId(null)
      setErrors({})
      onClose()
    }
  }

  if (!visible) return null

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={handleClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">创建群聊</h3>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Avatar
                    src={formData.avatar || undefined}
                    size="xl"
                    nickname={formData.name || 'G'}
                    className="cursor-pointer"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      群名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                        if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                      }}
                      placeholder="请输入群名称"
                      className={`w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all ${errors.name ? 'ring-2 ring-red-500/30' : ''}`}
                      maxLength={50}
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      群头像 URL（可选）
                    </label>
                    <input
                      type="url"
                      value={formData.avatar || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, avatar: e.target.value }))}
                      placeholder="请输入群头像图片链接"
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  选择成员 <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-2">已选择 {selectedIds.size} 人</span>
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-[#3370FF] hover:text-[#2a5fd9]"
                  >
                    全选
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    清空
                  </button>
                </div>
              </div>

              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索成员"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                />
              </div>

              <div className="flex border-b border-gray-100 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTab('contacts')
                    setSelectedTeamId(null)
                    setSelectedDeptId(null)
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    selectedTab === 'contacts'
                      ? 'text-[#3370FF] border-b-2 border-[#3370FF]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  联系人
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('teams')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    selectedTab === 'teams'
                      ? 'text-[#3370FF] border-b-2 border-[#3370FF]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  团队/部门
                </button>
              </div>

              {selectedTab === 'teams' && (
                <div className="flex space-x-2 mb-3">
                  <select
                    value={selectedTeamId || ''}
                    onChange={(e) => {
                      setSelectedTeamId(e.target.value || null)
                      setSelectedDeptId(null)
                    }}
                    className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                  >
                    <option value="">选择团队</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  {selectedTeamId && departments.length > 0 && (
                    <select
                      value={selectedDeptId || ''}
                      onChange={(e) => setSelectedDeptId(e.target.value || null)}
                      className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                    >
                      <option value="">全部部门</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {errors.members && (
                <p className="text-xs text-red-500 mb-2">{errors.members}</p>
              )}

              <div className="max-h-[200px] overflow-y-auto border border-gray-100 rounded-xl p-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="w-6 h-6 text-[#3370FF] animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-400 text-sm">暂无成员</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredMembers.map((member) => {
                      const isSelected = selectedIds.has(member.id)
                      return (
                        <div
                          key={member.id}
                          onClick={() => toggleSelect(member.id)}
                          className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#3370FF]/10'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Avatar
                            src={member.avatar || undefined}
                            size="sm"
                            nickname={member.nickname}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#3370FF]' : 'text-gray-900'}`}>
                              {member.nickname}
                            </p>
                            {member.sourceName && (
                              <p className="text-xs text-gray-400 truncate">{member.sourceName}</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[#3370FF] border-[#3370FF]'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.name.trim() || selectedIds.size === 0}
                className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all"
              >
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default CreateGroupModal
