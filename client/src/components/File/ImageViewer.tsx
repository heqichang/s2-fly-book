import React, { useState, useEffect, useCallback, useRef } from 'react'

interface ImageItem {
  url: string
  name?: string
  thumbnail?: string
}

interface ImageViewerProps {
  images: ImageItem[]
  initialIndex?: number
  visible: boolean
  onClose: () => void
}

const MIN_SCALE = 0.1
const MAX_SCALE = 5
const SCALE_STEP = 0.1

function ImageViewer({ images, initialIndex = 0, visible, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex)
      setScale(1)
      setRotation(0)
      setIsLoading(true)
    }
  }, [visible, initialIndex])

  useEffect(() => {
    setScale(1)
    setRotation(0)
    setIsLoading(true)
  }, [currentIndex])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (currentIndex < images.length - 1) {
            setCurrentIndex((prev) => prev + 1)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          setScale((prev) => Math.min(prev + SCALE_STEP, MAX_SCALE))
          break
        case 'ArrowDown':
          e.preventDefault()
          setScale((prev) => Math.max(prev - SCALE_STEP, MIN_SCALE))
          break
        case 'r':
        case 'R':
          e.preventDefault()
          setRotation((prev) => (prev + 90) % 360)
          break
      }
    },
    [visible, currentIndex, images.length, onClose]
  )

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [visible, handleKeyDown])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
      setScale((prev) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta)))
    },
    []
  )

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + SCALE_STEP * 2, MAX_SCALE))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - SCALE_STEP * 2, MIN_SCALE))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleReset = () => {
    setScale(1)
    setRotation(0)
  }

  const handleDownload = () => {
    const currentImage = images[currentIndex]
    if (currentImage) {
      const link = document.createElement('a')
      link.href = currentImage.url
      link.download = currentImage.name || `image-${currentIndex + 1}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  if (!visible || images.length === 0) return null

  const currentImage = images[currentIndex]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        title="关闭 (ESC)"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm">
        {currentIndex + 1} / {images.length}
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
            title="上一张 (←)"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === images.length - 1}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
            title="下一张 (→)"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div
        className="relative w-full h-full flex items-center justify-center"
        onWheel={handleWheel}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
        <img
          ref={imageRef}
          src={currentImage.url}
          alt={currentImage.name || `图片 ${currentIndex + 1}`}
          className="max-w-[90vw] max-h-[80vh] object-contain select-none transition-opacity duration-200"
          style={{
            opacity: isLoading ? 0 : 1,
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          draggable={false}
          onLoad={handleImageLoad}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-full bg-white/10 backdrop-blur-sm">
        <button
          onClick={handleZoomOut}
          className="p-2.5 rounded-full hover:bg-white/20 text-white transition-colors"
          title="缩小 (↓)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-white text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={handleZoomIn}
          className="p-2.5 rounded-full hover:bg-white/20 text-white transition-colors"
          title="放大 (↑)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button
          onClick={handleRotate}
          className="p-2.5 rounded-full hover:bg-white/20 text-white transition-colors"
          title="旋转 (R)"
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
          className="p-2.5 rounded-full hover:bg-white/20 text-white transition-colors"
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
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button
          onClick={handleDownload}
          className="p-2.5 rounded-full hover:bg-white/20 text-white transition-colors"
          title="下载原图"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  )
}

export default ImageViewer
