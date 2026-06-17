import { useState } from 'react'
import dayjs from 'dayjs'
import FileIcon, { isImageFile } from './FileIcon'
import Avatar from '../common/Avatar'
import ImageViewer from './ImageViewer'
import { formatFileSize } from '../../api/files'
import type { FileInfo } from '../../types'

interface FilePreviewProps {
  file: FileInfo
  visible: boolean
  onClose: () => void
}

function FilePreview({ file, visible, onClose }: FilePreviewProps) {
  const [imageViewerVisible, setImageViewerVisible] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  const isImage = isImageFile(file.originalName || file.name)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.originalName || file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleViewImage = () => {
    setImageViewerVisible(true)
  }

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleReset = () => {
    setScale(1)
    setRotation(0)
  }

  if (!visible) return null

  const images = isImage
    ? [{ url: file.url, name: file.originalName || file.name, thumbnail: file.thumbnail || undefined }]
    : []

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 truncate pr-4">
              {file.originalName || file.name}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              title="关闭"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {isImage ? (
              <div className="flex flex-col items-center">
                <div className="relative bg-gray-50 rounded-xl p-4 mb-4 w-full">
                  <img
                    src={file.url}
                    alt={file.originalName || file.name}
                    className="max-w-full max-h-[50vh] object-contain mx-auto rounded-lg shadow-sm transition-transform duration-200"
                    style={{
                      transform: `scale(${scale}) rotate(${rotation}deg)`,
                    }}
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    title="缩小"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-500 min-w-[50px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    title="放大"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={handleRotate}
                    className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    title="旋转"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    title="重置"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleViewImage}
                    className="p-2.5 rounded-lg bg-[#3370FF] hover:bg-[#2a5fd9] text-white transition-colors"
                    title="全屏查看"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <FileIcon filename={file.originalName || file.name} size="lg" className="mb-4" />
                <p className="text-sm text-gray-500 mt-2">该文件类型不支持在线预览</p>
                <p className="text-xs text-gray-400 mt-1">请下载后查看</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-20 flex-shrink-0">文件大小</span>
                <span className="text-sm text-gray-800">{formatFileSize(file.size)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-20 flex-shrink-0">上传时间</span>
                <span className="text-sm text-gray-800">
                  {dayjs(file.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </span>
              </div>
              {file.uploadedBy && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20 flex-shrink-0">上传者</span>
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={file.uploadedBy.avatar}
                      size="sm"
                      nickname={file.uploadedBy.nickname}
                    />
                    <span className="text-sm text-gray-800">{file.uploadedBy.nickname}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              关闭
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              下载文件
            </button>
          </div>
        </div>
      </div>

      <ImageViewer
        images={images}
        visible={imageViewerVisible}
        onClose={() => setImageViewerVisible(false)}
      />
    </>
  )
}

export default FilePreview
