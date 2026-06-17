import { useState, useEffect } from 'react'
import type { Department } from '../../types'
import { getDepartments as apiGetDepartments } from '../../api/departments'
import { getMyTeams } from '../../api/teams'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import CreateDepartmentModal from './CreateDepartmentModal'

interface DepartmentTreeProps {
  departments?: Department[]
  selectedDepartmentId?: string
  onSelect?: (department: Department) => void
  onCreateDepartment?: (parentId?: string) => void
  loading?: boolean
  autoLoad?: boolean
  teamId?: string
}

interface TreeNodeProps {
  department: Department
  level: number
  selectedDepartmentId?: string
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onSelect: (department: Department) => void
  onCreateDepartment: (parentId?: string) => void
}

function TreeNode({
  department,
  level,
  selectedDepartmentId,
  expandedIds,
  onToggle,
  onSelect,
  onCreateDepartment
}: TreeNodeProps) {
  const hasChildren = department.children && department.children.length > 0
  const isExpanded = expandedIds.has(department.id)
  const isSelected = selectedDepartmentId === department.id

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggle(department.id)
    }
  }

  const handleCreate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCreateDepartment(department.id)
  }

  return (
    <div>
      <div
        onClick={() => onSelect(department)}
        className={`flex items-center px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-150 group ${isSelected ? 'bg-[#3370FF]/10' : 'hover:bg-white'}`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        <button
          onClick={handleToggle}
          className={`w-5 h-5 flex items-center justify-center mr-1.5 rounded transition-colors ${hasChildren ? 'hover:bg-gray-100' : 'invisible'}`}
        >
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`font-medium text-sm truncate ${isSelected ? 'text-[#3370FF]' : 'text-gray-900'}`}>
              {department.name}
            </span>
            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
              {department.memberCount !== undefined && department.memberCount > 0 && (
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {department.memberCount}人
                </span>
              )}
              {department.childrenCount !== undefined && department.childrenCount > 0 && (
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {department.childrenCount}个子部门
                </span>
              )}
              <button
                onClick={handleCreate}
                className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                title="添加子部门"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {department.children!.map((child) => (
            <TreeNode
              key={child.id}
              department={child}
              level={level + 1}
              selectedDepartmentId={selectedDepartmentId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreateDepartment={onCreateDepartment}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DepartmentTree({
  departments: externalDepartments,
  selectedDepartmentId,
  onSelect,
  onCreateDepartment,
  loading: externalLoading = false,
  autoLoad = true,
  teamId: externalTeamId
}: DepartmentTreeProps) {
  const [internalDepartments, setInternalDepartments] = useState<Department[]>([])
  const [internalTeamId, setInternalTeamId] = useState<string | null>(null)
  const [internalLoading, setInternalLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined)
  const { toast, showToast, hideToast } = useToast()

  const departments = externalDepartments ?? internalDepartments
  const loading = externalLoading || internalLoading
  const currentTeamId = externalTeamId ?? internalTeamId

  useEffect(() => {
    if (autoLoad && !externalDepartments) {
      loadTeamsAndDepartments()
    }
  }, [autoLoad, externalDepartments])

  const loadTeamsAndDepartments = async () => {
    try {
      setInternalLoading(true)
      const teams = await getMyTeams()
      if (teams && teams.length > 0) {
        setInternalTeamId(teams[0].id)
        const depts = await apiGetDepartments(teams[0].id)
        setInternalDepartments(depts || [])
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载部门失败', 'error')
    } finally {
      setInternalLoading(false)
    }
  }

  const handleInternalSelect = (dept: Department) => {
    onSelect?.(dept)
  }

  const handleInternalCreate = (parentId?: string) => {
    if (onCreateDepartment) {
      onCreateDepartment(parentId)
    } else {
      setCreateParentId(parentId)
      setShowCreateModal(true)
    }
  }

  const handleDepartmentCreated = () => {
    if (currentTeamId) {
      loadDepartments(currentTeamId)
    }
  }

  const loadDepartments = async (teamId: string) => {
    try {
      setInternalLoading(true)
      const depts = await apiGetDepartments(teamId)
      setInternalDepartments(depts || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载部门失败', 'error')
    } finally {
      setInternalLoading(false)
    }
  }

  useEffect(() => {
    const allIds = new Set<string>()
    const collectIds = (depts: Department[]) => {
      depts.forEach((d) => {
        allIds.add(d.id)
        if (d.children && d.children.length > 0) {
          collectIds(d.children)
        }
      })
    }
    if (departments.length > 0) {
      collectIds(departments)
    }
    setExpandedIds(allIds)
  }, [departments])

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    const allIds = new Set<string>()
    const collectIds = (depts: Department[]) => {
      depts.forEach((d) => {
        allIds.add(d.id)
        if (d.children && d.children.length > 0) {
          collectIds(d.children)
        }
      })
    }
    collectIds(departments)
    setExpandedIds(allIds)
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">组织架构</h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={expandAll}
              className="px-2 py-1 text-xs text-gray-500 hover:text-[#3370FF] hover:bg-[#3370FF]/5 rounded transition-colors"
            >
              全部展开
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 text-xs text-gray-500 hover:text-[#3370FF] hover:bg-[#3370FF]/5 rounded transition-colors"
            >
              全部折叠
            </button>
            <button
              onClick={() => handleInternalCreate()}
              className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-[#3370FF] hover:bg-[#3370FF]/90 rounded-lg transition-colors flex items-center space-x-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>新建部门</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-4">暂无部门，点击上方按钮创建第一个部门</p>
            <button
              onClick={() => handleInternalCreate()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#3370FF] hover:bg-[#3370FF]/90 rounded-lg transition-colors"
            >
              创建部门
            </button>
          </div>
        ) : (
          <div className="py-2">
            {departments.map((dept) => (
            <TreeNode
              key={dept.id}
              department={dept}
              level={0}
              selectedDepartmentId={selectedDepartmentId}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              onSelect={handleInternalSelect}
              onCreateDepartment={handleInternalCreate}
            />
          ))}
          </div>
        )}
      </div>

      {showCreateModal && currentTeamId && (
        <CreateDepartmentModal
          visible={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setCreateParentId(undefined)
          }}
          teamId={currentTeamId}
          parentId={createParentId}
          departments={departments}
          onCreated={handleDepartmentCreated}
        />
      )}
    </>
  )
}

export default DepartmentTree
