import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Department, DepartmentMember } from '../../types'
import { getDepartmentContacts } from '../../api/departments'
import { createConversation } from '../../api/conversations'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import useAuthStore from '../../store/auth'

interface ContactsViewProps {
  teamId: string
}

interface MemberWithDepartment extends DepartmentMember {
  department: Department
}

function getFirstLetter(name: string): string {
  if (!name) return '#'
  const firstChar = name.charAt(0).toUpperCase()
  const code = firstChar.charCodeAt(0)
  if (code >= 65 && code <= 90) return firstChar
  return '#'
}

function groupByFirstLetter(members: MemberWithDepartment[]): Record<string, MemberWithDepartment[]> {
  const groups: Record<string, MemberWithDepartment[]> = {}
  members.forEach((member) => {
    const letter = getFirstLetter(member.user.nickname)
    if (!groups[letter]) {
      groups[letter] = []
    }
    groups[letter].push(member)
  })
  return groups
}

function ContactsView({ teamId }: ContactsViewProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'tree' | 'alphabet'>('tree')
  const [selectedMember, setSelectedMember] = useState<MemberWithDepartment | null>(null)
  const [startingChat, setStartingChat] = useState(false)
  const navigate = useNavigate()
  const { toast, showToast, hideToast } = useToast()
  const { user } = useAuthStore()

  useEffect(() => {
    if (teamId) {
      loadContacts()
    }
  }, [teamId])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await getDepartmentContacts(teamId)
      setDepartments(data || [])
      if (data && data.length > 0 && !selectedDepartmentId) {
        setSelectedDepartmentId(data[0].id)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载通讯录失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const allMembers = useMemo((): MemberWithDepartment[] => {
    const members: MemberWithDepartment[] = []
    const collectMembers = (depts: Department[]) => {
      depts.forEach((dept) => {
        if (dept.members) {
          dept.members.forEach((member) => {
            if (member.userId !== user?.id) {
              members.push({ ...member, department: dept })
            }
          })
        }
        if (dept.children && dept.children.length > 0) {
          collectMembers(dept.children)
        }
      })
    }
    collectMembers(departments)
    return members
  }, [departments, user?.id])

  const filteredMembers = useMemo(() => {
    if (!searchKeyword.trim()) return allMembers
    const keyword = searchKeyword.toLowerCase()
    return allMembers.filter((member) =>
      member.user.nickname.toLowerCase().includes(keyword) ||
      member.user.email.toLowerCase().includes(keyword) ||
      (member.position && member.position.toLowerCase().includes(keyword)) ||
      member.department.name.toLowerCase().includes(keyword)
    )
  }, [allMembers, searchKeyword])

  const groupedMembers = useMemo(() => {
    return groupByFirstLetter(filteredMembers)
  }, [filteredMembers])

  const sortedLetters = useMemo(() => {
    const letters = Object.keys(groupedMembers).sort()
    const hashIndex = letters.indexOf('#')
    if (hashIndex > -1) {
      letters.splice(hashIndex, 1)
      letters.push('#')
    }
    return letters
  }, [groupedMembers])

  const selectedDepartmentMembers = useMemo(() => {
    if (!selectedDepartmentId) return []
    const findDept = (depts: Department[]): Department | null => {
      for (const dept of depts) {
        if (dept.id === selectedDepartmentId) return dept
        if (dept.children && dept.children.length > 0) {
          const found = findDept(dept.children)
          if (found) return found
        }
      }
      return null
    }
    const dept = findDept(departments)
    if (!dept) return []

    const collectMembers = (d: Department): DepartmentMember[] => {
      let members = d.members || []
      if (d.children && d.children.length > 0) {
        d.children.forEach((child) => {
          members = [...members, ...collectMembers(child)]
        })
      }
      return members
    }

    return collectMembers(dept).filter((m) => m.userId !== user?.id)
  }, [departments, selectedDepartmentId, user?.id])

  const handleStartChat = async (member: MemberWithDepartment | DepartmentMember) => {
    try {
      setStartingChat(true)
      const conversation = await createConversation(member.userId)
      if (conversation) {
        navigate(`/chats/${conversation.id}`)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '发起聊天失败', 'error')
    } finally {
      setStartingChat(false)
      setSelectedMember(null)
    }
  }

  const DepartmentTreeNode = ({ dept, level }: { dept: Department; level: number }) => {
    const [expanded, setExpanded] = useState(true)
    const hasChildren = dept.children && dept.children.length > 0
    const isSelected = selectedDepartmentId === dept.id
    const memberCount = (dept.members || []).length

    return (
      <div>
        <div
          onClick={() => setSelectedDepartmentId(dept.id)}
          className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${isSelected ? 'bg-[#3370FF]/10' : 'hover:bg-gray-50'}`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (hasChildren) setExpanded(!expanded)
            }}
            className={`w-5 h-5 flex items-center justify-center mr-1.5 rounded ${hasChildren ? 'hover:bg-gray-100' : 'invisible'}`}
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className={`flex-1 text-sm ${isSelected ? 'text-[#3370FF] font-medium' : 'text-gray-700'}`}>
            {dept.name}
          </span>
          <span className="text-xs text-gray-400 ml-2">{memberCount}人</span>
        </div>
        {hasChildren && expanded && (
          <div>
            {dept.children!.map((child) => (
              <DepartmentTreeNode key={child.id} dept={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const MemberCard = ({ member, deptName }: { member: DepartmentMember | MemberWithDepartment; deptName?: string }) => {
    const dept = 'department' in member ? member.department.name : deptName
    return (
      <div
        onClick={() => setSelectedMember(member as MemberWithDepartment)}
        className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <Avatar
          src={member.user.avatar}
          size="md"
          nickname={member.user.nickname}
          status={member.user.status as 'online' | 'offline' | 'busy' | 'away'}
        />
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-gray-900 truncate">{member.user.nickname}</h3>
            {member.position && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                {member.position}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{dept}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">组织通讯录</h2>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索姓名、邮箱、职位、部门"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === 'tree' ? 'bg-[#3370FF] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              按部门
            </button>
            <button
              onClick={() => setViewMode('alphabet')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === 'alphabet' ? 'bg-[#3370FF] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              按字母
            </button>
            <div className="flex-1" />
            <span className="text-xs text-gray-400">共 {filteredMembers.length} 位同事</span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {viewMode === 'tree' && !searchKeyword && (
            <div className="w-64 border-r border-gray-100 overflow-y-auto p-2">
              {departments.map((dept) => (
                <DepartmentTreeNode key={dept.id} dept={dept} level={0} />
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === 'alphabet' || searchKeyword ? (
              filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {searchKeyword ? '未找到匹配的联系人' : '暂无联系人'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedLetters.map((letter) => (
                    <div key={letter}>
                      <div className="sticky top-0 bg-white py-2 px-1 border-b border-gray-100">
                        <span className="text-sm font-semibold text-[#3370FF]">{letter}</span>
                        <span className="text-xs text-gray-400 ml-2">{groupedMembers[letter].length}人</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                        {groupedMembers[letter].map((member) => (
                          <MemberCard key={member.id} member={member} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              selectedDepartmentMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">该部门暂无成员</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {selectedDepartmentMembers.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedMember(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <Avatar
                src={selectedMember.user.avatar}
                size="xl"
                nickname={selectedMember.user.nickname}
                status={selectedMember.user.status as 'online' | 'offline' | 'busy' | 'away'}
                className="mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedMember.user.nickname}</h3>
              {selectedMember.position && (
                <p className="text-sm text-gray-500 mb-2">{selectedMember.position}</p>
              )}
              <p className="text-sm text-gray-400 mb-4">
                {'department' in selectedMember ? selectedMember.department.name : ''}
              </p>

              <div className="space-y-2 text-left bg-gray-50 rounded-lg p-4 mb-4">
                {selectedMember.phone && (
                  <div className="flex items-center space-x-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm text-gray-700">{selectedMember.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-700">{selectedMember.email || selectedMember.user.email}</span>
                </div>
              </div>

              <button
                onClick={() => handleStartChat(selectedMember)}
                disabled={startingChat}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#3370FF] hover:bg-[#3370FF]/90 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {startingChat ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )}
                <span>发起聊天</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ContactsView
