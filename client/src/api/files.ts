import client, { request } from './client'
import type { FileInfo, UploadFileResponse } from '../types'

export function uploadFile(file: File, onProgress?: (progress: number) => void) {
  const formData = new FormData()
  formData.append('file', file)

  return client.request<{ data: UploadFileResponse }>({
    method: 'POST',
    url: '/files/upload',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    }
  }).then((res) => res.data.data as UploadFileResponse)
}

export function uploadMultipleFiles(files: File[], onProgress?: (progress: number) => void) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  return client.request<{ data: UploadFileResponse[] }>({
    method: 'POST',
    url: '/files/upload/multiple',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    }
  }).then((res) => res.data.data as UploadFileResponse[])
}

export function getFile(id: string) {
  return request<FileInfo>({
    method: 'GET',
    url: `/files/${id}`
  })
}

export function deleteFile(id: string) {
  return request<void>({
    method: 'DELETE',
    url: `/files/${id}`
  })
}

export function getFileIcon(filename: string) {
  return request<{ icon: string; filename: string }>({
    method: 'GET',
    url: `/files/icon/${filename}`
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
