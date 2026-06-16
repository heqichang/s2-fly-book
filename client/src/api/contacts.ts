import { request } from './client'
import type { Contact, FriendRequest } from '../types'

export function getContacts() {
  return request<Contact[]>({
    method: 'GET',
    url: '/contacts'
  })
}

export function sendRequest(toId: string) {
  return request<FriendRequest>({
    method: 'POST',
    url: '/contacts/requests',
    data: { toId }
  })
}

export function getReceivedRequests() {
  return request<FriendRequest[]>({
    method: 'GET',
    url: '/contacts/requests'
  })
}

export function getSentRequests() {
  return request<FriendRequest[]>({
    method: 'GET',
    url: '/contacts/requests/sent'
  })
}

export function acceptRequest(id: string) {
  return request<Contact>({
    method: 'PUT',
    url: `/contacts/requests/${id}/accept`
  })
}

export function rejectRequest(id: string) {
  return request<void>({
    method: 'PUT',
    url: `/contacts/requests/${id}/reject`
  })
}

export function deleteContact(contactId: string) {
  return request<void>({
    method: 'DELETE',
    url: `/contacts/${contactId}`
  })
}
