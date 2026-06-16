import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from '../../api/users'
import Avatar from '../common/Avatar'
import useToast from '../../hooks/useToast'
import Toast from '../common/Toast'
import { useAuthStore } from '../../store/auth'

const DICEBEAR_STYLES = [
  { key: 'avataaars', label: '卡通' },
  { key: 'bottts', label: '机器人' },
  { key: 'adventurer', label: '冒险者' },
  { key: 'lorelei', label: '像素' },
  { key: 'notionists', label: '简约' }
]

function randomSeed(): string {
  return Math.random().toString(36).substring(2, 10)
}

function generateDiceBear(seed: string, style: string = 'avataaars'): string {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}

function ProfileEditor() {
  const { user, setUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '')
  const [avatarMode, setAvatarMode] = useState<'random' | 'url'>('random')
  const [avatarStyle, setAvatarStyle] = useState('avataaars')
  const [avatarSeed, setAvatarSeed] = useState(user?.nickname || randomSeed())
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '')
      setAvatarUrl(user.avatar || '')
      if (!user.avatar) {
        setAvatarMode('random')
        setAvatarSeed(user.nickname || randomSeed())
      } else {
        setAvatarMode('url')
      }
    }
  }, [user])

  const effectiveAvatar = avatarMode === 'url'
    ? avatarUrl || undefined
    : generateDiceBear(avatarSeed, avatarStyle)

  const handleRandomize = () => {
    setAvatarSeed(randomSeed())
  }

  const handleSave = async () => {
    const finalAvatar = effectiveAvatar || ''
    if (!nickname.trim()) {
      showToast('请输入昵称', 'error')
      return
    }
    try {
      setSaving(true)
      const updated = await updateProfile({
        nickname: nickname.trim(),
        avatar: finalAvatar
      })
      if (updated) {
        setUser(updated)
      }
      showToast('保存成功', 'success')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      logout()
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '退出登录失败', 'error')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
      <div className="h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-xl mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-[#3370FF] to-[#6a8cff] h-32 relative">
              <div className="absolute -bottom-16 left-8">
                <div className="relative group">
                  <Avatar
                    src={effectiveAvatar}
                    size="xl"
                    nickname={nickname || '用户'}
                    className="ring-4 ring-white shadow-lg"
                  />
                  {avatarMode === 'random' && (
                    <button
                      onClick={handleRandomize}
                      className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white border-2 border-[#3370FF] text-[#3370FF] shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#3370FF] hover:text-white"
                      title="随机换一个"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-20 px-8 pb-8 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">头像</label>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setAvatarMode('random')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${avatarMode === 'random' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      随机头像
                    </button>
                    <button
                      onClick={() => setAvatarMode('url')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${avatarMode === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      URL输入
                    </button>
                  </div>
                </div>

                {avatarMode === 'random' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {DICEBEAR_STYLES.map((style) => (
                        <button
                          key={style.key}
                          onClick={() => setAvatarStyle(style.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${avatarStyle === style.key ? 'bg-[#3370FF] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                        <img
                          src={generateDiceBear(avatarSeed, avatarStyle)}
                          alt="预览"
                          className="w-12 h-12 rounded-lg bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">当前种子</p>
                          <p className="text-sm font-mono text-gray-700 truncate">{avatarSeed}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleRandomize}
                        className="p-3 bg-white border border-gray-200 hover:border-[#3370FF] hover:text-[#3370FF] rounded-xl text-gray-600 transition-all"
                        title="随机换一个"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="请输入头像URL"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all placeholder-gray-400 border border-transparent focus:border-[#3370FF]/20"
                    />
                    {avatarUrl && (
                      <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <img
                          src={avatarUrl}
                          alt="预览"
                          className="w-12 h-12 rounded-lg bg-white object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                        <p className="text-xs text-gray-500">头像预览</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  昵称
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="请输入昵称"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                  maxLength={20}
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all placeholder-gray-400 border border-transparent focus:border-[#3370FF]/20"
                />
                <div className="mt-1 text-right text-xs text-gray-400">{nickname.length}/20</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-500 cursor-not-allowed flex items-center justify-between">
                  <span>{user?.email || '-'}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 bg-[#3370FF] hover:bg-[#2a5fd9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none"
                >
                  {saving ? '保存中...' : '保存修改'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">账号管理</h3>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full py-3 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 text-red-500 hover:text-red-600 rounded-xl text-sm font-medium transition-all"
              >
                {loggingOut ? '退出中...' : '退出登录'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ProfileEditor
