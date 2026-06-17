import { request } from './client'
import type {
  Team,
  TeamMember,
  CreateTeamRequest,
  UpdateTeamRequest
} from '../types'

export function getMyTeams() {
  return request<Team[]>({
    method: 'GET',
    url: '/teams'
  })
}

export function createTeam(data: CreateTeamRequest) {
  return request<Team>({
    method: 'POST',
    url: '/teams',
    data
  })
}

export function getTeam(id: string) {
  return request<Team>({
    method: 'GET',
    url: `/teams/${id}`
  })
}

export function updateTeam(id: string, data: UpdateTeamRequest) {
  return request<Team>({
    method: 'PUT',
    url: `/teams/${id}`,
    data
  })
}

export function joinTeam(id: string) {
  return request<Team>({
    method: 'POST',
    url: `/teams/${id}/join`
  })
}

export function leaveTeam(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/teams/${id}/leave`
  })
}

export function getTeamMembers(id: string) {
  return request<TeamMember[]>({
    method: 'GET',
    url: `/teams/${id}/members`
  })
}

export function updateMemberRole(teamId: string, memberId: string, role: string) {
  return request<TeamMember>({
    method: 'PUT',
    url: `/teams/${teamId}/members/${memberId}/role`,
    data: { role }
  })
}

export function removeMember(teamId: string, memberId: string) {
  return request<void>({
    method: 'DELETE',
    url: `/teams/${teamId}/members/${memberId}`
  })
}

export function deleteTeam(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/teams/${id}`
  })
}

export function searchTeams(keyword: string) {
  return request<Array<{
    id: string
    name: string
    logo?: string | null
    description?: string | null
    ownerId: string
    owner?: { id: string; nickname: string; avatar?: string | null }
    memberCount: number
    hasJoined: boolean
    createdAt: string
  }>>({
    method: 'GET',
    url: '/teams/search/list',
    params: { keyword }
  })
}

export interface InviteMembersRequest {
  userIds: string[]
}

export interface InviteMembersResponse {
  message: string
  addedCount: number
  members?: TeamMember[]
}

export function inviteTeamMembers(id: string, data: InviteMembersRequest) {
  return request<InviteMembersResponse>({
    method: 'POST',
    url: `/teams/${id}/members/invite`,
    data
  })
}
