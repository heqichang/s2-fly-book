import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type { Message, FriendRequest, PinnedMessage, ReadReceipt } from '../types'

type NewMessageHandler = (data: { conversationId: string; message: Message }) => void
type FriendRequestReceivedHandler = (request: FriendRequest) => void
type FriendRequestAcceptedHandler = (request: FriendRequest) => void
type OnlineStatusHandler = (data: { userId: string; online: boolean }) => void
type MessageRecalledHandler = (data: { conversationId: string; messageId: string }) => void
type MessageDeletedHandler = (data: { conversationId: string; messageId: string }) => void
type MessagePinnedHandler = (data: { conversationId: string; pinnedMessage: PinnedMessage }) => void
type MessageUnpinnedHandler = (data: { conversationId: string; messageId: string }) => void
type MessageReadHandler = (data: { conversationId: string; readReceipt: ReadReceipt }) => void
type ConversationUpdatedHandler = (data: { conversationId: string }) => void
type MemberJoinedHandler = (data: { conversationId: string; memberId: string }) => void
type MemberLeftHandler = (data: { conversationId: string; memberId: string }) => void

type SocketEventHandler =
  | { event: 'new_message'; handler: NewMessageHandler }
  | { event: 'friend_request_received'; handler: FriendRequestReceivedHandler }
  | { event: 'friend_request_accepted'; handler: FriendRequestAcceptedHandler }
  | { event: 'online_status'; handler: OnlineStatusHandler }
  | { event: 'message_recalled'; handler: MessageRecalledHandler }
  | { event: 'message_deleted'; handler: MessageDeletedHandler }
  | { event: 'message_pinned'; handler: MessagePinnedHandler }
  | { event: 'message_unpinned'; handler: MessageUnpinnedHandler }
  | { event: 'message_read'; handler: MessageReadHandler }
  | { event: 'conversation_updated'; handler: ConversationUpdatedHandler }
  | { event: 'member_joined'; handler: MemberJoinedHandler }
  | { event: 'member_left'; handler: MemberLeftHandler }

interface SocketState {
  socket: Socket | null
  connected: boolean
  onlineUsers: Map<string, boolean>
  initSocket: (token: string, _userId: string) => void
  disconnectSocket: () => void
  addSocketListener: (event: SocketEventHandler['event'], handler: SocketEventHandler['handler']) => void
  isUserOnline: (userId: string) => boolean
}

export const useSocketStore = create<SocketState>()((set, get) => ({
  socket: null,
  connected: false,
  onlineUsers: new Map(),

  initSocket: (token: string, _userId: string) => {
    const existingSocket = get().socket
    if (existingSocket) {
      existingSocket.disconnect()
    }

    const socket = io('/', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      set({ connected: true })
    })

    socket.on('disconnect', () => {
      set({ connected: false })
    })

    socket.on('online_status', (data: { userId: string; online: boolean }) => {
      set((state) => {
        const newMap = new Map(state.onlineUsers)
        newMap.set(data.userId, data.online)
        return { onlineUsers: newMap }
      })
    })

    socket.on('online_users', (users: string[]) => {
      set((state) => {
        const newMap = new Map(state.onlineUsers)
        users.forEach((uid) => newMap.set(uid, true))
        return { onlineUsers: newMap }
      })
    })

    set({ socket })
  },

  disconnectSocket: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false, onlineUsers: new Map() })
    }
  },

  addSocketListener: (event: SocketEventHandler['event'], handler: SocketEventHandler['handler']) => {
    const { socket } = get()
    if (socket) {
      socket.on(event, handler)
    }
  },

  isUserOnline: (userId: string) => {
    return get().onlineUsers.get(userId) ?? false
  }
}))

export default useSocketStore
