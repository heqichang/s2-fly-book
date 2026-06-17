import { useState, useEffect } from 'react'
import { inviteTeamMembers } from '../../api/teams'
import { getContacts } from '../../api/contacts'
import { searchUsers } from '../../api/users'
import type { Contact, User } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

interface InviteMembersModalProps {
  teamId: string
  visible: boolean
  onClose: () => void
  onInvited: () => void
}

type TabType = 'contacts' | 'search'

type SelectableUser = {
  id: string
  nickname: string
  avatar?: string | null
  email?: string
}

function InviteMembersModal({ teamId, visible, onClose, onInvited }: InviteMembersModalProps) {
  const [selectedTab, setSelectedTab] = useState<TabType>('contacts')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (visible) {
      setSelectedTab('contacts')
      setSelectedIds(new Set())
      setSearchKeyword('')
      setSearchResults([])
      loadContacts()
    }
  }, [visible])

  useEffect(() => {
    if (selectedTab === 'search' && searchKeyword.trim()) {
      handleSearchUsers()
    } else if (selectedTab === 'search') {
      setSearchResults([])
    }
  }, [selectedTab, searchKeyword])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await getContacts()
      setContacts(data || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载联系人失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchUsers = async () => {
    try {
      setSearching(true)
      const keyword = searchKeyword.trim()
      const data = await searchUsers(keyword)
      setSearchResults(data || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const getContactsUsers = (): SelectableUser[] => {
    return (contacts || []).map((c) => ({
      id: c.user.id,
      nickname: c.user.nickname,
      avatar: c.user.avatar,
      email: c.user.email
    }))
  }

  const getSearchUsers = (): SelectableUser[] => {
    return (searchResults || []).map((u) => ({
      id: u.id,
      nickname: u.nickname,
      avatar: u.avatar,
      email: u.email
    }))
  }

  const getFilteredContacts = (): SelectableUser[] => {
    const users = getContactsUsers()
    if (!searchKeyword) return users
    const keyword = searchKeyword.toLowerCase()
    return users.filter(
      (u) =>
        u.nickname.toLowerCase().includes(keyword) ||
        (u.email && u.email.toLowerCase().includes(keyword))
    )
  }

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
    const users = selectedTab === 'contacts' ? getFilteredContacts() : getSearchUsers()
    const allIds = users.map((u) => u.id)
    setSelectedIds(new Set(allIds))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleInvite = async () => {
    if (selectedIds.size === 0) return
    try {
      setSubmitting(true)
      const response = await inviteTeamMembers(teamId, {
        userIds: Array.from(selectedIds)
      })
      if (response) {
        showToast(`成功邀请 ${response.addedCount} 位成员`, 'success')
        handleClose()
        onInvited()
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '邀请失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setSelectedIds(new Set())
      setSearchKeyword('')
      setSelectedTab('contacts')
      setSearchResults([])
      onClose()
    }
  }

  const currentUsers = selectedTab === 'contacts' ? getFilteredContacts() : getSearchUsers()

  if (!visible) return null

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={handleClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">邀请成员</h3>
          </div>

          <div className="flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={selectedTab === 'contacts' ? '搜索联系人昵称或邮箱' : '输入邮箱搜索用户'}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  选择成员
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

              <div className="flex border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTab('contacts')
                    setSearchKeyword('')
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    selectedTab === 'contacts'
                      ? 'text-[#3370FF] border-b-2 border-[#3370FF]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  从联系人选择
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
                  搜索用户
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto max-h-[320px]">
              {selectedTab === 'contacts' ? (
                loading ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="w-6 h-6 text-[#3370FF] animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : currentUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-400 text-sm">
                      {searchKeyword ? '没有找到匹配的联系人' : '暂无联系人'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {currentUsers.map((user) => {
                      const isSelected = selectedIds.has(user.id)
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleSelect(user.id)}
                          className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#3370FF]/10'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Avatar
                            src={user.avatar || undefined}
                            size="sm"
                            nickname={user.nickname}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#3370FF]' : 'text-gray-900'}`}>
                              {user.nickname}
                            </p>
                            {user.email && (
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
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
                )
              ) : (
                searching ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="w-6 h-6 text-[#3370FF] animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : !searchKeyword.trim() ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-400 text-sm">请输入邮箱搜索用户</p>
                  </div>
                ) : currentUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-400 text-sm">没有找到匹配的用户</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {currentUsers.map((user) => {
                      const isSelected = selectedIds.has(user.id)
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleSelect(user.id)}
                          className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#3370FF]/10'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Avatar
                            src={user.avatar || undefined}
                            size="sm"
                            nickname={user.nickname}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#3370FF]' : 'text-gray-900'}`}>
                              {user.nickname}
                            </p>
                            {user.email && (
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
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
                )
              )}
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
                type="button"
                onClick={handleInvite}
                disabled={submitting || selectedIds.size === 0}
                className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all"
              >
                {submitting ? '邀请中...' : `邀请(${selectedIds.size}人)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default InviteMembersModal
