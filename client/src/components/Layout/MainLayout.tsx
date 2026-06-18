import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { useSocketStore } from '../../store/socket'
import Avatar from '../common/Avatar'
import ConversationList from '../Chat/ConversationList'
import ContactList from '../Contacts/ContactList'

function MainLayout() {
  const { user } = useAuthStore()
  const location = useLocation()

  const isChats = location.pathname.startsWith('/chats')
  const isContacts = location.pathname.startsWith('/contacts')

  useEffect(() => {
    let connected = false
    let timerId: ReturnType<typeof setInterval> | null = null

    const tryInitSocket = () => {
      const authState = useAuthStore.getState()
      const socketState = useSocketStore.getState()
      if (
        authState.isAuthenticated &&
        authState.token &&
        authState.user?.id &&
        !socketState.socket
      ) {
        socketState.initSocket(authState.token, authState.user.id)
        connected = true
        if (timerId) {
          clearInterval(timerId)
          timerId = null
        }
      }
    }

    tryInitSocket()

    if (!connected) {
      timerId = setInterval(tryInitSocket, 500)
      setTimeout(() => {
        if (timerId) {
          clearInterval(timerId)
          timerId = null
        }
      }, 5000)
    }

    return () => {
      if (timerId) {
        clearInterval(timerId)
        timerId = null
      }
      useSocketStore.getState().disconnectSocket()
    }
  }, [])

  const navItems = [
    {
      to: '/chats',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      label: '消息',
      badge: true
    },
    {
      to: '/teams',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      label: '团队',
      badge: false
    },
    {
      to: '/organization',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      label: '组织',
      badge: false
    },
    {
      to: '/contacts',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      label: '联系人',
      badge: false
    },
    {
      to: '/docs',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: '文档',
      badge: false
    },
    {
      to: '/profile',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: '我的',
      badge: false
    }
  ]

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <aside className="w-[72px] bg-[#1f2329] flex flex-col items-center py-4 flex-shrink-0">
        <div className="mb-8">
          <Avatar
            src={user?.avatar}
            size="md"
            nickname={user?.nickname}
            status={user?.status}
          />
        </div>

        <nav className="flex-1 flex flex-col items-center space-y-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-[#3370FF] text-white'
                    : 'text-gray-400 hover:bg-[#2a2f37] hover:text-white'
                }`
              }
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  {item.icon(isActive)}
                  {item.badge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1f2329]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {isChats && (
        <div className="w-[320px] bg-[#f5f6f7] flex flex-col flex-shrink-0 border-r border-gray-100">
          <ConversationList />
        </div>
      )}

      {isContacts && (
        <div className="w-[320px] bg-[#f5f6f7] flex flex-col flex-shrink-0 border-r border-gray-100">
          <ContactList />
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
