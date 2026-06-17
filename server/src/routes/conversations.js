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
            },
            team: {
              select: {
                id: true,
                name: true,
                logo: true
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
      const myMember = m.conversation.members.find(cm => cm.userId === userId)

      return {
        id: m.conversation.id,
        type: m.conversation.type,
        subtype: m.conversation.subtype,
        name: m.conversation.name,
        avatar: m.conversation.avatar,
        announcement: m.conversation.announcement,
        teamId: m.conversation.teamId,
        team: m.conversation.team,
        lastMessage: m.conversation.lastMessage,
        lastMessageAt: m.conversation.lastMessageAt,
        unreadCount: m.unreadCount,
        role: myMember?.role || 'member',
        otherUser,
        members: m.conversation.members.map(cm => ({
          id: cm.id,
          userId: cm.userId,
          role: cm.role,
          user: cm.user
        })),
        memberCount: m.conversation.members.length,
        createdAt: m.conversation.createdAt
      }
    })

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { withUserId, type = 'single', name, avatar, teamId, memberIds } = req.body
    const userId = req.user.userId

    if (type === 'single') {
      if (!withUserId) {
        return res.status(400).json({ success: false, message: '请提供对方用户ID' })
      }

      if (withUserId === userId) {
        return res.status(400).json({ success: false, message: '不能与自己创建会话' })
      }

      const existing = await prisma.conversation.findFirst({
        where: {
          type: 'single',
          AND: [
            {
              members: {
                every: {
                  userId: {
                    in: [userId, withUserId]
                  }
                }
              }
            },
            {
              members: {
                some: { userId }
              }
            },
            {
              members: {
                some: { userId: withUserId }
              }
            }
          ]
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

      return res.json({
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
    } else if (type === 'group') {
      if (!name) {
        return res.status(400).json({ success: false, message: '请提供群名称' })
      }

      const allMemberIds = [...new Set([userId, ...(memberIds || [])])]

      if (allMemberIds.length < 3) {
        return res.status(400).json({ success: false, message: '群聊至少需要3人' })
      }

      const conversation = await prisma.conversation.create({
        data: {
          type: 'group',
          subtype: 'normal',
          name,
          avatar,
          teamId,
          members: {
            create: allMemberIds.map((uid, index) => ({
              userId: uid,
              role: index === 0 ? 'owner' : 'member'
            }))
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

      const io = req.app.get('io')
      const onlineUsers = req.app.get('onlineUsers')

      for (const m of conversation.members) {
        if (m.userId !== userId) {
          const socketId = onlineUsers.get(m.userId)
          if (socketId) {
            io.to(socketId).emit('conversation_added', {
              conversation: {
                id: conversation.id,
                type: conversation.type,
                name: conversation.name,
                avatar: conversation.avatar,
                memberCount: conversation.members.length
              }
            })
          }
        }
      }

      const myMember = conversation.members.find(m => m.userId === userId)

      return res.json({
        success: true,
        data: {
          id: conversation.id,
          type: conversation.type,
          subtype: conversation.subtype,
          name: conversation.name,
          avatar: conversation.avatar,
          teamId: conversation.teamId,
          role: myMember?.role || 'member',
          members: conversation.members.map(m => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            user: m.user
          })),
          memberCount: conversation.members.length,
          createdAt: conversation.createdAt
        }
      })
    } else {
      return res.status(400).json({ success: false, message: '无效的会话类型' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/group', auth, async (req, res) => {
  try {
    const { name, avatar, teamId, memberIds } = req.body
    const userId = req.user.userId

    if (!name) {
      return res.status(400).json({ success: false, message: '请提供群名称' })
    }

    const allMemberIds = [...new Set([userId, ...(memberIds || [])])]

    if (allMemberIds.length < 2) {
      return res.status(400).json({ success: false, message: '群聊至少需要2人' })
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: 'group',
        subtype: 'normal',
        name,
        avatar,
        teamId,
        members: {
          create: allMemberIds.map((uid, index) => ({
            userId: uid,
            role: index === 0 ? 'owner' : 'member'
          }))
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

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    for (const m of conversation.members) {
      if (m.userId !== userId) {
        const socketId = onlineUsers.get(m.userId)
        if (socketId) {
          io.to(socketId).emit('conversation_added', {
            conversation: {
              id: conversation.id,
              type: conversation.type,
              name: conversation.name,
              avatar: conversation.avatar,
              memberCount: conversation.members.length
            }
          })
        }
      }
    }

    const myMember = conversation.members.find(m => m.userId === userId)

    return res.json({
      success: true,
      data: {
        id: conversation.id,
        type: conversation.type,
        subtype: conversation.subtype,
        name: conversation.name,
        avatar: conversation.avatar,
        teamId: conversation.teamId,
        role: myMember?.role || 'member',
        members: conversation.members.map(m => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: m.user
        })),
        memberCount: conversation.members.length,
        createdAt: conversation.createdAt
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/department', auth, async (req, res) => {
  try {
    const { departmentId, name } = req.body
    const userId = req.user.userId

    if (!departmentId) {
      return res.status(400).json({ success: false, message: '请提供部门ID' })
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        },
        members: {
          include: {
            user: true
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({ success: false, message: '部门不存在' })
    }

    const teamMember = department.team.members[0]
    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限创建部门群' })
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        type: 'group',
        subtype: 'department',
        departmentId
      }
    })

    if (existing) {
      return res.status(400).json({ success: false, message: '该部门已存在部门群' })
    }

    if (department.members.length < 2) {
      return res.status(400).json({ success: false, message: '部门成员不足，无法创建群聊' })
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: 'group',
        subtype: 'department',
        name: name || `${department.name}群`,
        teamId: department.teamId,
        departmentId,
        members: {
          create: department.members.map((dm, index) => ({
            userId: dm.userId,
            role: index === 0 ? 'owner' : 'member'
          }))
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

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    for (const m of conversation.members) {
      const socketId = onlineUsers.get(m.userId)
      if (socketId) {
        io.to(socketId).emit('conversation_added', {
          conversation: {
            id: conversation.id,
            type: conversation.type,
            subtype: conversation.subtype,
            name: conversation.name,
            memberCount: conversation.members.length
          }
        })
      }
    }

    res.json({
      success: true,
      data: {
        id: conversation.id,
        type: conversation.type,
        subtype: conversation.subtype,
        name: conversation.name,
        teamId: conversation.teamId,
        departmentId: conversation.departmentId,
        members: conversation.members.map(m => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: m.user
        })),
        memberCount: conversation.members.length,
        createdAt: conversation.createdAt
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
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

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                nickname: true,
                avatar: true,
                phone: true,
                status: true
              }
            }
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        pinnedMessages: {
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
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ success: false, message: '会话不存在' })
    }

    const myMember = conversation.members.find(m => m.userId === userId)
    const otherMembers = conversation.members.filter(m => m.userId !== userId)

    const data = {
      id: conversation.id,
      type: conversation.type,
      subtype: conversation.subtype,
      name: conversation.name,
      avatar: conversation.avatar,
      announcement: conversation.announcement,
      teamId: conversation.teamId,
      team: conversation.team,
      departmentId: conversation.departmentId,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: member.unreadCount,
      role: myMember?.role || 'member',
      otherUser: conversation.type === 'single' && otherMembers.length > 0 ? otherMembers[0].user : null,
      members: conversation.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user
      })),
      memberCount: conversation.members.length,
      pinnedMessages: conversation.pinnedMessages,
      createdAt: conversation.createdAt
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, avatar, announcement } = req.body
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

    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (conversation.type === 'group' && member.role === 'member') {
      return res.status(403).json({ success: false, message: '只有群主或管理员可以修改群信息' })
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        name: name || undefined,
        avatar: avatar !== undefined ? avatar : undefined,
        announcement: announcement !== undefined ? announcement : undefined
      }
    })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: id }
    })

    for (const m of members) {
      const socketId = onlineUsers.get(m.userId)
      if (socketId) {
        io.to(socketId).emit('conversation_updated', {
          conversationId: id,
          updates: {
            name: updatedConversation.name,
            avatar: updatedConversation.avatar,
            announcement: updatedConversation.announcement
          }
        })
      }
    }

    res.json({ success: true, data: updatedConversation })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/members', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { memberIds } = req.body
    const userId = req.user.userId

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: '请提供要邀请的用户ID列表' })
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
      return res.status(403).json({ success: false, message: '无权访问该会话' })
    }

    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (conversation.type === 'single') {
      return res.status(400).json({ success: false, message: '单聊不能添加成员' })
    }

    const existingMembers = await prisma.conversationMember.findMany({
      where: { conversationId: id }
    })
    const existingUserIds = new Set(existingMembers.map(m => m.userId))

    const newMembers = []
    for (const uid of memberIds) {
      if (!existingUserIds.has(uid)) {
        newMembers.push({
          userId: uid,
          role: 'member'
        })
      }
    }

    if (newMembers.length === 0) {
      return res.status(400).json({ success: false, message: '所有用户已是群成员' })
    }

    const createdMembers = await prisma.$transaction(async (tx) => {
      const results = []
      for (const nm of newMembers) {
        const created = await tx.conversationMember.create({
          data: {
            conversationId: id,
            userId: nm.userId,
            role: nm.role
          },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                email: true,
                status: true
              }
            }
          }
        })
        results.push(created)
      }
      return results
    })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    for (const cm of createdMembers) {
      const socketId = onlineUsers.get(cm.userId)
      if (socketId) {
        io.to(socketId).emit('conversation_added', {
          conversation: {
            id,
            type: conversation.type,
            name: conversation.name,
            avatar: conversation.avatar
          }
        })
      }
    }

    for (const em of existingMembers) {
      const socketId = onlineUsers.get(em.userId)
      if (socketId) {
        io.to(socketId).emit('group_members_added', {
          conversationId: id,
          members: createdMembers.map(cm => ({
            id: cm.id,
            userId: cm.userId,
            role: cm.role,
            user: cm.user
          }))
        })
      }
    }

    res.json({ success: true, data: createdMembers })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id/members/:memberId/role', auth, async (req, res) => {
  try {
    const { id, memberId } = req.params
    const { role } = req.body
    const userId = req.user.userId

    if (!['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: '无效的角色' })
    }

    const currentMember = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId
        }
      }
    })

    if (!currentMember) {
      return res.status(403).json({ success: false, message: '无权访问该会话' })
    }

    if (currentMember.role !== 'owner') {
      return res.status(403).json({ success: false, message: '只有群主可以设置管理员' })
    }

    const targetMember = await prisma.conversationMember.findUnique({
      where: { id: memberId }
    })

    if (!targetMember || targetMember.conversationId !== id) {
      return res.status(404).json({ success: false, message: '成员不存在' })
    }

    const updatedMember = await prisma.conversationMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        }
      }
    })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const allMembers = await prisma.conversationMember.findMany({
      where: { conversationId: id }
    })

    for (const m of allMembers) {
      const socketId = onlineUsers.get(m.userId)
      if (socketId) {
        io.to(socketId).emit('group_member_role_updated', {
          conversationId: id,
          memberId,
          role,
          user: updatedMember.user
        })
      }
    }

    res.json({ success: true, data: updatedMember })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const { id, memberId } = req.params
    const userId = req.user.userId

    const currentMember = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId
        }
      }
    })

    if (!currentMember) {
      return res.status(403).json({ success: false, message: '无权访问该会话' })
    }

    const targetMember = await prisma.conversationMember.findUnique({
      where: { id: memberId }
    })

    if (!targetMember || targetMember.conversationId !== id) {
      return res.status(404).json({ success: false, message: '成员不存在' })
    }

    if (targetMember.role === 'owner') {
      return res.status(400).json({ success: false, message: '不能移除群主' })
    }

    if (userId !== targetMember.userId && currentMember.role === 'member') {
      return res.status(403).json({ success: false, message: '只有群主或管理员可以移除成员' })
    }

    await prisma.conversationMember.delete({ where: { id: memberId } })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const targetSocketId = onlineUsers.get(targetMember.userId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('removed_from_group', { conversationId: id })
    }

    const remainingMembers = await prisma.conversationMember.findMany({
      where: { conversationId: id }
    })

    for (const m of remainingMembers) {
      const socketId = onlineUsers.get(m.userId)
      if (socketId) {
        io.to(socketId).emit('group_member_removed', {
          conversationId: id,
          userId: targetMember.userId
        })
      }
    }

    res.json({ success: true, data: { message: userId === targetMember.userId ? '已退出群聊' : '已移除成员' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id/leave', auth, async (req, res) => {
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
      return res.status(400).json({ success: false, message: '您不是该群成员' })
    }

    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (conversation.type === 'single') {
      return res.status(400).json({ success: false, message: '单聊不能退出' })
    }

    if (member.role === 'owner') {
      const otherMembers = await prisma.conversationMember.findMany({
        where: {
          conversationId: id,
          NOT: { userId }
        }
      })

      if (otherMembers.length > 0) {
        const newOwner = otherMembers[0]
        await prisma.conversationMember.update({
          where: { id: newOwner.id },
          data: { role: 'owner' }
        })
      } else {
        await prisma.conversation.delete({ where: { id } })
        return res.json({ success: true, data: { message: '群聊已解散' } })
      }
    }

    await prisma.conversationMember.delete({ where: { id: member.id } })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const remainingMembers = await prisma.conversationMember.findMany({
      where: { conversationId: id }
    })

    for (const m of remainingMembers) {
      const socketId = onlineUsers.get(m.userId)
      if (socketId) {
        io.to(socketId).emit('group_member_left', {
          conversationId: id,
          userId
        })
      }
    }

    res.json({ success: true, data: { message: '已退出群聊' } })
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
        where: {
          conversationId: id,
          isDeleted: false
        },
        include: {
          sender: {
            select: {
              id: true,
              nickname: true,
              avatar: true
            }
          },
          replyTo: {
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
          },
          file: true,
          mentions: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true
                }
              }
            }
          },
          readReceipts: {
            select: {
              userId: true,
              readAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.message.count({
        where: {
          conversationId: id,
          isDeleted: false
        }
      })
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
    const { content, type = 'text', replyToId, forwardFromId, mentions, fileId } = req.body
    const userId = req.user.userId

    if (!content && !fileId) {
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
        where: { id },
        data: {
          lastMessage: type === 'text' ? content : `[${type === 'image' ? '图片' : type === 'file' ? '文件' : '消息'}]`,
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

router.put('/:id/messages/:messageId/recall', auth, async (req, res) => {
  try {
    const { id, messageId } = req.params
    const userId = req.user.userId

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message) {
      return res.status(404).json({ success: false, message: '消息不存在' })
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ success: false, message: '只能撤回自己发送的消息' })
    }

    if (message.isRecalled) {
      return res.status(400).json({ success: false, message: '消息已撤回' })
    }

    const now = new Date()
    const createdAt = new Date(message.createdAt)
    const diffMinutes = (now - createdAt) / (1000 * 60)

    if (diffMinutes > 2) {
      return res.status(400).json({ success: false, message: '只能撤回2分钟内的消息' })
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        isRecalled: true,
        content: '消息已撤回'
      }
    })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: id }
    })

    for (const m of members) {
      const socketId = onlineUsers.get(m.userId)
      if (socketId) {
        io.to(socketId).emit('message_recalled', {
          conversationId: id,
          messageId
        })
      }
    }

    res.json({ success: true, data: updatedMessage })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id/messages/:messageId', auth, async (req, res) => {
  try {
    const { id, messageId } = req.params
    const userId = req.user.userId

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message) {
      return res.status(404).json({ success: false, message: '消息不存在' })
    }

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId
        }
      }
    })

    const conversation = await prisma.conversation.findUnique({ where: { id } })
    const isAdmin = conversation.type === 'group' && member && ['owner', 'admin'].includes(member.role)

    if (message.senderId !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: '无权删除此消息' })
    }

    if (message.isDeleted) {
      return res.status(400).json({ success: false, message: '消息已删除' })
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true }
    })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: id }
    })

    for (const m of members) {
      const socketId = onlineUsers.get(m.userId)
      if (socketId) {
        io.to(socketId).emit('message_deleted', {
          conversationId: id,
          messageId
        })
      }
    }

    res.json({ success: true, data: updatedMessage })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/messages/:messageId/forward', auth, async (req, res) => {
  try {
    const { id, messageId } = req.params
    const { targetConversationIds } = req.body
    const userId = req.user.userId

    if (!targetConversationIds || !Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
      return res.status(400).json({ success: false, message: '请提供目标会话ID列表' })
    }

    const sourceMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        file: true
      }
    })

    if (!sourceMessage || sourceMessage.isDeleted || sourceMessage.isRecalled) {
      return res.status(404).json({ success: false, message: '消息不存在或已删除' })
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
      return res.status(403).json({ success: false, message: '无权访问该消息' })
    }

    const forwardedMessages = []
    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    for (const targetId of targetConversationIds) {
      const targetMember = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId: targetId,
            userId
          }
        }
      })

      if (!targetMember) continue

      const newMessage = await prisma.$transaction(async (tx) => {
        let newFileId = null
        if (sourceMessage.file) {
          const newFile = await tx.file.create({
            data: {
              name: sourceMessage.file.name,
              originalName: sourceMessage.file.originalName,
              mimeType: sourceMessage.file.mimeType,
              size: sourceMessage.file.size,
              url: sourceMessage.file.url,
              thumbnail: sourceMessage.file.thumbnail,
              uploadedById: userId
            }
          })
          newFileId = newFile.id
        }

        const msg = await tx.message.create({
          data: {
            conversationId: targetId,
            senderId: userId,
            type: sourceMessage.type,
            content: sourceMessage.content,
            forwardFromId: messageId,
            fileId: newFileId
          },
          include: {
            sender: {
              select: {
                id: true,
                nickname: true,
                avatar: true
              }
            },
            file: newFileId ? true : undefined
          }
        })

        await tx.conversation.update({
          where: { id: targetId },
          data: {
            lastMessage: sourceMessage.type === 'text' ? sourceMessage.content : `[${sourceMessage.type === 'image' ? '图片' : '文件'}]`,
            lastMessageAt: msg.createdAt
          }
        })

        const otherMembers = await tx.conversationMember.findMany({
          where: {
            conversationId: targetId,
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

      forwardedMessages.push(newMessage)

      const otherMembers = await prisma.conversationMember.findMany({
        where: {
          conversationId: targetId,
          NOT: { userId }
        }
      })

      for (const om of otherMembers) {
        const socketId = onlineUsers.get(om.userId)
        if (socketId) {
          io.to(socketId).emit('new_message', {
            conversationId: targetId,
            message: newMessage
          })
        }
      }
    }

    res.json({ success: true, data: forwardedMessages })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/pin/:messageId', auth, async (req, res) => {
  try {
    const { id, messageId } = req.params
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

    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (conversation.type === 'group' && member.role === 'member') {
      return res.status(403).json({ success: false, message: '只有群主或管理员可以置顶消息' })
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message || message.conversationId !== id || message.isDeleted || message.isRecalled) {
      return res.status(404).json({ success: false, message: '消息不存在' })
    }

    const existingPin = await prisma.pinnedMessage.findUnique({
      where: {
        conversationId_messageId: {
          conversationId: id,
          messageId
        }
      }
    })

    if (existingPin) {
      return res.status(400).json({ success: false, message: '消息已置顶' })
    }

    const pinnedMessage = await prisma.pinnedMessage.create({
      data: {
        conversationId: id,
        messageId,
        pinnedById: userId
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

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: id }
    })

    for (const m of members) {
      const socketId = onlineUsers.get(m.userId)
      if (socketId) {
        io.to(socketId).emit('message_pinned', {
          conversationId: id,
          pinnedMessage
        })
      }
    }

    res.json({ success: true, data: pinnedMessage })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id/pin/:messageId', auth, async (req, res) => {
  try {
    const { id, messageId } = req.params
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

    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (conversation.type === 'group' && member.role === 'member') {
      return res.status(403).json({ success: false, message: '只有群主或管理员可以取消置顶' })
    }

    const pinnedMessage = await prisma.pinnedMessage.findUnique({
      where: {
        conversationId_messageId: {
          conversationId: id,
          messageId
        }
      }
    })

    if (!pinnedMessage) {
      return res.status(404).json({ success: false, message: '置顶消息不存在' })
    }

    await prisma.pinnedMessage.delete({
      where: {
        conversationId_messageId: {
          conversationId: id,
          messageId
        }
      }
    })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const members = await prisma.conversationMember.findMany({
      where: { conversationId: id }
    })

    for (const m of members) {
      const socketId = onlineUsers.get(m.userId)
      if (socketId) {
        io.to(socketId).emit('message_unpinned', {
          conversationId: id,
          messageId
        })
      }
    }

    res.json({ success: true, data: { message: '已取消置顶' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/read-receipts/:messageId', auth, async (req, res) => {
  try {
    const { id, messageId } = req.params
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

    const readReceipts = await prisma.readReceipt.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        }
      }
    })

    res.json({ success: true, data: readReceipts })
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

    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId: id,
        senderId: { not: userId },
        isDeleted: false,
        isRecalled: false
      },
      orderBy: { createdAt: 'desc' },
      take: member.unreadCount
    })

    for (const msg of unreadMessages) {
      const existing = await prisma.readReceipt.findUnique({
        where: {
          messageId_userId: {
            messageId: msg.id,
            userId
          }
        }
      })
      if (!existing) {
        await prisma.readReceipt.create({
          data: {
            messageId: msg.id,
            userId
          }
        })
      }
    }

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const otherMembers = await prisma.conversationMember.findMany({
      where: {
        conversationId: id,
        NOT: { userId }
      }
    })

    for (const om of otherMembers) {
      const socketId = onlineUsers.get(om.userId)
      if (socketId) {
        io.to(socketId).emit('conversation_read', {
          conversationId: id,
          userId
        })
      }
    }

    res.json({ success: true, data: { message: '已标记为已读' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
