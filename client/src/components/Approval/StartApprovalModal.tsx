import { useState, useEffect } from 'react'
import { getFormTemplates } from '../../api/form-templates'
import { getApprovalTemplates, getApprovalTemplateByFormTemplate } from '../../api/approval-templates'
import { getMyTeams } from '../../api/teams'
import { createApprovalInstance } from '../../api/approval-instances'
import type { FormTemplate, ApprovalTemplate, Team, ApprovalInstance, FormField, FormFieldOption } from '../../types'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import { useAuthStore } from '../../store/auth'

interface StartApprovalModalProps {
  visible: boolean
  onClose: () => void
  onCreated?: (instance: ApprovalInstance) => void
}

function StartApprovalModal({ visible, onClose, onCreated }: StartApprovalModalProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [approvalTemplates, setApprovalTemplates] = useState<ApprovalTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)
  const [currentApprovalTemplate, setCurrentApprovalTemplate] = useState<ApprovalTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [title, setTitle] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { user: currentUser } = useAuthStore()
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (visible) {
      loadTeams()
    }
  }, [visible])

  useEffect(() => {
    if (selectedTeamId && visible) {
      loadTemplates(selectedTeamId)
    }
  }, [selectedTeamId, visible])

  useEffect(() => {
    if (selectedTemplate && visible) {
      loadApprovalTemplate(selectedTemplate.id)
      const defaults: Record<string, unknown> = {}
      selectedTemplate.fields?.forEach((f) => {
        if (f.defaultValue !== null && f.defaultValue !== undefined) {
          defaults[f.fieldKey] = f.defaultValue
        }
      })
      setFormData(defaults)
      setTitle('')
      setErrors({})
    }
  }, [selectedTemplate, visible])

  const loadTeams = async () => {
    try {
      const teamsData = await getMyTeams()
      setTeams(teamsData || [])
      if (teamsData && teamsData.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teamsData[0].id)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载团队列表失败', 'error')
    }
  }

  const loadTemplates = async (teamId: string) => {
    try {
      setLoadingTemplates(true)
      const [formTemplatesData, approvalTemplatesData] = await Promise.all([
        getFormTemplates(teamId),
        getApprovalTemplates(teamId)
      ])
      const enabledFormTemplates = (formTemplatesData || []).filter((t) => t.isEnabled)
      setTemplates(enabledFormTemplates)
      setApprovalTemplates(approvalTemplatesData || [])
      if (enabledFormTemplates.length > 0) {
        setSelectedTemplate(enabledFormTemplates[0])
      } else {
        setSelectedTemplate(null)
        setCurrentApprovalTemplate(null)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载模板列表失败', 'error')
    } finally {
      setLoadingTemplates(false)
    }
  }

  const loadApprovalTemplate = async (formTemplateId: string) => {
    try {
      const approvalTpl = await getApprovalTemplateByFormTemplate(formTemplateId)
      setCurrentApprovalTemplate(approvalTpl || null)
    } catch {
      setCurrentApprovalTemplate(null)
    }
  }

  const validateField = (field: FormField, value: unknown): string | null => {
    if (field.isRequired) {
      if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return `${field.label}不能为空`
      }
    }
    if (field.validation && value !== null && value !== undefined && value !== '') {
      const strValue = String(value)
      if (field.validation.minLength && strValue.length < field.validation.minLength) {
        return field.validation.customMessage || `${field.label}最少${field.validation.minLength}个字符`
      }
      if (field.validation.maxLength && strValue.length > field.validation.maxLength) {
        return field.validation.customMessage || `${field.label}最多${field.validation.maxLength}个字符`
      }
      if (field.validation.pattern && !new RegExp(field.validation.pattern).test(strValue)) {
        return field.validation.customMessage || `${field.label}格式不正确`
      }
      if (field.type === 'number') {
        const numValue = Number(value)
        if (field.validation.min !== undefined && numValue < field.validation.min) {
          return field.validation.customMessage || `${field.label}不能小于${field.validation.min}`
        }
        if (field.validation.max !== undefined && numValue > field.validation.max) {
          return field.validation.customMessage || `${field.label}不能大于${field.validation.max}`
        }
      }
    }
    return null
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) {
      newErrors.title = '请输入审批标题'
    }
    selectedTemplate?.fields?.forEach((field) => {
      if (!field.isHidden && !field.isDisabled) {
        const error = validateField(field, formData[field.fieldKey])
        if (error) {
          newErrors[field.fieldKey] = error
        }
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFieldChange = (fieldKey: string, value: unknown, field?: FormField) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }))
    if (errors[fieldKey] && field) {
      const error = validateField(field, value)
      if (!error) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[fieldKey]
          return next
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate || !selectedTeamId) return
    if (!validateForm()) return

    try {
      setSubmitting(true)
      let approvalTemplateId = currentApprovalTemplate?.id
      if (!approvalTemplateId) {
        const tpl = approvalTemplates.find((t) => t.formTemplateId === selectedTemplate.id)
        approvalTemplateId = tpl?.id
      }
      if (!approvalTemplateId) {
        showToast('该表单模板未配置审批流程', 'error')
        return
      }
      const instance = await createApprovalInstance({
        approvalTemplateId,
        formTemplateId: selectedTemplate.id,
        formData,
        title: title.trim(),
        teamId: selectedTeamId
      })
      if (instance) {
        showToast('审批已提交', 'success')
        onCreated?.(instance)
        handleClose()
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '提交失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setSelectedTemplate(null)
      setCurrentApprovalTemplate(null)
      setFormData({})
      setTitle('')
      setErrors({})
      onClose()
    }
  }

  const renderField = (field: FormField) => {
    if (field.isHidden) return null
    const value = formData[field.fieldKey]
    const error = errors[field.fieldKey]
    const baseInputClass = `w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all ${
      error ? 'ring-2 ring-red-500/30' : ''
    }`

    const renderSelectOptions = (options: FormFieldOption[] | null | undefined) => (
      options?.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))
    )

    return (
      <div key={field.id} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {field.label}
          {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
        </label>

        {field.type === 'text' && (
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value, field)}
            placeholder={field.placeholder || ''}
            disabled={field.isDisabled}
            className={baseInputClass}
            maxLength={field.validation?.maxLength}
          />
        )}

        {field.type === 'textarea' && (
          <textarea
            value={String(value ?? '')}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value, field)}
            placeholder={field.placeholder || ''}
            disabled={field.isDisabled}
            rows={4}
            className={`${baseInputClass} resize-none`}
            maxLength={field.validation?.maxLength}
          />
        )}

        {field.type === 'number' && (
          <input
            type="number"
            value={value === null || value === undefined ? '' : Number(value)}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value ? Number(e.target.value) : '', field)}
            placeholder={field.placeholder || ''}
            disabled={field.isDisabled}
            className={baseInputClass}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        )}

        {field.type === 'money' && (
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
            <input
              type="number"
              value={value === null || value === undefined ? '' : Number(value)}
              onChange={(e) => handleFieldChange(field.fieldKey, e.target.value ? Number(e.target.value) : '', field)}
              placeholder={field.placeholder || ''}
              disabled={field.isDisabled}
              className={`${baseInputClass} pl-8`}
              step="0.01"
            />
          </div>
        )}

        {field.type === 'date' && (
          <input
            type="date"
            value={String(value ?? '')}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value, field)}
            disabled={field.isDisabled}
            className={baseInputClass}
          />
        )}

        {field.type === 'time' && (
          <input
            type="time"
            value={String(value ?? '')}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value, field)}
            disabled={field.isDisabled}
            className={baseInputClass}
          />
        )}

        {field.type === 'select' && (
          <select
            value={String(value ?? '')}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value, field)}
            disabled={field.isDisabled}
            className={baseInputClass}
          >
            <option value="">请选择</option>
            {renderSelectOptions(field.options)}
          </select>
        )}

        {field.type === 'multiSelect' && (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((opt) => {
              const arrValue = Array.isArray(value) ? value : []
              const checked = arrValue.includes(opt.value)
              return (
                <label
                  key={opt.value}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                    checked
                      ? 'bg-[#3370FF]/10 text-[#3370FF] border border-[#3370FF]/30'
                      : 'bg-gray-50 text-gray-700 border border-transparent hover:bg-gray-100'
                  } ${field.isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const current = Array.isArray(value) ? [...value] : []
                      if (e.target.checked) {
                        current.push(opt.value)
                      } else {
                        const idx = current.indexOf(opt.value)
                        if (idx > -1) current.splice(idx, 1)
                      }
                      handleFieldChange(field.fieldKey, current, field)
                    }}
                    disabled={field.isDisabled}
                    className="w-4 h-4 text-[#3370FF] rounded"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              )
            })}
          </div>
        )}

        {field.helpText && !error && (
          <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    )
  }

  if (!visible) return null

  const sortedFields = [...(selectedTemplate?.fields || [])].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-[880px] h-[600px] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">发起审批</h3>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-[240px] bg-gray-50 border-r border-gray-100 flex flex-col flex-shrink-0 overflow-hidden">
              {teams.length > 1 && (
                <div className="p-4 border-b border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">所属团队</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-3">
                {loadingTemplates ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin w-5 h-5 border-2 border-[#3370FF] border-t-transparent rounded-full mb-2" />
                    <p className="text-xs text-gray-400">加载中...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-xs text-gray-400">暂无可用模板</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplate(tpl)}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${
                          selectedTemplate?.id === tpl.id
                            ? 'bg-white shadow-sm border border-[#3370FF]/20'
                            : 'hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                            selectedTemplate?.id === tpl.id ? 'bg-[#3370FF]/10' : 'bg-white'
                          }`}>
                            <span>{tpl.icon || '📋'}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium truncate ${
                              selectedTemplate?.id === tpl.id ? 'text-[#3370FF]' : 'text-gray-900'
                            }`}>
                              {tpl.name}
                            </p>
                            {tpl.description && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{tpl.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedTemplate ? (
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        审批标题 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value)
                          if (errors.title && e.target.value.trim()) {
                            setErrors((prev) => {
                              const next = { ...prev }
                              delete next.title
                              return next
                            })
                          }
                        }}
                        placeholder={`${currentUser?.nickname || '我'}的${selectedTemplate.name}`}
                        className={`w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all ${
                          errors.title ? 'ring-2 ring-red-500/30' : ''
                        }`}
                        maxLength={100}
                      />
                      {errors.title && (
                        <p className="mt-1 text-xs text-red-500">{errors.title}</p>
                      )}
                    </div>

                    {sortedFields.length > 0 ? (
                      sortedFields.map(renderField)
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-400">该模板暂无可填写字段</p>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>提交后将进入审批流程</span>
                    </div>
                    <div className="flex items-center space-x-3">
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
                        disabled={submitting}
                        className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        {submitting ? '提交中...' : '提交审批'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-medium text-gray-700 mb-1">请选择审批模板</h4>
                  <p className="text-sm text-gray-400">从左侧列表中选择一个审批模板开始</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default StartApprovalModal
