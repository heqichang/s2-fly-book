import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId

    const teamMembers = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                email: true
              }
            },
            _count: {
              select: {
                members: true,
                departments: true
              }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    })

    const data = teamMembers.map(tm => ({
      id: tm.team.id,
      name: tm.team.name,
      logo: tm.team.logo,
      description: tm.team.description,
      ownerId: tm.team.ownerId,
      owner: tm.team.owner,
      role: tm.role,
      memberCount: tm.team._count.members,
      departmentCount: tm.team._count.departments,
      joinedAt: tm.joinedAt,
      createdAt: tm.team.createdAt
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { name, logo, description } = req.body
    const userId = req.user.userId

    if (!name) {
      return res.status(400).json({ success: false, message: '请提供团队名称' })
    }

    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name,
          logo,
          description,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: 'admin'
            }
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
              email: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true,
                  email: true
                }
              }
            }
          }
        }
      })

      return newTeam
    })

    const data = {
      id: team.id,
      name: team.name,
      logo: team.logo,
      description: team.description,
      ownerId: team.ownerId,
      owner: team.owner,
      role: 'admin',
      memberCount: team.members.length,
      departmentCount: 0,
      createdAt: team.createdAt
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId
        }
      }
    })

    if (!teamMember) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                email: true,
                phone: true,
                status: true
              }
            }
          }
        },
        departments: {
          include: {
            _count: {
              select: {
                members: true,
                children: true
              }
            }
          }
        }
      }
    })

    if (!team) {
      return res.status(404).json({ success: false, message: '团队不存在' })
    }

    const data = {
      id: team.id,
      name: team.name,
      logo: team.logo,
      description: team.description,
      ownerId: team.ownerId,
      owner: team.owner,
      role: teamMember.role,
      members: team.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user
      })),
      departments: team.departments,
      memberCount: team.members.length,
      departmentCount: team.departments.length,
      createdAt: team.createdAt
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, logo, description } = req.body
    const userId = req.user.userId

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId
        }
      }
    })

    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限修改团队信息' })
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        name: name || undefined,
        logo: logo !== undefined ? logo : undefined,
        description: description !== undefined ? description : undefined
      },
      include: {
        owner: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true
          }
        }
      }
    })

    res.json({ success: true, data: team })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/join', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) {
      return res.status(404).json({ success: false, message: '团队不存在' })
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId
        }
      }
    })

    if (existingMember) {
      return res.status(400).json({ success: false, message: '您已经是该团队成员' })
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId,
        role: 'member'
      },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                email: true
              }
            },
            _count: {
              select: {
                members: true
              }
            }
          }
        }
      }
    })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const ownerSocketId = onlineUsers.get(team.ownerId)
    if (ownerSocketId) {
      io.to(ownerSocketId).emit('team_member_joined', {
        teamId: id,
        member: {
          id: member.id,
          userId,
          role: member.role,
          joinedAt: member.joinedAt
        }
      })
    }

    const data = {
      id: member.team.id,
      name: member.team.name,
      logo: member.team.logo,
      description: member.team.description,
      ownerId: member.team.ownerId,
      owner: member.team.owner,
      role: member.role,
      memberCount: member.team._count.members,
      joinedAt: member.joinedAt,
      createdAt: member.team.createdAt
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId
        }
      }
    })

    if (!teamMember) {
      return res.status(400).json({ success: false, message: '您不是该团队成员' })
    }

    const team = await prisma.team.findUnique({ where: { id } })
    if (team.ownerId === userId) {
      return res.status(400).json({ success: false, message: '团队所有者不能退出团队，请先转让所有权' })
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId: id,
          userId
        }
      }
    })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const ownerSocketId = onlineUsers.get(team.ownerId)
    if (ownerSocketId) {
      io.to(ownerSocketId).emit('team_member_left', {
        teamId: id,
        userId
      })
    }

    res.json({ success: true, data: { message: '已退出团队' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/members', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId
        }
      }
    })

    if (!teamMember) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true,
            phone: true,
            status: true
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    })

    const data = members.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id/members/:memberId/role', auth, async (req, res) => {
  try {
    const { id, memberId } = req.params
    const { role } = req.body
    const userId = req.user.userId

    if (role !== 'admin' && role !== 'member') {
      return res.status(400).json({ success: false, message: '无效的角色' })
    }

    const currentMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId
        }
      }
    })

    if (!currentMember || currentMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限修改成员角色' })
    }

    const targetMember = await prisma.teamMember.findUnique({
      where: { id: memberId }
    })

    if (!targetMember) {
      return res.status(404).json({ success: false, message: '成员不存在' })
    }

    const team = await prisma.team.findUnique({ where: { id } })
    if (team.ownerId === targetMember.userId) {
      return res.status(400).json({ success: false, message: '不能修改团队所有者的角色' })
    }

    const updatedMember = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true
          }
        }
      }
    })

    res.json({ success: true, data: updatedMember })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const { id, memberId } = req.params
    const userId = req.user.userId

    const currentMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId
        }
      }
    })

    if (!currentMember || currentMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限移除成员' })
    }

    const targetMember = await prisma.teamMember.findUnique({
      where: { id: memberId }
    })

    if (!targetMember) {
      return res.status(404).json({ success: false, message: '成员不存在' })
    }

    const team = await prisma.team.findUnique({ where: { id } })
    if (team.ownerId === targetMember.userId) {
      return res.status(400).json({ success: false, message: '不能移除团队所有者' })
    }

    await prisma.teamMember.delete({ where: { id: memberId } })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const targetSocketId = onlineUsers.get(targetMember.userId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('team_removed', { teamId: id })
    }

    res.json({ success: true, data: { message: '已移除成员' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) {
      return res.status(404).json({ success: false, message: '团队不存在' })
    }

    if (team.ownerId !== userId) {
      return res.status(403).json({ success: false, message: '您没有权限删除团队' })
    }

    await prisma.team.delete({ where: { id } })

    res.json({ success: true, data: { message: '团队已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
