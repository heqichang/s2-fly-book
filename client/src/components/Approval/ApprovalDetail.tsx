import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import {
  getApprovalInstance,
  approveTask,
  rejectTask,
  transferTask,
  addSignTask,
  urgeTask,
  withdrawApprovalInstance,
  getApprovalInstanceTasks,
  getApprovalInstanceActions,
  getApprovalInstanceComments,
  createApprovalComment
} from '../../api/approval-instances'
import type {
  ApprovalInstance,
  ApprovalTask,
  ApprovalAction,
  ApprovalComment,
  ApprovalNode,
  FormField
} from '../../types'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import { useAuthStore } from '../../store/auth'

interface ApprovalDetailProps {
  approvalInstanceId: string
  onBack: () => void
  onUpdated?: () => void
}

const statusLabels: Record<string, string> = {
  pending: '审批中',
  approved: '已通过',
  rejected: '已拒绝',
  withdrawn: '已撤回',
  processing: '审批中'
}

const statusColors: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-700',
  processing: 'bg-orange-100 text-orange-700'
}

const actionLabels: Record<string, string> = {
  approve: '同意',
  reject: '拒绝',
  transfer: '转交',
  addSign: '加签',
  withdraw: '撤回',
  urge: '催办',
  comment: '评论',
  submit: '提交'
}

const actionColors: Record<string, string> = {
  approve: 'text-green-600',
  reject: 'text-red-600',
  transfer: 'text-blue-600',
  addSign: 'text-purple-600',
  withdraw: 'text-gray-600',
  urge: 'text-orange-600',
  comment: 'text-gray-600',
  submit: 'text-blue-600'
}

type NodeStatus = 'completed' | 'active' | 'pending'

interface FlowNodeDisplay {
  id: string
  name: string
  type: string
  status: NodeStatus
  assignees?: Array<{ id: string; name: string; avatar?: string | null }>
  completedAt?: string
  comment?: string
}

function ApprovalDetail({ approvalInstanceId, onBack, onUpdated }: ApprovalDetailProps) {
  const [instance, setInstance] = useState<ApprovalInstance | null>(null)
  const [tasks, setTasks] = useState<ApprovalTask[]>([])
  const [actions, setActions] = useState<ApprovalAction[]>([])
  const [comments, setComments] = useState<ApprovalComment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showActionModal, setShowActionModal] = useState<{
    type: 'approve' | 'reject' | 'transfer' | 'addSign' | 'withdraw' | null
  }>({ type: null })
  const [actionComment, setActionComment] = useState('')
  const [transferTarget, setTransferTarget] = useState('')
  const [addSignTarget, setAddSignTarget] = useState('')
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const { user: currentUser } = useAuthStore()
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    loadData()
  }, [approvalInstanceId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [instanceData, tasksData, actionsData, commentsData] = await Promise.all([
        getApprovalInstance(approvalInstanceId),
        getApprovalInstanceTasks(approvalInstanceId),
        getApprovalInstanceActions(approvalInstanceId),
        getApprovalInstanceComments(approvalInstanceId)
      ])
      setInstance(instanceData || null)
      setTasks(tasksData || [])
      setActions(actionsData || [])
      setComments(commentsData || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载审批详情失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getMyPendingTasks = (): ApprovalTask[] => {
    return tasks.filter((t) => t.status === 'pending' && t.assigneeId === currentUser?.id)
  }

  const isInitiator = instance?.initiatorId === currentUser?.id
  const myPendingTasks = getMyPendingTasks()
  const hasPendingTask = myPendingTasks.length > 0
  const isProcessing = instance?.status === 'pending' || instance?.status === 'processing'

  const handleApprove = async () => {
    if (myPendingTasks.length === 0) return
    try {
      setActionLoading('approve')
      await approveTask(myPendingTasks[0].id, { comment: actionComment })
      showToast('已同意', 'success')
      setShowActionModal({ type: null })
      setActionComment('')
      loadData()
      onUpdated?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (myPendingTasks.length === 0) return
    if (!actionComment.trim()) {
      showToast('请填写拒绝理由', 'error')
      return
    }
    try {
      setActionLoading('reject')
      await rejectTask(myPendingTasks[0].id, { comment: actionComment })
      showToast('已拒绝', 'success')
      setShowActionModal({ type: null })
      setActionComment('')
      loadData()
      onUpdated?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleTransfer = async () => {
    if (myPendingTasks.length === 0) return
    if (!transferTarget.trim()) {
      showToast('请选择转交对象', 'error')
      return
    }
    try {
      setActionLoading('transfer')
      await transferTask(myPendingTasks[0].id, { targetUserId: transferTarget, comment: actionComment })
      showToast('已转交', 'success')
      setShowActionModal({ type: null })
      setActionComment('')
      setTransferTarget('')
      loadData()
      onUpdated?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddSign = async () => {
    if (myPendingTasks.length === 0) return
    if (!addSignTarget.trim()) {
      showToast('请选择加签对象', 'error')
      return
    }
    try {
      setActionLoading('addSign')
      await addSignTask(myPendingTasks[0].id, { targetUserId: addSignTarget, comment: actionComment })
      showToast('已加签', 'success')
      setShowActionModal({ type: null })
      setActionComment('')
      setAddSignTarget('')
      loadData()
      onUpdated?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUrge = async () => {
    if (myPendingTasks.length === 0) return
    try {
      setActionLoading('urge')
      await urgeTask(myPendingTasks[0].id)
      showToast('已催办', 'success')
      loadData()
      onUpdated?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleWithdraw = async () => {
    try {
      setActionLoading('withdraw')
      await withdrawApprovalInstance(approvalInstanceId)
      showToast('已撤回', 'success')
      setShowActionModal({ type: null })
      loadData()
      onUpdated?.()
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return
    try {
      setSubmittingComment(true)
      const comment = await createApprovalComment(approvalInstanceId, { content: newComment })
      if (comment) {
        setComments((prev) => [...prev, comment])
        setNewComment('')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '评论失败', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  const buildFlowNodes = (): FlowNodeDisplay[] => {
    if (!instance) return []
    const nodes: FlowNodeDisplay[] = []

    nodes.push({
      id: 'initiator',
      name: '发起',
      type: 'initiator',
      status: 'completed',
      assignees: instance.initiator
        ? [{ id: instance.initiator.id, name: instance.initiator.nickname, avatar: instance.initiator.avatar }]
        : [],
      completedAt: instance.startedAt || instance.createdAt
    })

    const completedTaskMap = new Map<string, ApprovalTask[]>()
    tasks.forEach((t) => {
      const nodeId = t.approvalNodeId
      if (!completedTaskMap.has(nodeId)) {
        completedTaskMap.set(nodeId, [])
      }
      completedTaskMap.get(nodeId)!.push(t)
    })

    const currentNodeId = instance.currentNodeId
    const templateNodes: ApprovalNode[] = []
    const collectNodes = (nodeList?: ApprovalNode[]) => {
      if (!nodeList) return
      nodeList.forEach((n) => {
        if (n.nodeType === 'approver' || n.nodeType === 'cc') {
          templateNodes.push(n)
        }
        if (n.childNodes) {
          collectNodes(n.childNodes)
        }
      })
    }
    collectNodes()

    if (templateNodes.length === 0) {
      tasks.forEach((t) => {
        const isCurrent = t.approvalNodeId === currentNodeId && t.status === 'pending'
        const isCompleted = t.status === 'approved' || t.status === 'rejected'
        nodes.push({
          id: t.approvalNodeId || t.id,
          name: '审批节点',
          type: 'approver',
          status: isCurrent ? 'active' : isCompleted ? 'completed' : 'pending',
          assignees: t.assignee
            ? [{ id: t.assignee.id, name: t.assignee.nickname, avatar: t.assignee.avatar }]
            : [],
          completedAt: t.actedAt || undefined,
          comment: t.comment || undefined
        })
      })
    } else {
      let reachedCurrent = false
      templateNodes.forEach((node) => {
        const nodeTasks = completedTaskMap.get(node.id) || []
        const hasCompleted = nodeTasks.some((t) => t.status === 'approved' || t.status === 'rejected')
        const isCurrent = node.id === currentNodeId || (!reachedCurrent && !hasCompleted)
        if (isCurrent) reachedCurrent = true

        let status: NodeStatus = 'pending'
        if (hasCompleted) status = 'completed'
        else if (isCurrent && nodeTasks.length > 0) status = 'active'

        const assignees = nodeTasks
          .map((t) => t.assignee)
          .filter(Boolean)
          .map((u) => ({ id: u!.id, name: u!.nickname, avatar: u!.avatar }))

        const completedTask = nodeTasks.find((t) => t.actedAt)

        nodes.push({
          id: node.id,
          name: node.nodeName,
          type: node.nodeType,
          status,
          assignees,
          completedAt: completedTask?.actedAt || undefined,
          comment: completedTask?.comment || undefined
        })
      })
    }

    if (instance.status === 'approved' || instance.status === 'rejected') {
      nodes.push({
        id: 'end',
        name: instance.status === 'approved' ? '已通过' : '已拒绝',
        type: instance.status === 'approved' ? 'approved' : 'rejected',
        status: 'completed',
        completedAt: instance.completedAt || undefined
      })
    }

    return nodes
  }

  const getNodeIcon = (type: string, status: NodeStatus) => {
    const baseClass = 'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0'
    if (status === 'completed') {
      if (type === 'rejected') {
        return <div className={`${baseClass} bg-red-500`}>✕</div>
      }
      if (type === 'approved') {
        return <div className={`${baseClass} bg-green-500`}>✓</div>
      }
      return <div className={`${baseClass} bg-green-500`}>✓</div>
    }
    if (status === 'active') {
      return <div className={`${baseClass} bg-[#3370FF] ring-4 ring-[#3370FF]/20`}>●</div>
    }
    return <div className={`${baseClass} bg-gray-300`}>○</div>
  }

  const renderFormField = (field: FormField, value: unknown) => {
    if (field.isHidden) return null
    const displayValue = (() => {
      if (value === null || value === undefined || value === '') return '-'
      if (field.type === 'date') return dayjs(String(value)).format('YYYY-MM-DD')
      if (field.type === 'time') return String(value)
      if (field.type === 'select') {
        const opt = field.options?.find((o) => o.value === value)
        return opt?.label || String(value)
      }
      if (field.type === 'multiSelect' && Array.isArray(value)) {
        return value
          .map((v) => field.options?.find((o) => o.value === v)?.label || v)
          .join(', ')
      }
      if (field.type === 'money') {
        return `¥${Number(value).toLocaleString()}`
      }
      return String(value)
    })()

    return (
      <div key={field.id} className="py-3 border-b border-gray-50 last:border-b-0">
        <div className="flex items-start">
          <span className="text-sm text-gray-500 w-32 flex-shrink-0">
            {field.label}
            {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </span>
          <span className="text-sm text-gray-900 flex-1 whitespace-pre-wrap">{displayValue}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f6f7]">
        <div className="animate-spin w-8 h-8 border-2 border-[#3370FF] border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-gray-500">加载中...</p>
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f6f7]">
        <p className="text-gray-500 text-sm">审批不存在</p>
      </div>
    )
  }

  const flowNodes = buildFlowNodes()
  const formFields = instance.formTemplate?.fields?.filter((f) => !f.isHidden) || []

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f6f7]">
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-semibold text-gray-900">{instance.title}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[instance.status] || 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[instance.status] || instance.status}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                  <span className="flex items-center">
                    <Avatar
                      src={instance.initiator?.avatar || undefined}
                      size="sm"
                      nickname={instance.initiator?.nickname || 'U'}
                      className="w-4 h-4 mr-1.5"
                    />
                    {instance.initiator?.nickname || '未知用户'}
                  </span>
                  <span>
                    发起于 {dayjs(instance.startedAt || instance.createdAt).format('YYYY-MM-DD HH:mm')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isProcessing && isInitiator && (
                <button
                  onClick={() => setShowActionModal({ type: 'withdraw' })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all flex items-center"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  撤回
                </button>
              )}
              {hasPendingTask && isProcessing && (
                <>
                  <button
                    onClick={() => setShowActionModal({ type: 'reject' })}
                    disabled={!!actionLoading}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-all flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    拒绝
                  </button>
                  <button
                    onClick={() => setShowActionModal({ type: 'approve' })}
                    disabled={!!actionLoading}
                    className="px-4 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    同意
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-white rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[#3370FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              审批流程
            </h3>
            <div className="relative">
              {flowNodes.map((node, index) => (
                <div key={node.id} className="flex items-start">
                  <div className="flex flex-col items-center">
                    {getNodeIcon(node.type, node.status)}
                    {index < flowNodes.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 my-1 ${
                          flowNodes[index + 1].status === 'pending' ? 'bg-gray-200' : 'bg-green-400'
                        }`}
                        style={{ height: '32px' }}
                      />
                    )}
                  </div>
                  <div className="ml-4 pb-6 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-sm font-medium ${
                        node.status === 'active' ? 'text-[#3370FF]' :
                        node.status === 'completed' ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {node.name}
                      </span>
                      {node.type === 'cc' && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">抄送</span>
                      )}
                    </div>
                    {node.assignees && node.assignees.length > 0 && (
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        {node.assignees.map((a) => (
                          <div key={a.id} className="flex items-center space-x-1.5">
                            <Avatar src={a.avatar || undefined} size="sm" nickname={a.name} />
                            <span className="text-xs text-gray-600">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {node.comment && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 mt-1 max-w-md">
                        {node.comment}
                      </div>
                    )}
                    {node.completedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {dayjs(node.completedAt).format('YYYY-MM-DD HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[#3370FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              表单内容
            </h3>
            {formFields.length > 0 ? (
              <div>
                {formFields.map((field) => renderFormField(field, instance.formData[field.fieldKey]))}
              </div>
            ) : (
              <div className="py-4">
                {Object.entries(instance.formData).map(([key, value]) => (
                  <div key={key} className="py-3 border-b border-gray-50 last:border-b-0">
                    <div className="flex items-start">
                      <span className="text-sm text-gray-500 w-32 flex-shrink-0">{key}</span>
                      <span className="text-sm text-gray-900 flex-1">
                        {value === null || value === undefined ? '-' : String(value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasPendingTask && isProcessing && (
            <div className="bg-white rounded-xl p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-[#3370FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                快捷操作
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowActionModal({ type: 'transfer' })}
                  disabled={!!actionLoading}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-all flex items-center"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  转交
                </button>
                <button
                  onClick={() => setShowActionModal({ type: 'addSign' })}
                  disabled={!!actionLoading}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-sm font-medium transition-all flex items-center"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  加签
                </button>
                {isInitiator && (
                  <button
                    onClick={handleUrge}
                    disabled={actionLoading === 'urge'}
                    className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-sm font-medium transition-all flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    催办
                  </button>
                )}
              </div>
            </div>
          )}

          {actions.length > 0 && (
            <div className="bg-white rounded-xl p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-[#3370FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                审批记录
              </h3>
              <div className="space-y-4">
                {actions.map((action) => (
                  <div key={action.id} className="flex items-start space-x-3">
                    <Avatar
                      src={action.actor?.avatar || undefined}
                      size="md"
                      nickname={action.actor?.nickname || 'U'}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {action.actor?.nickname || '未知用户'}
                        </span>
                        <span className={`text-sm font-medium ${actionColors[action.actionType] || 'text-gray-600'}`}>
                          {actionLabels[action.actionType] || action.actionType}
                        </span>
                        <span className="text-xs text-gray-400">
                          {dayjs(action.createdAt).format('YYYY-MM-DD HH:mm')}
                        </span>
                      </div>
                      {action.comment && (
                        <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                          {action.comment}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[#3370FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              评论 ({comments.length})
            </h3>
            <div className="space-y-4 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">暂无评论</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <Avatar
                      src={comment.commenter?.avatar || undefined}
                      size="md"
                      nickname={comment.commenter?.nickname || 'U'}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.commenter?.nickname || '未知用户'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-start space-x-3 pt-4 border-t border-gray-50">
              <Avatar
                src={currentUser?.avatar || undefined}
                size="md"
                nickname={currentUser?.nickname || 'U'}
              />
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="添加评论..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSubmitComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    {submittingComment ? '发送中...' : '发送'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showActionModal.type && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => !actionLoading && setShowActionModal({ type: null })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[440px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {showActionModal.type === 'approve' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">同意审批</h3>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    审批意见（可选）
                  </label>
                  <textarea
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="请输入审批意见..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all resize-none"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowActionModal({ type: null })}
                    disabled={actionLoading === 'approve'}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading === 'approve'}
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    {actionLoading === 'approve' ? '提交中...' : '确认同意'}
                  </button>
                </div>
              </>
            )}

            {showActionModal.type === 'reject' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">拒绝审批</h3>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    拒绝理由 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="请输入拒绝理由..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all resize-none"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowActionModal({ type: null })}
                    disabled={actionLoading === 'reject'}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading === 'reject' || !actionComment.trim()}
                    className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    {actionLoading === 'reject' ? '提交中...' : '确认拒绝'}
                  </button>
                </div>
              </>
            )}

            {showActionModal.type === 'transfer' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">转交审批</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    转交对象 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    placeholder="请输入用户ID"
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    说明（可选）
                  </label>
                  <textarea
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="请输入说明..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all resize-none"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowActionModal({ type: null })}
                    disabled={actionLoading === 'transfer'}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={actionLoading === 'transfer' || !transferTarget.trim()}
                    className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    {actionLoading === 'transfer' ? '提交中...' : '确认转交'}
                  </button>
                </div>
              </>
            )}

            {showActionModal.type === 'addSign' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">加签</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    加签对象 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addSignTarget}
                    onChange={(e) => setAddSignTarget(e.target.value)}
                    placeholder="请输入用户ID"
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    说明（可选）
                  </label>
                  <textarea
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    placeholder="请输入说明..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all resize-none"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowActionModal({ type: null })}
                    disabled={actionLoading === 'addSign'}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddSign}
                    disabled={actionLoading === 'addSign' || !addSignTarget.trim()}
                    className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    {actionLoading === 'addSign' ? '提交中...' : '确认加签'}
                  </button>
                </div>
              </>
            )}

            {showActionModal.type === 'withdraw' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">撤回审批</h3>
                <p className="text-sm text-gray-500 mb-6">
                  确定要撤回该审批吗？撤回后审批流程将终止。
                </p>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowActionModal({ type: null })}
                    disabled={actionLoading === 'withdraw'}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={actionLoading === 'withdraw'}
                    className="px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    {actionLoading === 'withdraw' ? '撤回中...' : '确认撤回'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default ApprovalDetail
