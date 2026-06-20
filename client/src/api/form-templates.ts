import { request } from './client'
import type {
  FormTemplate,
  FormField,
  FormRecord,
  CreateFormTemplateRequest,
  UpdateFormTemplateRequest
} from '../types'

export function getFormTemplates(teamId: string) {
  return request<FormTemplate[]>({
    method: 'GET',
    url: '/form-templates',
    params: { teamId }
  })
}

export function getFormTemplate(id: string) {
  return request<FormTemplate>({
    method: 'GET',
    url: `/form-templates/${id}`
  })
}

export function createFormTemplate(data: CreateFormTemplateRequest) {
  return request<FormTemplate>({
    method: 'POST',
    url: '/form-templates',
    data
  })
}

export function updateFormTemplate(id: string, data: UpdateFormTemplateRequest) {
  return request<FormTemplate>({
    method: 'PUT',
    url: `/form-templates/${id}`,
    data
  })
}

export function deleteFormTemplate(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/form-templates/${id}`
  })
}

export function getFormTemplateFields(id: string) {
  return request<FormField[]>({
    method: 'GET',
    url: `/form-templates/${id}/fields`
  })
}

export function updateFormTemplateFields(id: string, fields: Array<Omit<FormField, 'id' | 'formTemplateId' | 'createdAt' | 'updatedAt'> & { id?: string }>) {
  return request<FormField[]>({
    method: 'PUT',
    url: `/form-templates/${id}/fields`,
    data: { fields }
  })
}

export function getFormRecords(formTemplateId: string, params?: { page?: number; pageSize?: number }) {
  return request<{
    items: FormRecord[]
    total: number
    page: number
    pageSize: number
  }>({
    method: 'GET',
    url: `/form-templates/${formTemplateId}/records`,
    params
  })
}

export function getFormRecord(id: string) {
  return request<FormRecord>({
    method: 'GET',
    url: `/form-records/${id}`
  })
}

export function createFormRecord(formTemplateId: string, data: { formData: Record<string, unknown> }) {
  return request<FormRecord>({
    method: 'POST',
    url: `/form-templates/${formTemplateId}/records`,
    data
  })
}

export function deleteFormRecord(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/form-records/${id}`
  })
}
