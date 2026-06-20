import { request } from './client'
import type {
  ApprovalInstance,
  ApprovalTask,
  ApprovalAction,
  ApprovalComment,
  CreateApprovalInstanceRequest,
  ApproveRequest,
  RejectRequest,
  TransferRequest,
  AddSignRequest,
  CreateApprovalCommentRequest,
  ApprovalInstanceListResponse,
  ApprovalTaskListResponse
} from '../types'

export function createApprovalInstance(data: CreateApprovalInstanceRequest) {
  return request<ApprovalInstance>({
    method: 'POST',
    url: '/approval-instances',
    data
  })
}

export function getApprovalInstance(id: string) {
  return request<ApprovalInstance>({
    method: 'GET',
    url: `/approval-instances/${id}`
  })
}

export function getMyApprovalInstances(params?: {
  status?: string
  page?: number
  pageSize?: number
}) {
  return request<ApprovalInstanceListResponse>({
    method: 'GET',
    url: '/approval-instances/mine',
    params
  })
}

export function getMyInitiatedInstances(params?: {
  status?: string
  page?: number
  pageSize?: number
}) {
  return request<ApprovalInstanceListResponse>({
    method: 'GET',
    url: '/approval-instances/initiated',
    params
  })
}

export function getCcInstances(params?: {
  page?: number
  pageSize?: number
}) {
  return request<ApprovalInstanceListResponse>({
    method: 'GET',
    url: '/approval-instances/cc',
    params
  })
}

export function getTeamApprovalInstances(teamId: string, params?: {
  status?: string
  page?: number
  pageSize?: number
}) {
  return request<ApprovalInstanceListResponse>({
    method: 'GET',
    url: '/approval-instances',
    params: { teamId, ...params }
  })
}

export function withdrawApprovalInstance(id: string) {
  return request<ApprovalInstance>({
    method: 'POST',
    url: `/approval-instances/${id}/withdraw`
  })
}

export function getApprovalTasks(params?: {
  status?: string
  page?: number
  pageSize?: number
}) {
  return request<ApprovalTaskListResponse>({
    method: 'GET',
    url: '/approval-tasks',
    params
  })
}

export function getApprovalTask(id: string) {
  return request<ApprovalTask>({
    method: 'GET',
    url: `/approval-tasks/${id}`
  })
}

export function getApprovalInstanceTasks(approvalInstanceId: string) {
  return request<ApprovalTask[]>({
    method: 'GET',
    url: `/approval-instances/${approvalInstanceId}/tasks`
  })
}

export function approveTask(taskId: string, data: ApproveRequest = {}) {
  return request<ApprovalAction>({
    method: 'POST',
    url: `/approval-tasks/${taskId}/approve`,
    data
  })
}

export function rejectTask(taskId: string, data: RejectRequest) {
  return request<ApprovalAction>({
    method: 'POST',
    url: `/approval-tasks/${taskId}/reject`,
    data
  })
}

export function transferTask(taskId: string, data: TransferRequest) {
  return request<ApprovalAction>({
    method: 'POST',
    url: `/approval-tasks/${taskId}/transfer`,
    data
  })
}

export function addSignTask(taskId: string, data: AddSignRequest) {
  return request<ApprovalAction>({
    method: 'POST',
    url: `/approval-tasks/${taskId}/add-sign`,
    data
  })
}

export function urgeTask(taskId: string) {
  return request<ApprovalAction>({
    method: 'POST',
    url: `/approval-tasks/${taskId}/urge`
  })
}

export function getApprovalInstanceActions(approvalInstanceId: string) {
  return request<ApprovalAction[]>({
    method: 'GET',
    url: `/approval-instances/${approvalInstanceId}/actions`
  })
}

export function getApprovalInstanceComments(approvalInstanceId: string) {
  return request<ApprovalComment[]>({
    method: 'GET',
    url: `/approval-instances/${approvalInstanceId}/comments`
  })
}

export function createApprovalComment(approvalInstanceId: string, data: CreateApprovalCommentRequest) {
  return request<ApprovalComment>({
    method: 'POST',
    url: `/approval-instances/${approvalInstanceId}/comments`,
    data
  })
}

export function markCcAsRead(ccId: string) {
  return request<void>({
    method: 'POST',
    url: `/approval-ccs/${ccId}/read`
  })
}
