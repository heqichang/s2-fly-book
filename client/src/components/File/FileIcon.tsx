interface FileIconProps {
  filename: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const iconMap: Record<string, { icon: string; color: string }> = {
  pdf: { icon: '📕', color: 'text-red-500' },
  doc: { icon: '📘', color: 'text-blue-500' },
  docx: { icon: '📘', color: 'text-blue-500' },
  xls: { icon: '📗', color: 'text-green-500' },
  xlsx: { icon: '📗', color: 'text-green-500' },
  ppt: { icon: '📙', color: 'text-orange-500' },
  pptx: { icon: '📙', color: 'text-orange-500' },
  txt: { icon: '📄', color: 'text-gray-500' },
  zip: { icon: '📦', color: 'text-yellow-600' },
  rar: { icon: '📦', color: 'text-yellow-600' },
  '7z': { icon: '📦', color: 'text-yellow-600' },
  mp3: { icon: '🎵', color: 'text-pink-500' },
  wav: { icon: '🎵', color: 'text-pink-500' },
  mp4: { icon: '🎬', color: 'text-purple-500' },
  avi: { icon: '🎬', color: 'text-purple-500' },
  mov: { icon: '🎬', color: 'text-purple-500' },
  jpg: { icon: '🖼️', color: 'text-cyan-500' },
  jpeg: { icon: '🖼️', color: 'text-cyan-500' },
  png: { icon: '🖼️', color: 'text-cyan-500' },
  gif: { icon: '🖼️', color: 'text-cyan-500' },
  svg: { icon: '🖼️', color: 'text-cyan-500' },
  webp: { icon: '🖼️', color: 'text-cyan-500' },
}

const sizeClasses = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-16 h-16 text-3xl',
}

function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ext
}

function FileIcon({ filename, size = 'md', className = '' }: FileIconProps) {
  const ext = getFileExtension(filename)
  const fileInfo = iconMap[ext] || { icon: '📁', color: 'text-gray-400' }

  return (
    <div
      className={`${sizeClasses[size]} ${fileInfo.color} rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {fileInfo.icon}
    </div>
  )
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)
}

export default FileIcon
