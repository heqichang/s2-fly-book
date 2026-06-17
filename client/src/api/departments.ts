import { request } from './client'
import type {
  Department,
  DepartmentMember,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  AddDepartmentMemberRequest,
  UpdateDepartmentMemberRequest
} from '../types'

export function getDepartments(teamId: string) {
  return request<Department[]>({
    method: 'GET',
    url: `/departments/team/${teamId}`
  })
}

export function getDepartmentTree(id: string) {
  return request<Department>({
    method: 'GET',
    url: `/departments/${id}/tree`
  })
}

export function getDepartment(id: string) {
  return request<Department>({
    method: 'GET',
    url: `/departments/${id}`
  })
}

export function createDepartment(teamId: string, data: CreateDepartmentRequest) {
  return request<Department>({
    method: 'POST',
    url: `/departments/team/${teamId}`,
    data
  })
}

export function updateDepartment(id: string, data: UpdateDepartmentRequest) {
  return request<Department>({
    method: 'PUT',
    url: `/departments/${id}`,
    data
  })
}

export function deleteDepartment(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/departments/${id}`
  })
}

export function getDepartmentMembers(id: string) {
  return request<DepartmentMember[]>({
    method: 'GET',
    url: `/departments/${id}/members`
  })
}

export function addDepartmentMember(id: string, data: AddDepartmentMemberRequest) {
  return request<DepartmentMember>({
    method: 'POST',
    url: `/departments/${id}/members`,
    data
  })
}

export function updateDepartmentMember(
  departmentId: string,
  memberId: string,
  data: UpdateDepartmentMemberRequest
) {
  return request<DepartmentMember>({
    method: 'PUT',
    url: `/departments/${departmentId}/members/${memberId}`,
    data
  })
}

export function removeDepartmentMember(departmentId: string, memberId: string) {
  return request<void>({
    method: 'DELETE',
    url: `/departments/${departmentId}/members/${memberId}`
  })
}

export function getDepartmentContacts(teamId: string) {
  return request<Department[]>({
    method: 'GET',
    url: `/departments/team/${teamId}/contacts`
  })
}
