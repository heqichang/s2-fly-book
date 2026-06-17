import { useState, useCallback, useRef } from 'react'
import { uploadFile, formatFileSize } from '../api/files'
import type { UploadFileResponse } from '../types'

export interface UploadFileItem {
  id: string
  file: File
  name: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error' | 'cancelled'
  error?: string
  response?: UploadFileResponse
}

interface UseFileUploadOptions {
  maxSize?: number
  maxFiles?: number
  allowedTypes?: string[]
  onSuccess?: (files: UploadFileResponse[]) => void
  onError?: (error: string) => void
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { maxSize = DEFAULT_MAX_SIZE, maxFiles = 10, allowedTypes, onSuccess, onError } = options

  const [files, setFiles] = useState<UploadFileItem[]>([])
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `文件 ${file.name} 超过大小限制 (最大 ${formatFileSize(maxSize)})`
      }
      if (allowedTypes && allowedTypes.length > 0) {
        const fileType = file.type || ''
        const fileName = file.name.toLowerCase()
        const isValid = allowedTypes.some((type) => {
          if (type.startsWith('.')) {
            return fileName.endsWith(type.toLowerCase())
          }
          return fileType.startsWith(type) || fileType === type
        })
        if (!isValid) {
          return `文件 ${file.name} 类型不支持`
        }
      }
      return null
    },
    [maxSize, allowedTypes]
  )

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)

      if (files.length + fileArray.length > maxFiles) {
        onError?.(`最多只能上传 ${maxFiles} 个文件`)
        return
      }

      const items: UploadFileItem[] = []
      const validFiles: File[] = []

      for (const file of fileArray) {
        const error = validateFile(file)
        items.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          progress: 0,
          status: error ? 'error' : 'pending',
          error: error || undefined,
        })
        if (!error) {
          validFiles.push(file)
        }
      }

      setFiles((prev) => [...prev, ...items])
      return items
    },
    [files.length, maxFiles, validateFile, onError]
  )

  const uploadSingleFile = useCallback(
    async (item: UploadFileItem): Promise<UploadFileResponse | null> => {
      const abortController = new AbortController()
      abortControllersRef.current.set(item.id, abortController)

      try {
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f))
        )

        const response = await uploadFile(item.file, (progress) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress } : f))
          )
        })

        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'success', response, progress: 100 } : f))
        )

        abortControllersRef.current.delete(item.id)
        return response
      } catch (err: unknown) {
        const error = err as { message?: string; code?: string }
        if (error.code === 'ERR_CANCELED') {
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: 'cancelled' } : f))
          )
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, status: 'error', error: error.message || '上传失败' } : f
            )
          )
        }
        abortControllersRef.current.delete(item.id)
        return null
      }
    },
    []
  )

  const uploadAll = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error')
    const results: UploadFileResponse[] = []

    for (const item of pendingFiles) {
      const response = await uploadSingleFile(item)
      if (response) {
        results.push(response)
      }
    }

    if (results.length > 0) {
      onSuccess?.(results)
    }

    const hasErrors = files.some((f) => f.status === 'error')
    if (hasErrors) {
      onError?.('部分文件上传失败')
    }

    return results
  }, [files, uploadSingleFile, onSuccess, onError])

  const uploadFiles = useCallback(
    async (newFiles?: FileList | File[]) => {
      if (newFiles) {
        addFiles(newFiles)
      }
      return uploadAll()
    },
    [addFiles, uploadAll]
  )

  const cancelUpload = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id)
    if (controller) {
      controller.abort()
      abortControllersRef.current.delete(id)
    }
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'cancelled' } : f))
    )
  }, [])

  const removeFile = useCallback((id: string) => {
    cancelUpload(id)
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [cancelUpload])

  const clearFiles = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort())
    abortControllersRef.current.clear()
    setFiles([])
  }, [])

  const retryUpload = useCallback(
    async (id: string) => {
      const item = files.find((f) => f.id === id)
      if (item && (item.status === 'error' || item.status === 'cancelled')) {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'pending', progress: 0, error: undefined } : f))
        )
        return uploadSingleFile({ ...item, status: 'pending', progress: 0, error: undefined })
      }
      return null
    },
    [files, uploadSingleFile]
  )

  const getSuccessFiles = useCallback(() => {
    return files.filter((f) => f.status === 'success' && f.response).map((f) => f.response!)
  }, [files])

  return {
    files,
    addFiles,
    uploadFiles,
    uploadSingleFile,
    cancelUpload,
    removeFile,
    clearFiles,
    retryUpload,
    getSuccessFiles,
    isUploading: files.some((f) => f.status === 'uploading'),
    hasFiles: files.length > 0,
  }
}

export default useFileUpload
