import { useState, useEffect, useCallback } from 'react'
import { getFormTemplates, getFormTemplate, getFormTemplateFields, deleteFormTemplate } from '../api/form-templates'
import { getApprovalTemplateByFormTemplate } from '../api/approval-templates'
import { getMyTeams } from '../api/teams'
import type { FormTemplate, FormField, ApprovalTemplate, Team } from '../types'
import useToast from '../hooks/useToast'
import Toast from '../components/common/Toast'
import dayjs from 'dayjs'

const fieldTypeLabels: Record<string, string> = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  date: '日期',
  time: '时间',
  select: '单选',
  multiSelect: '多选',
  member: '成员',
  department: '部门',
  attachment: '附件',
  money: '金额',
  detailTable: '明细表格'
}

function FormTemplatesPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)
  const [templateFields, setTemplateFields] = useState<FormField[]>([])
  const [approvalTemplate, setApprovalTemplate] = useState<ApprovalTemplate | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const loadTeams = useCallback(async () => {
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
  }, [selectedTeamId, showToast])

  const loadTemplates = useCallback(async (teamId: string) => {
    if (!teamId) return
    try {
      setLoadingTemplates(true)
      const data = await getFormTemplates(teamId)
      setTemplates(data || [])
      if (data && data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data[0].id)
      } else if (!data || data.length === 0) {
        setSelectedTemplateId(null)
        setSelectedTemplate(null)
        setTemplateFields([])
        setApprovalTemplate(null)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载表单模板列表失败', 'error')
    } finally {
      setLoadingTemplates(false)
    }
  }, [selectedTemplateId, showToast])

  const loadTemplateDetail = useCallback(async (templateId: string) => {
    if (!templateId) return
    try {
      setLoadingDetail(true)
      const [template, fields, approvalTpl] = await Promise.all([
        getFormTemplate(templateId),
        getFormTemplateFields(templateId),
        getApprovalTemplateByFormTemplate(templateId).catch(() => null)
      ])
      setSelectedTemplate(template || null)
      setTemplateFields(fields || [])
      setApprovalTemplate(approvalTpl || null)
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载模板详情失败', 'error')
    } finally {
      setLoadingDetail(false)
    }
  }, [showToast])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  useEffect(() => {
    if (selectedTeamId) {
      loadTemplates(selectedTeamId)
    }
  }, [selectedTeamId, loadTemplates])

  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateDetail(selectedTemplateId)
    }
  }, [selectedTemplateId, loadTemplateDetail])

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return
    if (!window.confirm('确定要删除该表单模板吗？删除后关联的审批流程也将受到影响。')) return

    try {
      setDeleting(true)
      await deleteFormTemplate(selectedTemplateId)
      showToast('删除成功', 'success')
      setSelectedTemplateId(null)
      setSelectedTemplate(null)
      setTemplateFields([])
      setApprovalTemplate(null)
      loadTemplates(selectedTeamId)
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '删除失败', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateTemplate = () => {
    showToast('表单设计器功能开发中', 'info')
  }

  const handleEditForm = () => {
    showToast('表单设计器功能开发中', 'info')
  }

  const handleEditWorkflow = () => {
    showToast('流程设计器功能开发中', 'info')
  }

  const sortedFields = [...templateFields].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f6f7]">
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">表单模板</h1>
              {teams.length > 1 && (
                <select
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value)
                    setSelectedTemplateId(null)
                  }}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              )}
            </div>
            <button
              onClick={handleCreateTemplate}
              className="px-4 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] text-white rounded-lg text-sm font-medium transition-all flex items-center"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建表单模板
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-[320px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3">
              {loadingTemplates ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin w-6 h-6 border-2 border-[#3370FF] border-t-transparent rounded-full mb-3" />
                  <p className="text-sm text-gray-500">加载中...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">暂无表单模板</h3>
                  <p className="text-xs text-gray-400">点击右上角创建第一个模板</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedTemplateId === tpl.id
                          ? 'bg-[#3370FF]/5 border-[#3370FF]/30'
                          : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                          selectedTemplateId === tpl.id ? 'bg-[#3370FF]/10' : 'bg-gray-50'
                        }`}>
                          <span>{tpl.icon || '📋'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium truncate ${
                              selectedTemplateId === tpl.id ? 'text-[#3370FF]' : 'text-gray-900'
                            }`}>
                              {tpl.name}
                            </p>
                            {!tpl.isEnabled && (
                              <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                                停用
                              </span>
                            )}
                          </div>
                          {tpl.description && (
                            <p className="text-xs text-gray-400 truncate mt-1">{tpl.description}</p>
                          )}
                          <div className="flex items-center mt-2 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <span>{tpl.fields?.length || 0} 个字段</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f6f7]">
            {loadingDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#3370FF] border-t-transparent rounded-full mb-4" />
                <p className="text-sm text-gray-500">加载中...</p>
              </div>
            ) : selectedTemplate ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#3370FF]/10 flex items-center justify-center text-2xl flex-shrink-0">
                        <span>{selectedTemplate.icon || '📋'}</span>
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">{selectedTemplate.name}</h2>
                        {selectedTemplate.description && (
                          <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-400">
                          <span>创建于 {dayjs(selectedTemplate.createdAt).format('YYYY-MM-DD')}</span>
                          <span>·</span>
                          <span>{sortedFields.length} 个字段</span>
                          {approvalTemplate && (
                            <>
                              <span>·</span>
                              <span className="text-green-600">已配置审批流程</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleEditForm}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        编辑表单
                      </button>
                      <button
                        onClick={handleEditWorkflow}
                        className="px-4 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] text-white rounded-lg text-sm font-medium transition-all flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        编辑流程
                      </button>
                      <button
                        onClick={handleDeleteTemplate}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-all flex items-center disabled:opacity-50"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {deleting ? '删除中...' : '删除'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">字段预览</h3>
                  {sortedFields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">暂无字段</p>
                      <p className="text-xs text-gray-400">点击"编辑表单"添加字段</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-500 mr-4 flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">{field.label}</p>
                            {field.isRequired && (
                              <span className="text-red-500 text-xs">*</span>
                            )}
                            {field.isHidden && (
                              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                                隐藏
                              </span>
                            )}
                            {field.isDisabled && (
                              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                                只读
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {fieldTypeLabels[field.type] || field.type}
                          </p>
                          {field.helpText && (
                            <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>
                          )}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-500">
                            {fieldTypeLabels[field.type] || field.type}
                          </span>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>

                {approvalTemplate && (
                  <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">审批流程</h3>
                    <div className="flex items-center p-4 bg-green-50 rounded-xl border border-green-100">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-4 flex-shrink-0">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{approvalTemplate.name}</p>
                        {approvalTemplate.description && (
                          <p className="text-xs text-gray-500 mt-1">{approvalTemplate.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {approvalTemplate.nodes?.length || 0} 个审批节点
                          {approvalTemplate.timeoutHours && ` · ${approvalTemplate.timeoutHours}小时超时`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-700 mb-1">选择一个表单模板</h3>
                <p className="text-sm text-gray-400">从左侧列表中选择模板查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default FormTemplatesPage
