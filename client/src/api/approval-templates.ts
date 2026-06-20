import { request } from './client'
import type {
  ApprovalTemplate,
  ApprovalNode,
  CreateApprovalTemplateRequest,
  UpdateApprovalTemplateRequest
} from '../types'

export function getApprovalTemplates(teamId: string) {
  return request<ApprovalTemplate[]>({
    method: 'GET',
    url: '/approval-templates',
    params: { teamId }
  })
}

export function getApprovalTemplate(id: string) {
  return request<ApprovalTemplate>({
    method: 'GET',
    url: `/approval-templates/${id}`
  })
}

export function getApprovalTemplateByFormTemplate(formTemplateId: string) {
  return request<ApprovalTemplate>({
    method: 'GET',
    url: '/approval-templates',
    params: { formTemplateId }
  })
}

export function createApprovalTemplate(data: CreateApprovalTemplateRequest) {
  return request<ApprovalTemplate>({
    method: 'POST',
    url: '/approval-templates',
    data
  })
}

export function updateApprovalTemplate(id: string, data: UpdateApprovalTemplateRequest) {
  return request<ApprovalTemplate>({
    method: 'PUT',
    url: `/approval-templates/${id}`,
    data
  })
}

export function deleteApprovalTemplate(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/approval-templates/${id}`
  })
}

export function getApprovalTemplateNodes(id: string) {
  return request<ApprovalNode[]>({
    method: 'GET',
    url: `/approval-templates/${id}/nodes`
  })
}

export function updateApprovalTemplateNodes(
  id: string,
  nodes: Array<Omit<ApprovalNode, 'approvalTemplateId' | 'createdAt' | 'updatedAt' | 'childNodes'> & { id?: string; childNodes?: any[] }>
) {
  return request<ApprovalNode[]>({
    method: 'PUT',
    url: `/approval-templates/${id}/nodes`,
    data: { nodes }
  })
}
