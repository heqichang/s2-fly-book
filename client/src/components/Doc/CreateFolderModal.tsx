import { useState } from 'react'
import { createFolder } from '../../api/documents'
import type { DocFolder, CreateFolderRequest } from '../../types'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

interface CreateFolderModalProps {
  visible: boolean
  onClose: () => void
  onCreated: (folder: DocFolder) => void
  teamId: string
  parentId?: string
}

function CreateFolderModal({ visible, onClose, onCreated, teamId, parentId }: CreateFolderModalProps) {
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) {
      newErrors.name = '文件夹名称不能为空'
    } else if (name.length > 50) {
      newErrors.name = '文件夹名称不能超过50个字符'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSubmitting(true)
      const data: CreateFolderRequest = {
        teamId,
        name: name.trim(),
        parentId: parentId || undefined
      }
      const folder = await createFolder(data)
      if (folder) {
        onCreated(folder)
        setName('')
        setErrors({})
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '创建文件夹失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setName('')
      setErrors({})
      onClose()
    }
  }

  if (!visible) return null

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={handleClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">创建文件夹</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
              文件夹名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                }}
                placeholder="请输入文件夹名称"
                className={`w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all ${errors.name ? 'ring-2 ring-red-500/30' : ''}`}
                maxLength={50}
                autoFocus
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>
            <div className="flex items-center justify-end space-x-3">
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
                disabled={submitting || !name.trim()}
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

export default CreateFolderModal
