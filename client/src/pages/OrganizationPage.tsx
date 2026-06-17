import { useState, useEffect } from 'react'
import type { Department, Team } from '../types'
import { getDepartments, getDepartmentTree } from '../api/departments'
import { getMyTeams } from '../api/teams'
import DepartmentTree from '../components/Department/DepartmentTree'
import DepartmentDetail from '../components/Department/DepartmentDetail'
import ContactsView from '../components/Department/ContactsView'
import CreateDepartmentModal from '../components/Department/CreateDepartmentModal'
import useToast from '../hooks/useToast'
import Toast from '../components/common/Toast'

function OrganizationPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [activeTab, setActiveTab] = useState<'detail' | 'contacts'>('detail')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const data = await getMyTeams()
      if (data && data.length > 0) {
        setTeams(data)
        setSelectedTeam(data[0])
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载团队失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTeam) {
      loadDepartments(selectedTeam.id)
    }
  }, [selectedTeam])

  const loadDepartments = async (teamId: string) => {
    try {
      setLoading(true)
      const data = await getDepartments(teamId)
      setDepartments(data || [])
      if (data && data.length > 0 && !selectedDepartment) {
        const firstDept = await getDepartmentTree(data[0].id)
        setSelectedDepartment(firstDept || null)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载部门失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDepartment = async (dept: Department) => {
    try {
      const fullDept = await getDepartmentTree(dept.id)
      setSelectedDepartment(fullDept || null)
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载部门详情失败', 'error')
    }
  }

  const handleCreateDepartment = (parentId?: string) => {
    setCreateParentId(parentId)
    setShowCreateModal(true)
  }

  const handleDepartmentCreated = () => {
    if (selectedTeam) {
      loadDepartments(selectedTeam.id)
    }
  }

  const handleRefresh = () => {
    if (selectedTeam) {
      loadDepartments(selectedTeam.id)
    }
    if (selectedDepartment) {
      handleSelectDepartment(selectedDepartment)
    }
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="h-full flex bg-[#f5f6f7] overflow-hidden">
        <div className="w-[320px] bg-[#f5f6f7] flex flex-col flex-shrink-0 border-r border-gray-100">
          {teams.length > 1 && (
            <div className="p-3 border-b border-gray-100 bg-white">
              <label className="block text-xs text-gray-500 mb-1.5">选择团队</label>
              <select
                value={selectedTeam?.id || ''}
                onChange={(e) => {
                  const team = teams.find((t) => t.id === e.target.value)
                  if (team) {
                    setSelectedTeam(team)
                    setSelectedDepartment(null)
                  }
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:border-[#3370FF]"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          )}
          <DepartmentTree
            departments={departments}
            selectedDepartmentId={selectedDepartment?.id}
            onSelect={handleSelectDepartment}
            onCreateDepartment={handleCreateDepartment}
            loading={loading}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {selectedDepartment ? (
            <>
              <div className="bg-white border-b border-gray-100 px-4 flex items-center">
                <button
                  onClick={() => setActiveTab('detail')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'detail' ? 'text-[#3370FF] border-[#3370FF]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                >
                  部门详情
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'contacts' ? 'text-[#3370FF] border-[#3370FF]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                >
                  通讯录
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'detail' ? (
                  <DepartmentDetail
                    department={selectedDepartment}
                    onRefresh={handleRefresh}
                  />
                ) : (
                  selectedTeam && (
                    <ContactsView teamId={selectedTeam.id} />
                  )
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
              <div className="w-28 h-28 rounded-full bg-gray-50 shadow-sm flex items-center justify-center mb-6">
                <svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">组织架构</h3>
              <p className="text-sm text-gray-400">从左侧选择部门查看详情</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && selectedTeam && (
        <CreateDepartmentModal
          visible={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setCreateParentId(undefined)
          }}
          teamId={selectedTeam.id}
          parentId={createParentId}
          departments={departments}
          onCreated={handleDepartmentCreated}
        />
      )}
    </>
  )
}

export default OrganizationPage
