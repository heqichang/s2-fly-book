import React, { useRef, useState, useCallback } from 'react'
import FileIcon from './FileIcon'
import useFileUpload, { UploadFileItem } from '../../hooks/useFileUpload'
import { formatFileSize } from '../../api/files'
import type { UploadFileResponse } from '../../types'

interface FileUploadProps {
  maxSize?: number
  maxFiles?: number
  allowedTypes?: string[]
  autoUpload?: boolean
  multiple?: boolean
  onUploadComplete?: (files: UploadFileResponse[]) => void
  onUploadError?: (error: string) => void
  className?: string
}

function FileUpload({
  maxSize,
  maxFiles,
  allowedTypes,
  autoUpload = true,
  multiple = true,
  onUploadComplete,
  onUploadError,
  className = '',
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const { files, addFiles, uploadFiles, cancelUpload, removeFile, retryUpload, isUploading, hasFiles } = useFileUpload({
    maxSize,
    maxFiles,
    allowedTypes,
    onSuccess: onUploadComplete,
    onError: onUploadError,
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles && droppedFiles.length > 0) {
        const items = addFiles(droppedFiles)
        if (autoUpload && items) {
          uploadFiles()
        }
      }
    },
    [addFiles, uploadFiles, autoUpload]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        const items = addFiles(selectedFiles)
        if (autoUpload && items) {
          uploadFiles()
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [addFiles, uploadFiles, autoUpload]
  )

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleUpload = () => {
    uploadFiles()
  }

  const getStatusIcon = (status: UploadFileItem['status']) => {
    switch (status) {
      case 'uploading':
        return (
          <svg className="w-4 h-4 text-[#3370FF] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )
      case 'success':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        )
      case 'cancelled':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        )
      default:
        return null
    }
  }

  const renderFileItem = (item: UploadFileItem) => (
    <div
      key={item.id}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm"
    >
      <FileIcon filename={item.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {getStatusIcon(item.status)}
            {item.status === 'uploading' && (
              <button
                onClick={() => cancelUpload(item.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="取消上传"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {(item.status === 'error' || item.status === 'cancelled') && (
              <button
                onClick={() => retryUpload(item.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#3370FF] hover:bg-blue-50 transition-colors"
                title="重新上传"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
            {item.status !== 'uploading' && (
              <button
                onClick={() => removeFile(item.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="移除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{formatFileSize(item.size)}</span>
          {item.status === 'uploading' && (
            <span className="text-xs text-[#3370FF]">{item.progress}%</span>
          )}
          {item.status === 'error' && item.error && (
            <span className="text-xs text-red-500">{item.error}</span>
          )}
        </div>
        {item.status === 'uploading' && (
          <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3370FF] rounded-full transition-all duration-200"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`${className}`}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-[#3370FF] bg-blue-50'
            : 'border-gray-200 hover:border-[#3370FF]/50 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          accept={allowedTypes?.join(',')}
        />
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            {isDragOver ? '释放文件以上传' : '拖拽文件到此处或点击上传'}
          </p>
          <p className="text-xs text-gray-400">
            支持多文件上传，单个文件最大 {formatFileSize(maxSize || 50 * 1024 * 1024)}
          </p>
        </div>
      </div>

      {hasFiles && (
        <div className="mt-4 space-y-2">
          {files.map(renderFileItem)}
        </div>
      )}

      {!autoUpload && hasFiles && (
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            添加文件
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="px-5 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            {isUploading ? '上传中...' : '开始上传'}
          </button>
        </div>
      )}
    </div>
  )
}

export default FileUpload
