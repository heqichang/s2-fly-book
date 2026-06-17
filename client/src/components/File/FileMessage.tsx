import React, { useState } from 'react'
import FileIcon, { isImageFile } from './FileIcon'
import FilePreview from './FilePreview'
import ImageViewer from './ImageViewer'
import { formatFileSize } from '../../api/files'
import type { FileInfo } from '../../types'

interface FileMessageProps {
  file: FileInfo
  isMine?: boolean
  onPreview?: (file: FileInfo) => void
}

function FileMessage({ file, isMine = false, onPreview }: FileMessageProps) {
  const [previewVisible, setPreviewVisible] = useState(false)
  const [imageViewerVisible, setImageViewerVisible] = useState(false)

  const isImage = isImageFile(file.originalName || file.name)
  const fileName = file.originalName || file.name
  const fileSize = formatFileSize(file.size)

  const handleClick = () => {
    if (onPreview) {
      onPreview(file)
      return
    }
    if (isImage) {
      setImageViewerVisible(true)
    } else {
      setPreviewVisible(true)
    }
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = file.url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const images = isImage
    ? [{ url: file.url, name: fileName, thumbnail: file.thumbnail || undefined }]
    : []

  return (
    <>
      <div
        onClick={handleClick}
        className={`cursor-pointer transition-all hover:opacity-90 ${
          isMine
            ? 'bg-[#3370FF] text-white rounded-br-md'
            : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
        } px-4 py-3 rounded-2xl shadow-sm max-w-[280px]`}
      >
        {isImage ? (
          <div className="relative">
            <div className="rounded-lg overflow-hidden bg-gray-100 mb-2">
              <img
                src={file.thumbnail || file.url}
                alt={fileName}
                className="w-full h-auto max-h-[200px] object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isMine ? 'text-white' : 'text-gray-800'}`}>
                  {fileName}
                </p>
                <p className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                  {fileSize}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                  isMine
                    ? 'hover:bg-white/20 text-white/80 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
                title="下载"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <FileIcon filename={fileName} size="md" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isMine ? 'text-white' : 'text-gray-800'}`}>
                {fileName}
              </p>
              <p className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                {fileSize}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDownload}
                className={`p-2 rounded-lg transition-colors ${
                  isMine
                    ? 'hover:bg-white/20 text-white/80 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
                title="下载"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <FilePreview
        file={file}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
      />

      <ImageViewer
        images={images}
        visible={imageViewerVisible}
        onClose={() => setImageViewerVisible(false)}
      />
    </>
  )
}

export default FileMessage
