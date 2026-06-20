import { useState } from 'react'
import type { ApprovalNode, ApprovalNodeType, FormField } from '../../types'

interface ApprovalNodeCardProps {
  node: ApprovalNode
  isSelected?: boolean
  isFirst?: boolean
  isLast?: boolean
  onSelect?: (node: ApprovalNode) => void
  onDelete?: (nodeId: string) => void
  onInsertAfter?: (nodeId: string) => void
  formFields?: FormField[]
}

const nodeTypeConfig: Record<ApprovalNodeType, { label: string; icon: string; bgColor: string; borderColor: string; textColor: string }> = {
  initiator: { label: '发起人', icon: '👤', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-600' },
  approver: { label: '审批人', icon: '✅', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-600' },
  cc: { label: '抄送人', icon: '📋', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', textColor: 'text-gray-600' },
  condition: { label: '条件分支', icon: '🔀', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-600' },
  countersign: { label: '会签', icon: '🤝', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-600' },
  orSign: { label: '或签', icon: '⚡', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-600' },
  autoApprove: { label: '自动通过', icon: '✔️', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-600' },
  autoReject: { label: '自动拒绝', icon: '❌', bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-600' }
}

const assigneeTypeLabels: Record<string, string> = {
  user: '指定人员',
  initiator: '发起人自选',
  initiatorLeader: '部门负责人',
  formField: '表单字段',
  department: '指定部门',
  role: '指定角色'
}

const signTypeLabels: Record<string, string> = {
  all: '会签（全部同意）',
  any: '或签（任一同意）',
  order: '顺签（依次审批）'
}

function ApprovalNodeCard({
  node,
  isSelected = false,
  isFirst = false,
  isLast = false,
  onSelect,
  onDelete,
  onInsertAfter,
  formFields = []
}: ApprovalNodeCardProps) {
  const [showActions, setShowActions] = useState(false)
  const config = nodeTypeConfig[node.nodeType]

  const getAssigneeDisplay = (): string => {
    if (node.nodeType === 'initiator') return '发起人'
    if (node.nodeType === 'autoApprove') return '系统自动通过'
    if (node.nodeType === 'autoReject') return '系统自动拒绝'
    if (node.nodeType === 'cc') {
      if (node.ccUserIds && node.ccUserIds.length > 0) {
        return `抄送 ${node.ccUserIds.length} 人`
      }
      return '未设置抄送人'
    }
    if (node.nodeType === 'condition') {
      return node.conditionExpression || '未设置条件'
    }
    if (node.assigneeType) {
      const typeLabel = assigneeTypeLabels[node.assigneeType] || node.assigneeType
      if (node.assigneeType === 'user') {
        if (node.assigneeIds && node.assigneeIds.length > 0) {
          return `${typeLabel}（${node.assigneeIds.length}人）`
        }
        return `${typeLabel}（未设置）`
      }
      if (node.assigneeType === 'formField') {
        if (node.assigneeFieldKey) {
          const field = formFields.find(f => f.fieldKey === node.assigneeFieldKey)
          return `${typeLabel}（${field?.label || node.assigneeFieldKey}）`
        }
        return `${typeLabel}（未设置）`
      }
      return typeLabel
    }
    if (node.signType) {
      return signTypeLabels[node.signType] || node.signType
    }
    return '未设置审批人'
  }

  return (
    <div className="relative flex flex-col items-center">
      {!isFirst && (
        <div className="w-0.5 h-6 border-l-2 border-dashed border-gray-300" />
      )}

      <div
        className="relative w-full"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div
          onClick={() => onSelect?.(node)}
          className={`w-full rounded-xl border-2 transition-all cursor-pointer ${config.bgColor} ${config.borderColor} ${
            isSelected ? 'ring-2 ring-[#3370FF] ring-offset-2 shadow-lg scale-[1.02]' : 'hover:shadow-md'
          }`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className={`text-sm font-semibold ${config.textColor}`}>{config.label}</span>
              </div>
              {showActions && node.nodeType !== 'initiator' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onInsertAfter?.(node.id)
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white hover:bg-gray-100 text-gray-500 hover:text-[#3370FF] transition-colors shadow-sm"
                    title="在下方插入节点"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(node.id)
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors shadow-sm"
                    title="删除节点"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="text-base font-medium text-gray-900 mb-1">
              {node.nodeName || config.label}
            </div>
            <div className="text-sm text-gray-500">
              {getAssigneeDisplay()}
            </div>
          </div>
        </div>
      </div>

      {!isLast && (
        <div className="w-0.5 h-6 border-l-2 border-dashed border-gray-300" />
      )}
    </div>
  )
}

export default ApprovalNodeCard
