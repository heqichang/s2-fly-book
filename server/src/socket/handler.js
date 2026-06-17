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
        const { conversationId, content, type = 'text', replyToId, forwardFromId, mentions, fileId } = data

        if (!conversationId || (!content && !fileId)) return

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
              content: content || '',
              replyToId,
              forwardFromId
            },
            include: {
              sender: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true
                }
              },
              replyTo: replyToId ? {
                select: {
                  id: true,
                  content: true,
                  type: true,
                  isRecalled: true,
                  sender: {
                    select: {
                      id: true,
                      nickname: true
                    }
                  }
                }
              } : undefined,
              file: fileId ? true : undefined
            }
          })

          if (fileId) {
            await tx.file.update({
              where: { id: fileId },
              data: { messageId: msg.id }
            })
          }

          if (mentions && Array.isArray(mentions) && mentions.length > 0) {
            for (const mention of mentions) {
              await tx.messageMention.create({
                data: {
                  messageId: msg.id,
                  userId: mention.userId,
                  isAll: mention.isAll || false
                }
              })
            }
          }

          await tx.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessage: type === 'text' ? content : `[${type === 'image' ? '图片' : type === 'file' ? '文件' : '消息'}]`,
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

        const unreadCount = member.unreadCount

        await prisma.conversationMember.update({
          where: { id: member.id },
          data: {
            unreadCount: 0,
            lastReadAt: new Date()
          }
        })

        const unreadMessages = await prisma.message.findMany({
          where: {
            conversationId,
            senderId: { not: socket.userId },
            isDeleted: false,
            isRecalled: false
          },
          orderBy: { createdAt: 'desc' },
          take: unreadCount
        })

        for (const msg of unreadMessages) {
          const existing = await prisma.readReceipt.findUnique({
            where: {
              messageId_userId: {
                messageId: msg.id,
                userId: socket.userId
              }
            }
          })
          if (!existing) {
            await prisma.readReceipt.create({
              data: {
                messageId: msg.id,
                userId: socket.userId
              }
            })
          }
        }

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

    socket.on('recall_message', async (data) => {
      try {
        const { conversationId, messageId } = data

        if (!conversationId || !messageId) return

        const message = await prisma.message.findUnique({
          where: { id: messageId }
        })

        if (!message || message.senderId !== socket.userId || message.isRecalled) return

        const now = new Date()
        const createdAt = new Date(message.createdAt)
        const diffMinutes = (now - createdAt) / (1000 * 60)

        if (diffMinutes > 2) return

        await prisma.message.update({
          where: { id: messageId },
          data: {
            isRecalled: true,
            content: '消息已撤回'
          }
        })

        const members = await prisma.conversationMember.findMany({
          where: { conversationId }
        })

        for (const m of members) {
          const socketId = onlineUsers.get(m.userId)
          if (socketId) {
            io.to(socketId).emit('message_recalled', {
              conversationId,
              messageId
            })
          }
        }
      } catch (error) {
        console.error('撤回消息失败:', error)
      }
    })

    socket.on('delete_message', async (data) => {
      try {
        const { conversationId, messageId } = data

        if (!conversationId || !messageId) return

        const message = await prisma.message.findUnique({
          where: { id: messageId }
        })

        const member = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: socket.userId
            }
          }
        })

        const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
        const isAdmin = conversation.type === 'group' && member && ['owner', 'admin'].includes(member.role)

        if (!message || message.isDeleted) return
        if (message.senderId !== socket.userId && !isAdmin) return

        await prisma.message.update({
          where: { id: messageId },
          data: { isDeleted: true }
        })

        const members = await prisma.conversationMember.findMany({
          where: { conversationId }
        })

        for (const m of members) {
          const socketId = onlineUsers.get(m.userId)
          if (socketId) {
            io.to(socketId).emit('message_deleted', {
              conversationId,
              messageId
            })
          }
        }
      } catch (error) {
        console.error('删除消息失败:', error)
      }
    })

    socket.on('pin_message', async (data) => {
      try {
        const { conversationId, messageId } = data

        if (!conversationId || !messageId) return

        const member = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: socket.userId
            }
          }
        })

        if (!member) return

        const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
        if (conversation.type === 'group' && member.role === 'member') return

        const message = await prisma.message.findUnique({
          where: { id: messageId }
        })

        if (!message || message.conversationId !== conversationId || message.isDeleted || message.isRecalled) return

        const existingPin = await prisma.pinnedMessage.findUnique({
          where: {
            conversationId_messageId: {
              conversationId,
              messageId
            }
          }
        })

        if (existingPin) return

        const pinnedMessage = await prisma.pinnedMessage.create({
          data: {
            conversationId,
            messageId,
            pinnedById: socket.userId
          },
          include: {
            message: {
              include: {
                sender: {
                  select: {
                    id: true,
                    nickname: true,
                    avatar: true
                  }
                }
              }
            },
            pinnedBy: {
              select: {
                id: true,
                nickname: true,
                avatar: true
              }
            }
          }
        })

        const members = await prisma.conversationMember.findMany({
          where: { conversationId }
        })

        for (const m of members) {
          const socketId = onlineUsers.get(m.userId)
          if (socketId) {
            io.to(socketId).emit('message_pinned', {
              conversationId,
              pinnedMessage
            })
          }
        }
      } catch (error) {
        console.error('置顶消息失败:', error)
      }
    })

    socket.on('unpin_message', async (data) => {
      try {
        const { conversationId, messageId } = data

        if (!conversationId || !messageId) return

        const member = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: socket.userId
            }
          }
        })

        if (!member) return

        const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
        if (conversation.type === 'group' && member.role === 'member') return

        const pinnedMessage = await prisma.pinnedMessage.findUnique({
          where: {
            conversationId_messageId: {
              conversationId,
              messageId
            }
          }
        })

        if (!pinnedMessage) return

        await prisma.pinnedMessage.delete({
          where: {
            conversationId_messageId: {
              conversationId,
              messageId
            }
          }
        })

        const members = await prisma.conversationMember.findMany({
          where: { conversationId }
        })

        for (const m of members) {
          const socketId = onlineUsers.get(m.userId)
          if (socketId) {
            io.to(socketId).emit('message_unpinned', {
              conversationId,
              messageId
            })
          }
        }
      } catch (error) {
        console.error('取消置顶失败:', error)
      }
    })

    socket.on('join_conversation', (data) => {
      const { conversationId } = data
      if (conversationId) {
        socket.join(`conversation:${conversationId}`)
        console.log(`用户 ${socket.userId} 加入会话房间: ${conversationId}`)
      }
    })

    socket.on('leave_conversation', (data) => {
      const { conversationId } = data
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`)
        console.log(`用户 ${socket.userId} 离开会话房间: ${conversationId}`)
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
