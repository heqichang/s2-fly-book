interface AvatarProps {
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  nickname?: string
  status?: 'online' | 'offline' | 'busy' | 'away' | string
  className?: string
  onClick?: () => void
}

const colors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500'
]

function getColor(nickname: string): string {
  let hash = 0
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-2xl'
}

const statusDotClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4'
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500'
}

function Avatar({ src, size = 'md', nickname = 'U', status, className = '', onClick }: AvatarProps) {
  const initial = nickname?.charAt(0)?.toUpperCase() || 'U'
  const bgColor = getColor(nickname || 'U')

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onClick={onClick}
        className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary-200 transition-all' : ''}`}
      >
        {src ? (
          <img src={src} alt={nickname} className="w-full h-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      {status && (
        <span
          className={`absolute bottom-0 right-0 ${statusDotClasses[size]} ${statusColors[status as keyof typeof statusColors] || statusColors.offline} rounded-full border-2 border-white`}
        />
      )}
    </div>
  )
}

export default Avatar
