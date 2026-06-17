import { useState, useEffect } from 'react'
import type { Department } from '../../types'
import { createDepartment } from '../../api/departments'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

interface CreateDepartmentModalProps {
  visible: boolean
  onClose: () => void
  teamId: string
  parentId?: string
  departments: Department[]
  onCreated?: () => void
}

interface FormErrors {
  name?: string
  parentId?: string
}

function CreateDepartmentModal({
  visible,
  onClose,
  teamId,
  parentId,
  departments,
  onCreated
}: CreateDepartmentModalProps) {
  const [name, setName] = useState('')
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(parentId)
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (visible) {
      setName('')
      setSelectedParentId(parentId)
      setDescription('')
      setErrors({})
    }
  }, [visible, parentId])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = '请输入部门名称'
    } else if (name.trim().length > 50) {
      newErrors.name = '部门名称不能超过50个字符'
    }

    if (selectedParentId) {
      const findDept = (depts: Department[]): Department | null => {
        for (const dept of depts) {
          if (dept.id === selectedParentId) return dept
          if (dept.children && dept.children.length > 0) {
            const found = findDept(dept.children)
            if (found) return found
          }
        }
        return null
      }
      const parentDept = findDept(departments)
      if (!parentDept) {
        newErrors.parentId = '请选择有效的上级部门'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)
      await createDepartment(teamId, {
        name: name.trim(),
        parentId: selectedParentId || undefined,
        description: description.trim() || undefined
      })
      showToast('部门创建成功', 'success')
      onCreated?.()
      onClose()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '创建失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const getParentDeptName = (): string => {
    if (!selectedParentId) return '无（顶级部门）'
    const findDept = (depts: Department[]): string | null => {
      for (const dept of depts) {
        if (dept.id === selectedParentId) return dept.name
        if (dept.children && dept.children.length > 0) {
          const found = findDept(dept.children)
          if (found) return found
        }
      }
      return null
    }
    return findDept(departments) || '无（顶级部门）'
  }

  const renderDepartmentOptions = (depts: Department[], level: number = 0): JSX.Element[] => {
    const options: JSX.Element[] = []
    depts.forEach((dept) => {
      options.push(
        <option key={dept.id} value={dept.id}>
          {'　'.repeat(level)}└ {dept.name}
        </option>
      )
      if (dept.children && dept.children.length > 0) {
        options.push(...renderDepartmentOptions(dept.children, level + 1))
      }
    })
    return options
  }

  if (!visible) return null

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {parentId ? '创建子部门' : '创建部门'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                部门名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="请输入部门名称"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: undefined }))
                  }
                }}
                maxLength={50}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 transition-all ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-[#3370FF]'}`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-400 text-right">{name.length}/50</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                上级部门
              </label>
              {parentId ? (
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {getParentDeptName()}
                </div>
              ) : (
                <select
                  value={selectedParentId || ''}
                  onChange={(e) => {
                    setSelectedParentId(e.target.value || undefined)
                    if (errors.parentId) {
                      setErrors((prev) => ({ ...prev, parentId: undefined }))
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 transition-all ${errors.parentId ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-[#3370FF]'}`}
                >
                  <option value="">无（顶级部门）</option>
                  {departments.length > 0 && renderDepartmentOptions(departments)}
                </select>
              )}
              {errors.parentId && (
                <p className="mt-1 text-xs text-red-500">{errors.parentId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                部门描述
              </label>
              <textarea
                placeholder="请输入部门描述（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:border-[#3370FF] resize-none transition-all"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{description.length}/200</p>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex items-center justify-end space-x-2 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim()}
              className="px-4 py-2 text-sm text-white bg-[#3370FF] hover:bg-[#3370FF]/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-1"
            >
              {submitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              )}
              <span>{submitting ? '创建中...' : '创建'}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default CreateDepartmentModal
