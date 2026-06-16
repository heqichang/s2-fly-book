import jwt from 'jsonwebtoken'
import prisma from '../config/prisma.js'

const onlineUsers = new Map()

const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token

      if (!token) {
        return next(new Error('未提供认证token'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, nickname: true, avatar: true, status: true }
      })

      if (!user) {
        return next(new Error('用户不存在'))
      }

      socket.userId = user.id
      socket.user = user
      next()
    } catch (error) {
      next(new Error('认证失败'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`用户连接: ${socket.userId} - socketId: ${socket.id}`)

    onlineUsers.set(socket.userId, socket.id)

    prisma.user.update({
      where: { id: socket.userId },
      data: { status: 'online' }
    }).catch(err => console.error('更新用户状态失败:', err))

    io.emit('online_status', {
      userId: socket.userId,
      status: 'online'
    })

    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, type = 'text' } = data

        if (!conversationId || !content) return

        const member = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: socket.userId
            }
          }
        })

        if (!member) return

        const message = await prisma.$transaction(async (tx) => {
          const msg = await tx.message.create({
            data: {
              conversationId,
              senderId: socket.userId,
              type,
              content
            },
            include: {
              sender: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true
                }
              }
            }
          })

          await tx.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessage: content,
              lastMessageAt: msg.createdAt
            }
          })

          const otherMembers = await tx.conversationMember.findMany({
            where: {
              conversationId,
              NOT: { userId: socket.userId }
            }
          })

          for (const om of otherMembers) {
            await tx.conversationMember.update({
              where: { id: om.id },
              data: {
                unreadCount: {
                  increment: 1
                }
              }
            })
          }

          return msg
        })

        const otherMembers = await prisma.conversationMember.findMany({
          where: {
            conversationId,
            NOT: { userId: socket.userId }
          }
        })

        for (const om of otherMembers) {
          const receiverSocketId = onlineUsers.get(om.userId)
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('new_message', {
              conversationId,
              message,
              sender: socket.user
            })
          }
        }

        socket.emit('message_sent', { conversationId, message })
      } catch (error) {
        console.error('发送消息失败:', error)
      }
    })

    socket.on('typing', (data) => {
      try {
        const { conversationId, isTyping } = data

        if (!conversationId) return

        prisma.conversationMember.findMany({
          where: {
            conversationId,
            NOT: { userId: socket.userId }
          }
        }).then(members => {
          for (const member of members) {
            const receiverSocketId = onlineUsers.get(member.userId)
            if (receiverSocketId) {
              io.to(receiverSocketId).emit('user_typing', {
                conversationId,
                userId: socket.userId,
                nickname: socket.user.nickname,
                isTyping
              })
            }
          }
        }).catch(err => console.error('获取会话成员失败:', err))
      } catch (error) {
        console.error('typing事件处理失败:', error)
      }
    })

    socket.on('mark_read', async (data) => {
      try {
        const { conversationId } = data

        if (!conversationId) return

        const member = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: socket.userId
            }
          }
        })

        if (!member) return

        await prisma.conversationMember.update({
          where: { id: member.id },
          data: {
            unreadCount: 0,
            lastReadAt: new Date()
          }
        })

        const otherMembers = await prisma.conversationMember.findMany({
          where: {
            conversationId,
            NOT: { userId: socket.userId }
          }
        })

        for (const om of otherMembers) {
          const receiverSocketId = onlineUsers.get(om.userId)
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('conversation_read', {
              conversationId,
              userId: socket.userId
            })
          }
        }
      } catch (error) {
        console.error('标记已读失败:', error)
      }
    })

    socket.on('disconnect', () => {
      console.log(`用户断开: ${socket.userId}`)

      onlineUsers.delete(socket.userId)

      prisma.user.update({
        where: { id: socket.userId },
        data: { status: 'offline' }
      }).catch(err => console.error('更新用户状态失败:', err))

      io.emit('online_status', {
        userId: socket.userId,
        status: 'offline'
      })
    })
  })

  return onlineUsers
}

export { setupSocketHandlers, onlineUsers }
