import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import {
  getTeam,
  getTeamMembers,
  updateTeam,
  updateMemberRole,
  removeMember,
  leaveTeam
} from '../../api/teams'
import type { Team, TeamMember, UpdateTeamRequest } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import { useAuthStore } from '../../store/auth'

interface TeamDetailProps {
  teamId: string
  onTeamLeft?: () => void
  onTeamUpdated?: () => void
}

type RoleType = 'owner' | 'admin' | 'member'

const roleLabels: Record<RoleType, string> = {
  owner: '创建者',
  admin: '管理员',
  member: '成员'
}

const roleColors: Record<RoleType, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-gray-100 text-gray-700'
}

function TeamDetail({ teamId, onTeamLeft, onTeamUpdated }: TeamDetailProps) {
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UpdateTeamRequest>({})
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set())
  const [leaveModal, setLeaveModal] = useState(false)
  const [removeMemberModal, setRemoveMemberModal] = useState<{ show: boolean; member: TeamMember | null }>({ show: false, member: null })
  const { user: currentUser } = useAuthStore()
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    loadTeamData()
  }, [teamId])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      const [teamData, membersData] = await Promise.all([
        getTeam(teamId),
        getTeamMembers(teamId)
      ])
      setTeam(teamData || null)
      setMembers(membersData || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载团队信息失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const currentUserRole = members.find((m) => m.userId === currentUser?.id)?.role as RoleType | undefined
  const isOwner = currentUserRole === 'owner'
  const isAdmin = isOwner || currentUserRole === 'admin'

  const handleStartEdit = () => {
    if (!team) return
    setEditForm({
      name: team.name,
      logo: team.logo || undefined,
      description: team.description || undefined
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm({})
  }

  const handleSaveEdit = async () => {
    if (!team) return
    try {
      setActionLoadingIds((prev) => new Set(prev).add('edit'))
      const updatedTeam = await updateTeam(teamId, {
        name: editForm.name?.trim(),
        logo: editForm.logo,
        description: editForm.description
      })
      setTeam(updatedTeam || null)
      setIsEditing(false)
      setEditForm({})
      showToast('团队信息已更新', 'success')
      onTeamUpdated?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '更新失败', 'error')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete('edit')
        return next
      })
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      setActionLoadingIds((prev) => new Set(prev).add(`role-${memberId}`))
      await updateMemberRole(teamId, memberId, newRole)
      setMembers((prev) =>
        prev.map((m) => (m.userId === memberId ? { ...m, role: newRole } : m))
      )
      showToast('角色已更新', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(`role-${memberId}`)
        return next
      })
    }
  }

  const handleRemoveMember = async () => {
    const member = removeMemberModal.member
    if (!member) return
    try {
      setActionLoadingIds((prev) => new Set(prev).add(`remove-${member.id}`))
      await removeMember(teamId, member.userId)
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId))
      setRemoveMemberModal({ show: false, member: null })
      showToast('已移除成员', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(`remove-${member?.id || ''}`)
        return next
      })
    }
  }

  const handleLeaveTeam = async () => {
    try {
      setActionLoadingIds((prev) => new Set(prev).add('leave'))
      await leaveTeam(teamId)
      setLeaveModal(false)
      showToast('已退出团队', 'success')
      onTeamLeft?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '退出失败', 'error')
    } finally {
      setActionLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete('leave')
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f6f7]">
        <div className="animate-spin w-8 h-8 border-2 border-[#3370FF] border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-gray-500">加载中...</p>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f6f7]">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">团队不存在或已被解散</p>
      </div>
    )
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f6f7]">
        <div className="bg-white border-b border-gray-100 p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <Avatar
                  src={editForm.logo || team.logo || undefined}
                  size="xl"
                  nickname={editForm.name || team.name}
                />
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      团队名称
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={editForm.logo || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, logo: e.target.value }))}
                      placeholder="请输入Logo图片链接"
                      className="w-full px-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  团队简介
                </label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 resize-none"
                  placeholder="请输入团队简介..."
                />
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleCancelEdit}
                  disabled={actionLoadingIds.has('edit')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={actionLoadingIds.has('edit') || !editForm.name?.trim()}
                  className="px-4 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
                >
                  {actionLoadingIds.has('edit') ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <Avatar
                  src={team.logo || undefined}
                  size="xl"
                  nickname={team.name}
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>
                    {currentUserRole && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[currentUserRole]}`}>
                        {roleLabels[currentUserRole]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    {team.description || '暂无团队简介'}
                  </p>
                  <div className="flex items-center space-x-6 text-xs text-gray-400">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {members.length} 位成员
                    </span>
                    {team.owner && (
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        创建者：{team.owner.nickname}
                      </span>
                    )}
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      创建于 {dayjs(team.createdAt).format('YYYY-MM-DD')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <button
                    onClick={handleStartEdit}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    编辑
                  </button>
                )}
                {!isOwner && (
                  <button
                    onClick={() => setLeaveModal(true)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-all flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    退出团队
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">团队成员</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {members.map((member) => {
                const memberRole = member.role as RoleType
                const isCurrentUser = member.userId === currentUser?.id
                const canManage = isAdmin && !isCurrentUser && memberRole !== 'owner'
                const isRoleLoading = actionLoadingIds.has(`role-${member.userId}`)
                const status = (member.user.status === 'online' || member.user.status === 'offline' || member.user.status === 'busy' || member.user.status === 'away')
                  ? member.user.status
                  : undefined

                return (
                  <div
                    key={member.userId}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={member.user.avatar || undefined}
                        size="md"
                        nickname={member.user.nickname}
                        status={status}
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-gray-900">
                            {member.user.nickname}
                            {isCurrentUser && <span className="text-gray-400 font-normal">（我）</span>}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[memberRole]}`}>
                            {roleLabels[memberRole]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {member.user.email} · 加入于 {dayjs(member.joinedAt).format('YYYY-MM-DD')}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center space-x-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                          disabled={isRoleLoading}
                          className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 disabled:opacity-50"
                        >
                          <option value="member">成员</option>
                          <option value="admin">管理员</option>
                        </select>
                        <button
                          onClick={() => setRemoveMemberModal({ show: true, member })}
                          disabled={isRoleLoading}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="移除成员"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setLeaveModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">退出团队</h3>
            <p className="text-sm text-gray-500 mb-6">
              确定要退出团队 <span className="font-medium text-gray-700">{team.name}</span> 吗？退出后将不再接收团队消息。
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setLeaveModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
              >
                取消
              </button>
              <button
                onClick={handleLeaveTeam}
                disabled={actionLoadingIds.has('leave')}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
              >
                {actionLoadingIds.has('leave') ? '退出中...' : '确认退出'}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeMemberModal.show && removeMemberModal.member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setRemoveMemberModal({ show: false, member: null })}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">移除成员</h3>
            <p className="text-sm text-gray-500 mb-6">
              确定要移除成员 <span className="font-medium text-gray-700">{removeMemberModal.member.user.nickname}</span> 吗？移除后该成员将无法访问团队。
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setRemoveMemberModal({ show: false, member: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
              >
                取消
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={actionLoadingIds.has(`remove-${removeMemberModal.member.id}`)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
              >
                {actionLoadingIds.has(`remove-${removeMemberModal.member.id}`) ? '移除中...' : '确认移除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TeamDetail
