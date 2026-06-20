import dayjs from 'dayjs'
import type { ApprovalInstance, ApprovalTask, ApprovalNotification } from '../../types'
import Avatar from '../common/Avatar'

export type ApprovalCardItem = ApprovalInstance | ApprovalTask | ApprovalNotification

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

const taskStatusLabels: Record<string, string> = {
  pending: '待处理',
  approved: '已同意',
  rejected: '已拒绝',
  transferred: '已转交',
  delegated: '已委托'
}

const taskStatusColors: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  transferred: 'bg-blue-100 text-blue-700',
  delegated: 'bg-purple-100 text-purple-700'
}

interface ApprovalListCardProps {
  item: ApprovalCardItem
  onClick: () => void
}

function ApprovalListCard({ item, onClick }: ApprovalListCardProps) {
  const isTask = 'approvalNodeId' in item
  const isNotification = 'notificationType' in item

  let instance: ApprovalInstance | undefined
  let task: ApprovalTask | undefined
  let notification: ApprovalNotification | undefined

  if (isTask) {
    task = item as ApprovalTask
    instance = task.approvalInstance
  } else if (isNotification) {
    notification = item as ApprovalNotification
    instance = notification.approvalInstance
    task = notification.approvalTask
  } else {
    instance = item as ApprovalInstance
  }

  if (!instance) return null

  const initiator = instance.initiator
  const isTaskItem = !!task
  const statusLabel = isTaskItem
    ? taskStatusLabels[task!.status] || task!.status
    : statusLabels[instance.status] || instance.status
  const statusColor = isTaskItem
    ? taskStatusColors[task!.status] || 'bg-gray-100 text-gray-700'
    : statusColors[instance.status] || 'bg-gray-100 text-gray-700'

  const currentNodeName = instance.currentNode?.nodeName || instance.formTemplate?.name
  const time = instance.startedAt || instance.createdAt

  const getSummary = (): string => {
    if (notification) {
      return notification.content
    }
    const formData = instance.formData
    if (!formData) return '暂无描述'
    const values = Object.values(formData)
      .filter((v) => v !== null && v !== undefined && v !== '')
      .slice(0, 2)
    if (values.length === 0) return '暂无描述'
    return values.map((v) => String(v)).join(' · ')
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-4 mb-3 cursor-pointer hover:shadow-md transition-all border border-gray-50 hover:border-[#3370FF]/20"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <Avatar
            src={initiator?.avatar || undefined}
            size="md"
            nickname={initiator?.nickname || 'U'}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm text-gray-900 truncate">{instance.title}</h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {initiator?.nickname || '未知用户'} 发起 · {dayjs(time).format('MM-DD HH:mm')}
            </p>
          </div>
        </div>
      </div>
      {currentNodeName && (
        <div className="ml-13 pl-[52px]">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs text-gray-400">当前节点：</span>
            <span className="text-xs text-gray-600">{currentNodeName}</span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2">{getSummary()}</p>
        </div>
      )}
    </div>
  )
}

export default ApprovalListCard
