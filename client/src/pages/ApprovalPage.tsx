import { useState, useEffect, useCallback } from 'react'
import {
  getApprovalTasks,
  getMyInitiatedInstances,
  getMyApprovalInstances,
  getCcInstances
} from '../api/approval-instances'
import {
  getApprovalNotifications,
  markApprovalNotificationAsRead,
  markAllApprovalNotificationsAsRead,
  getUnreadApprovalNotificationCount
} from '../api/approval-notifications'
import type {
  ApprovalInstance,
  ApprovalTask,
  ApprovalNotification
} from '../types'
import ApprovalListCard, { type ApprovalCardItem } from '../components/Approval/ApprovalListCard'
import ApprovalDetail from '../components/Approval/ApprovalDetail'
import StartApprovalModal from '../components/Approval/StartApprovalModal'
import useToast from '../hooks/useToast'
import Toast from '../components/common/Toast'
import dayjs from 'dayjs'

type TabType = 'pending' | 'submitted' | 'approved' | 'cc' | 'notifications'

const tabConfig: Array<{
  key: TabType
  label: string
  icon: JSX.Element
}> = [
  {
    key: 'pending',
    label: '待我审批',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )
  },
  {
    key: 'submitted',
    label: '我发起的',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    )
  },
  {
    key: 'approved',
    label: '我已审批',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    key: 'cc',
    label: '抄送我的',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    key: 'notifications',
    label: '通知中心',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )
  }
]

function ApprovalPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showStartModal, setShowStartModal] = useState(false)
  const [pendingTasks, setPendingTasks] = useState<ApprovalTask[]>([])
  const [submittedInstances, setSubmittedInstances] = useState<ApprovalInstance[]>([])
  const [approvedInstances, setApprovedInstances] = useState<ApprovalInstance[]>([])
  const [ccInstances, setCcInstances] = useState<ApprovalInstance[]>([])
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState<Record<TabType, boolean>>({
    pending: false,
    submitted: false,
    approved: false,
    cc: false,
    notifications: false
  })
  const { toast, showToast, hideToast } = useToast()

  const loadPendingTasks = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, pending: true }))
      const response = await getApprovalTasks({ status: 'pending', pageSize: 50 })
      setPendingTasks(response?.items || [])
      setPendingCount(response?.total || 0)
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载待审批列表失败', 'error')
    } finally {
      setLoading((prev) => ({ ...prev, pending: false }))
    }
  }, [showToast])

  const loadSubmittedInstances = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, submitted: true }))
      const response = await getMyInitiatedInstances({ pageSize: 50 })
      setSubmittedInstances(response?.items || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载我发起的列表失败', 'error')
    } finally {
      setLoading((prev) => ({ ...prev, submitted: false }))
    }
  }, [showToast])

  const loadApprovedInstances = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, approved: true }))
      const response = await getMyApprovalInstances({ pageSize: 50 })
      setApprovedInstances(response?.items || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载已审批列表失败', 'error')
    } finally {
      setLoading((prev) => ({ ...prev, approved: false }))
    }
  }, [showToast])

  const loadCcInstances = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, cc: true }))
      const response = await getCcInstances({ pageSize: 50 })
      setCcInstances(response?.items || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载抄送列表失败', 'error')
    } finally {
      setLoading((prev) => ({ ...prev, cc: false }))
    }
  }, [showToast])

  const loadNotifications = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, notifications: true }))
      const response = await getApprovalNotifications({ pageSize: 50 })
      setNotifications(response?.items || [])
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '加载通知列表失败', 'error')
    } finally {
      setLoading((prev) => ({ ...prev, notifications: false }))
    }
  }, [showToast])

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await getUnreadApprovalNotificationCount()
      setUnreadNotificationCount(response?.count || 0)
    } catch {
      // ignore
    }
  }, [])

  const refreshAll = useCallback(() => {
    loadPendingTasks()
    loadSubmittedInstances()
    loadApprovedInstances()
    loadCcInstances()
    loadNotifications()
    loadUnreadCount()
  }, [loadPendingTasks, loadSubmittedInstances, loadApprovedInstances, loadCcInstances, loadNotifications, loadUnreadCount])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    switch (activeTab) {
      case 'pending':
        if (pendingTasks.length === 0) loadPendingTasks()
        break
      case 'submitted':
        if (submittedInstances.length === 0) loadSubmittedInstances()
        break
      case 'approved':
        if (approvedInstances.length === 0) loadApprovedInstances()
        break
      case 'cc':
        if (ccInstances.length === 0) loadCcInstances()
        break
      case 'notifications':
        if (notifications.length === 0) loadNotifications()
        break
    }
  }, [activeTab])

  const handleCardClick = (item: ApprovalCardItem) => {
    let id: string | undefined
    if ('approvalNodeId' in item) {
      id = (item as ApprovalTask).approvalInstanceId
    } else if ('notificationType' in item) {
      id = (item as ApprovalNotification).approvalInstanceId
      if ((item as ApprovalNotification).id && !(item as ApprovalNotification).isRead) {
        markApprovalNotificationAsRead((item as ApprovalNotification).id).then(() => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === (item as ApprovalNotification).id ? { ...n, isRead: true } : n))
          )
          loadUnreadCount()
        })
      }
    } else {
      id = (item as ApprovalInstance).id
    }
    if (id) {
      setSelectedId(id)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllApprovalNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadNotificationCount(0)
      showToast('已全部标记为已读', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '操作失败', 'error')
    }
  }

  const handleApprovalCreated = () => {
    refreshAll()
    setActiveTab('submitted')
  }

  const getCurrentList = (): ApprovalCardItem[] => {
    switch (activeTab) {
      case 'pending':
        return pendingTasks
      case 'submitted':
        return submittedInstances
      case 'approved':
        return approvedInstances
      case 'cc':
        return ccInstances
      case 'notifications':
        return notifications
      default:
        return []
    }
  }

  const isLoading = loading[activeTab]
  const listItems = getCurrentList()

  const renderNotificationItem = (notification: ApprovalNotification) => {
    const instance = notification.approvalInstance
    if (!instance) return null

    return (
      <div
        key={notification.id}
        onClick={() => handleCardClick(notification)}
        className={`bg-white rounded-xl p-4 mb-3 cursor-pointer hover:shadow-md transition-all border ${
          notification.isRead ? 'border-gray-50 hover:border-[#3370FF]/20' : 'border-[#3370FF]/20 bg-[#3370FF]/[0.02]'
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            notification.isRead ? 'bg-gray-100' : 'bg-[#3370FF]/10'
          }`}>
            <svg className={`w-5 h-5 ${notification.isRead ? 'text-gray-400' : 'text-[#3370FF]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className={`font-medium text-sm truncate ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                {notification.title}
              </h4>
              {!notification.isRead && (
                <span className="w-2 h-2 bg-[#3370FF] rounded-full flex-shrink-0 ml-2" />
              )}
            </div>
            <p className="text-sm text-gray-500 line-clamp-2 mb-1">{notification.content}</p>
            <p className="text-xs text-gray-400">
              {dayjs(notification.createdAt).format('YYYY-MM-DD HH:mm')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (selectedId) {
    return (
      <ApprovalDetail
        approvalInstanceId={selectedId}
        onBack={() => setSelectedId(null)}
        onUpdated={refreshAll}
      />
    )
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f6f7]">
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">审批中心</h1>
            <button
              onClick={() => setShowStartModal(true)}
              className="px-4 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] text-white rounded-lg text-sm font-medium transition-all flex items-center"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              发起审批
            </button>
          </div>
        </div>

        <div className="bg-white border-b border-gray-100 px-6">
          <div className="flex items-center space-x-1">
            {tabConfig.map((tab) => {
              const isActive = activeTab === tab.key
              let badgeCount = 0
              if (tab.key === 'pending') badgeCount = pendingCount
              if (tab.key === 'notifications') badgeCount = unreadNotificationCount

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-4 py-3 text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActive
                      ? 'text-[#3370FF] border-b-2 border-[#3370FF]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {badgeCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      isActive ? 'bg-[#3370FF] text-white' : 'bg-red-500 text-white'
                    }`}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </button>
              )
            })}
            {activeTab === 'notifications' && unreadNotificationCount > 0 && (
              <div className="ml-auto">
                <button
                  onClick={handleMarkAllRead}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-[#3370FF] hover:bg-[#3370FF]/5 rounded-lg transition-all"
                >
                  全部已读
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-[#3370FF] border-t-transparent rounded-full mb-4" />
              <p className="text-sm text-gray-500">加载中...</p>
            </div>
          ) : listItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-gray-700 mb-1">
                {activeTab === 'pending' && '暂无待审批'}
                {activeTab === 'submitted' && '暂无发起的审批'}
                {activeTab === 'approved' && '暂无已审批'}
                {activeTab === 'cc' && '暂无抄送'}
                {activeTab === 'notifications' && '暂无通知'}
              </h3>
              <p className="text-sm text-gray-400">
                {activeTab === 'pending' && '有新的审批时会显示在这里'}
                {activeTab === 'submitted' && '点击右上角发起审批'}
                {activeTab === 'approved' && '处理过的审批会显示在这里'}
                {activeTab === 'cc' && '抄送给您的审批会显示在这里'}
                {activeTab === 'notifications' && '审批相关通知会显示在这里'}
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {activeTab === 'notifications' ? (
                notifications.map((n) => renderNotificationItem(n))
              ) : (
                listItems.map((item) => {
                  const key = 'approvalNodeId' in item
                    ? (item as ApprovalTask).id
                    : (item as ApprovalInstance).id
                  return (
                    <ApprovalListCard
                      key={key}
                      item={item}
                      onClick={() => handleCardClick(item)}
                    />
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      <StartApprovalModal
        visible={showStartModal}
        onClose={() => setShowStartModal(false)}
        onCreated={handleApprovalCreated}
      />
    </>
  )
}

export default ApprovalPage
