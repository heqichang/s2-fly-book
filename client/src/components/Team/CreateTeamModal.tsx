import { useState } from 'react'
import { createTeam } from '../../api/teams'
import type { Team, CreateTeamRequest } from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'

interface CreateTeamModalProps {
  visible: boolean
  onClose: () => void
  onCreated: (team: Team) => void
}

function CreateTeamModal({ visible, onClose, onCreated }: CreateTeamModalProps) {
  const [formData, setFormData] = useState<CreateTeamRequest>({
    name: '',
    logo: '',
    description: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = '团队名称不能为空'
    } else if (formData.name.length > 50) {
      newErrors.name = '团队名称不能超过50个字符'
    }
    if (formData.description && formData.description.length > 200) {
      newErrors.description = '团队简介不能超过200个字符'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSubmitting(true)
      const team = await createTeam({
        name: formData.name.trim(),
        logo: formData.logo || undefined,
        description: formData.description || undefined
      })
      if (team) {
        onCreated(team)
        setFormData({ name: '', logo: '', description: '' })
        setErrors({})
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '创建团队失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setFormData({ name: '', logo: '', description: '' })
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">创建团队</h3>
          <form onSubmit={handleSubmit}>
            <div className="flex items-start space-x-4 mb-6">
              <div className="flex-shrink-0">
                <Avatar
                  src={formData.logo || undefined}
                  size="xl"
                  nickname={formData.name || 'T'}
                  className="cursor-pointer"
                />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    团队名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    placeholder="请输入团队名称"
                    className={`w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all ${errors.name ? 'ring-2 ring-red-500/30' : ''}`}
                    maxLength={50}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Logo URL（可选）
                  </label>
                  <input
                    type="url"
                    value={formData.logo || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, logo: e.target.value }))}
                    placeholder="请输入Logo图片链接"
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                团队简介（可选）
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }))
                }}
                placeholder="请输入团队简介..."
                rows={3}
                maxLength={200}
                className={`w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all resize-none ${errors.description ? 'ring-2 ring-red-500/30' : ''}`}
              />
              <div className="flex justify-between mt-1">
                {errors.description ? (
                  <p className="text-xs text-red-500">{errors.description}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-400">
                  {(formData.description || '').length}/200
                </span>
              </div>
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
                disabled={submitting || !formData.name.trim()}
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

export default CreateTeamModal
