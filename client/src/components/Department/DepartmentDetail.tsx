import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Department, DepartmentMember, User } from '../../types'
import {
  getDepartmentMembers,
  addDepartmentMember,
  updateDepartmentMember,
  removeDepartmentMember
} from '../../api/departments'
import { createDepartmentGroup } from '../../api/conversations'
import { searchUsers } from '../../api/users'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

interface DepartmentDetailProps {
  department: Department
  onRefresh?: () => void
}

interface EditMemberState {
  memberId: string
  position: string
  phone: string
  email: string
}

function DepartmentDetail({ department, onRefresh }: DepartmentDetailProps) {
  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [editingMember, setEditingMember] = useState<EditMemberState | null>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (department?.id) {
      loadMembers()
    }
  }, [department?.id])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const data = await getDepartmentMembers(department.id)
      setMembers(data || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载成员失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchUser = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([])
      return
    }
    try {
      setSearchLoading(true)
      const data = await searchUsers(searchKeyword)
      const existingUserIds = new Set(members.map((m) => m.userId))
      const filtered = (data || []).filter((u) => !existingUserIds.has(u.id))
      setSearchResults(filtered)
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '搜索用户失败', 'error')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleAddMember = async (user: User) => {
    try {
      await addDepartmentMember(department.id, {
        userId: user.id,
        email: user.email
      })
      showToast('添加成功', 'success')
      setSearchKeyword('')
      setSearchResults([])
      loadMembers()
      onRefresh?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '添加成员失败', 'error')
    }
  }

  const handleEditMember = (member: DepartmentMember) => {
    setEditingMember({
      memberId: member.id,
      position: member.position || '',
      phone: member.phone || member.user.phone || '',
      email: member.email || member.user.email
    })
  }

  const handleSaveMember = async () => {
    if (!editingMember) return
    try {
      await updateDepartmentMember(department.id, editingMember.memberId, {
        position: editingMember.position || undefined,
        phone: editingMember.phone || undefined,
        email: editingMember.email || undefined
      })
      showToast('保存成功', 'success')
      setEditingMember(null)
      loadMembers()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '保存失败', 'error')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('确定要移除该成员吗？')) return
    try {
      await removeDepartmentMember(department.id, memberId)
      showToast('移除成功', 'success')
      loadMembers()
      onRefresh?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '移除失败', 'error')
    }
  }

  const handleCreateGroup = async () => {
    if (members.length === 0) {
      showToast('部门暂无成员，无法创建群聊', 'error')
      return
    }
    try {
      setCreatingGroup(true)
      const conversation = await createDepartmentGroup({
        departmentId: department.id,
        name: groupName || `${department.name}群`
      })
      showToast('群聊创建成功', 'success')
      setShowCreateGroup(false)
      setGroupName('')
      if (conversation) {
        navigate(`/chats/${conversation.id}`)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '创建群聊失败', 'error')
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleChatWithMember = (member: DepartmentMember) => {
    navigate(`/chats?userId=${member.userId}`)
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="h-full flex flex-col bg-white">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#3370FF] to-[#5B8DEF] flex items-center justify-center text-white text-2xl font-bold">
                {department.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">{department.name}</h1>
                {department.parent && (
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>上级部门：{department.parent.name}</span>
                  </div>
                )}
                {department.description && (
                  <p className="text-sm text-gray-500">{department.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-4 py-2 text-sm font-medium text-[#3370FF] bg-[#3370FF]/10 hover:bg-[#3370FF]/20 rounded-lg transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                <span>创建部门群</span>
              </button>
              <button
                onClick={() => setShowAddMember(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#3370FF] hover:bg-[#3370FF]/90 rounded-lg transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>添加成员</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">成员数量</p>
                <p className="text-lg font-semibold text-gray-900">{department.memberCount || members.length}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">子部门数量</p>
                <p className="text-lg font-semibold text-gray-900">{department.childrenCount || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">成员列表</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-48 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-4">暂无成员，点击上方按钮添加</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {members.map((member) => (
                  <div key={member.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    {editingMember?.memberId === member.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">职位</label>
                            <input
                              type="text"
                              value={editingMember.position}
                              onChange={(e) => setEditingMember({ ...editingMember, position: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:border-[#3370FF]"
                              placeholder="请输入职位"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">手机号</label>
                            <input
                              type="text"
                              value={editingMember.phone}
                              onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:border-[#3370FF]"
                              placeholder="请输入手机号"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">邮箱</label>
                            <input
                              type="email"
                              value={editingMember.email}
                              onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:border-[#3370FF]"
                              placeholder="请输入邮箱"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setEditingMember(null)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSaveMember}
                            className="px-3 py-1.5 text-sm text-white bg-[#3370FF] hover:bg-[#3370FF]/90 rounded-lg transition-colors"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Avatar
                            src={member.user.avatar}
                            size="md"
                            nickname={member.user.nickname}
                            status={member.user.status as 'online' | 'offline' | 'busy' | 'away'}
                            onClick={() => handleChatWithMember(member)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900 truncate">{member.user.nickname}</h3>
                              {member.position && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                  {member.position}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              {member.phone && (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span>{member.phone}</span>
                                </div>
                              )}
                              {member.email && (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="truncate">{member.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-4">
                          <button
                            onClick={() => handleChatWithMember(member)}
                            className="p-2 rounded-lg text-gray-400 hover:text-[#3370FF] hover:bg-[#3370FF]/5 transition-colors"
                            title="发起聊天"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditMember(member)}
                            className="p-2 rounded-lg text-gray-400 hover:text-[#3370FF] hover:bg-[#3370FF]/5 transition-colors"
                            title="编辑信息"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="移除成员"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddMember(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">添加成员</h3>
              <button
                onClick={() => setShowAddMember(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索用户邮箱"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                />
                <button
                  onClick={handleSearchUser}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-white bg-[#3370FF] hover:bg-[#3370FF]/90 rounded-md transition-colors"
                >
                  搜索
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3370FF]" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {searchKeyword ? '未找到匹配的用户' : '请输入邮箱搜索用户'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar src={user.avatar} size="sm" nickname={user.nickname} />
                          <div>
                            <p className="font-medium text-sm text-gray-900">{user.nickname}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddMember(user)}
                          className="px-3 py-1 text-xs font-medium text-white bg-[#3370FF] hover:bg-[#3370FF]/90 rounded-md transition-colors"
                        >
                          添加
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateGroup(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">创建部门群聊</h3>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">群聊名称</label>
              <input
                type="text"
                placeholder={`默认：${department.name}群`}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:border-[#3370FF] mb-4"
              />
              <p className="text-xs text-gray-500 mb-4">
                将添加部门全部 {members.length} 位成员到群聊
              </p>
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup}
                  className="px-4 py-2 text-sm text-white bg-[#3370FF] hover:bg-[#3370FF]/90 disabled:opacity-50 rounded-lg transition-colors flex items-center space-x-1"
                >
                  {creatingGroup && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  )}
                  <span>创建</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DepartmentDetail
