import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId

    const members = await prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    nickname: true,
                    avatar: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        conversation: {
          lastMessageAt: 'desc'
        }
      }
    })

    const data = members.map(m => {
      const otherMembers = m.conversation.members.filter(cm => cm.userId !== userId)
      const otherUser = otherMembers.length > 0 ? otherMembers[0].user : null

      return {
        id: m.conversation.id,
        type: m.conversation.type,
        name: m.conversation.name,
        lastMessage: m.conversation.lastMessage,
        lastMessageAt: m.conversation.lastMessageAt,
        unreadCount: m.unreadCount,
        otherUser
      }
    })

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { withUserId } = req.body
    const userId = req.user.userId

    if (!withUserId) {
      return res.status(400).json({ success: false, message: '请提供对方用户ID' })
    }

    if (withUserId === userId) {
      return res.status(400).json({ success: false, message: '不能与自己创建会话' })
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        type: 'single',
        members: {
          every: {
            userId: {
              in: [userId, withUserId]
            }
          },
          some: { userId },
          AND: { some: { userId: withUserId } }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                nickname: true,
                avatar: true,
                status: true
              }
            }
          }
        }
      }
    })

    if (existing) {
      const myMember = existing.members.find(m => m.userId === userId)
      const otherMember = existing.members.find(m => m.userId !== userId)
      return res.json({
        success: true,
        data: {
          id: existing.id,
          type: existing.type,
          name: existing.name,
          lastMessage: existing.lastMessage,
          lastMessageAt: existing.lastMessageAt,
          unreadCount: myMember ? myMember.unreadCount : 0,
          otherUser: otherMember ? otherMember.user : null
        }
      })
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: 'single',
        members: {
          create: [
            { userId },
            { userId: withUserId }
          ]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                nickname: true,
                avatar: true,
                status: true
              }
            }
          }
        }
      }
    })

    const myMember = conversation.members.find(m => m.userId === userId)
    const otherMember = conversation.members.find(m => m.userId !== userId)

    res.json({
      success: true,
      data: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: myMember ? myMember.unreadCount : 0,
        otherUser: otherMember ? otherMember.user : null
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 50

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId
        }
      }
    })

    if (!member) {
      return res.status(403).json({ success: false, message: '无权访问该会话' })
    }

    const skip = (page - 1) * pageSize

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: id },
        include: {
          sender: {
            select: {
              id: true,
              nickname: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.message.count({ where: { conversationId: id } })
    ])

    const reversedMessages = [...messages].reverse()

    res.json({
      success: true,
      data: {
        messages: reversedMessages,
        total,
        page,
        pageSize,
        hasMore: skip + pageSize < total
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { content, type = 'text' } = req.body
    const userId = req.user.userId

    if (!content) {
      return res.status(400).json({ success: false, message: '消息内容不能为空' })
    }

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId
        }
      }
    })

    if (!member) {
      return res.status(403).json({ success: false, message: '无权发送消息到该会话' })
    }

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId: id,
          senderId: userId,
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
        where: { id },
        data: {
          lastMessage: content,
          lastMessageAt: msg.createdAt
        }
      })

      const otherMembers = await tx.conversationMember.findMany({
        where: {
          conversationId: id,
          NOT: { userId }
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

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const otherMembers = await prisma.conversationMember.findMany({
      where: {
        conversationId: id,
        NOT: { userId }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nickname: true,
            avatar: true,
            status: true
          }
        }
      }
    })

    for (const om of otherMembers) {
      const socketId = onlineUsers.get(om.userId)
      if (socketId) {
        io.to(socketId).emit('new_message', {
          conversationId: id,
          message,
          otherUser: {
            id: (await prisma.user.findUnique({
              where: { id: userId },
              select: { id: true, nickname: true, avatar: true, email: true, status: true }
            }))
          }
        })
      }
    }

    res.json({ success: true, data: message })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId
        }
      }
    })

    if (!member) {
      return res.status(403).json({ success: false, message: '无权访问该会话' })
    }

    await prisma.conversationMember.update({
      where: { id: member.id },
      data: {
        unreadCount: 0,
        lastReadAt: new Date()
      }
    })

    res.json({ success: true, data: { message: '已标记为已读' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
