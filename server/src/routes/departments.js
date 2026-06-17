import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/team/:teamId', auth, async (req, res) => {
  try {
    const { teamId } = req.params
    const userId = req.user.userId

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      }
    })

    if (!teamMember) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const departments = await prisma.department.findMany({
      where: {
        teamId,
        parentId: null
      },
      include: {
        _count: {
          select: {
            members: true,
            children: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const buildTree = async (depts) => {
      const result = []
      for (const dept of depts) {
        const children = await prisma.department.findMany({
          where: { parentId: dept.id },
          include: {
            _count: {
              select: {
                members: true,
                children: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        })

        result.push({
          id: dept.id,
          teamId: dept.teamId,
          name: dept.name,
          parentId: dept.parentId,
          description: dept.description,
          memberCount: dept._count.members,
          childrenCount: dept._count.children,
          children: await buildTree(children),
          createdAt: dept.createdAt
        })
      }
      return result
    }

    const data = await buildTree(departments)

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/tree', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({ success: false, message: '部门不存在' })
    }

    if (department.team.members.length === 0) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const buildTree = async (deptId) => {
      const dept = await prisma.department.findUnique({
        where: { id: deptId },
        include: {
          _count: {
            select: {
              members: true,
              children: true
            }
          }
        }
      })

      if (!dept) return null

      const children = await prisma.department.findMany({
        where: { parentId: deptId },
        orderBy: { createdAt: 'asc' }
      })

      const childTrees = []
      for (const child of children) {
        const childTree = await buildTree(child.id)
        if (childTree) childTrees.push(childTree)
      }

      return {
        id: dept.id,
        teamId: dept.teamId,
        name: dept.name,
        parentId: dept.parentId,
        description: dept.description,
        memberCount: dept._count.members,
        childrenCount: dept._count.children,
        children: childTrees,
        createdAt: dept.createdAt
      }
    }

    const data = await buildTree(id)

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        },
        parent: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            members: true,
            children: true
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({ success: false, message: '部门不存在' })
    }

    if (department.team.members.length === 0) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const data = {
      id: department.id,
      teamId: department.teamId,
      name: department.name,
      parentId: department.parentId,
      parent: department.parent,
      description: department.description,
      memberCount: department._count.members,
      childrenCount: department._count.children,
      createdAt: department.createdAt
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/team/:teamId', auth, async (req, res) => {
  try {
    const { teamId } = req.params
    const { name, parentId, description } = req.body
    const userId = req.user.userId

    if (!name) {
      return res.status(400).json({ success: false, message: '请提供部门名称' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      }
    })

    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限创建部门' })
    }

    if (parentId) {
      const parentDept = await prisma.department.findUnique({
        where: { id: parentId }
      })
      if (!parentDept || parentDept.teamId !== teamId) {
        return res.status(400).json({ success: false, message: '无效的上级部门' })
      }
    }

    const department = await prisma.department.create({
      data: {
        teamId,
        name,
        parentId,
        description
      }
    })

    res.json({ success: true, data: department })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, parentId } = req.body
    const userId = req.user.userId

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({ success: false, message: '部门不存在' })
    }

    const teamMember = department.team.members[0]
    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限修改部门' })
    }

    if (parentId && parentId !== department.parentId) {
      const parentDept = await prisma.department.findUnique({
        where: { id: parentId }
      })
      if (!parentDept || parentDept.teamId !== department.teamId) {
        return res.status(400).json({ success: false, message: '无效的上级部门' })
      }

      const checkCycle = async (childId, parentToCheck) => {
        if (childId === parentToCheck) return true
        const children = await prisma.department.findMany({
          where: { parentId: childId }
        })
        for (const child of children) {
          if (await checkCycle(child.id, parentToCheck)) return true
        }
        return false
      }
      if (await checkCycle(id, parentId)) {
        return res.status(400).json({ success: false, message: '不能将部门移动到其子部门下' })
      }
    }

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        parentId: parentId !== undefined ? parentId : undefined
      }
    })

    res.json({ success: true, data: updatedDepartment })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({ success: false, message: '部门不存在' })
    }

    const teamMember = department.team.members[0]
    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限删除部门' })
    }

    const children = await prisma.department.findMany({
      where: { parentId: id }
    })
    if (children.length > 0) {
      return res.status(400).json({ success: false, message: '请先删除子部门' })
    }

    await prisma.department.delete({ where: { id } })

    res.json({ success: true, data: { message: '部门已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/members', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({ success: false, message: '部门不存在' })
    }

    if (department.team.members.length === 0) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const members = await prisma.departmentMember.findMany({
      where: { departmentId: id },
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
      position: m.position,
      phone: m.phone,
      email: m.email,
      joinedAt: m.joinedAt,
      user: m.user
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/members', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { userId: targetUserId, position, phone, email } = req.body
    const userId = req.user.userId

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '请提供用户ID' })
    }

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({ success: false, message: '部门不存在' })
    }

    const teamMember = department.team.members[0]
    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限添加部门成员' })
    }

    const targetTeamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: department.teamId,
          userId: targetUserId
        }
      }
    })

    if (!targetTeamMember) {
      await prisma.teamMember.create({
        data: {
          teamId: department.teamId,
          userId: targetUserId,
          role: 'member'
        }
      })

      const io = req.app.get('io')
      const onlineUsers = req.app.get('onlineUsers')
      const socketId = onlineUsers.get(targetUserId)
      if (socketId) {
        io.to(socketId).emit('team_joined', {
          teamId: department.teamId,
          team: {
            id: department.team.id,
            name: department.team.name,
            logo: department.team.logo,
            description: department.team.description
          }
        })
      }
    }

    const existingMember = await prisma.departmentMember.findUnique({
      where: {
        departmentId_userId: {
          departmentId: id,
          userId: targetUserId
        }
      }
    })

    if (existingMember) {
      return res.status(400).json({ success: false, message: '用户已是该部门成员' })
    }

    const member = await prisma.departmentMember.create({
      data: {
        departmentId: id,
        userId: targetUserId,
        position,
        phone,
        email
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true,
            phone: true
          }
        }
      }
    })

    res.json({ success: true, data: member })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const { id, memberId } = req.params
    const { position, phone, email } = req.body
    const userId = req.user.userId

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({ success: false, message: '部门不存在' })
    }

    const teamMember = department.team.members[0]
    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限修改部门成员' })
    }

    const member = await prisma.departmentMember.findUnique({
      where: { id: memberId }
    })

    if (!member || member.departmentId !== id) {
      return res.status(404).json({ success: false, message: '成员不存在' })
    }

    const updatedMember = await prisma.departmentMember.update({
      where: { id: memberId },
      data: {
        position: position !== undefined ? position : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true,
            phone: true
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

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!department) {
      return res.status(404).json({ success: false, message: '部门不存在' })
    }

    const teamMember = department.team.members[0]
    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限移除部门成员' })
    }

    const member = await prisma.departmentMember.findUnique({
      where: { id: memberId }
    })

    if (!member || member.departmentId !== id) {
      return res.status(404).json({ success: false, message: '成员不存在' })
    }

    await prisma.departmentMember.delete({ where: { id: memberId } })

    res.json({ success: true, data: { message: '已移除部门成员' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/team/:teamId/contacts', auth, async (req, res) => {
  try {
    const { teamId } = req.params
    const userId = req.user.userId

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      }
    })

    if (!teamMember) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const departments = await prisma.department.findMany({
      where: { teamId },
      include: {
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
        _count: {
          select: {
            children: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const departmentMap = new Map()
    departments.forEach(d => departmentMap.set(d.id, d))

    const buildTree = (parentId) => {
      const result = []
      departments
        .filter(d => d.parentId === parentId)
        .forEach(d => {
          result.push({
            id: d.id,
            name: d.name,
            description: d.description,
            childrenCount: d._count.children,
            members: d.members.map(m => ({
              id: m.id,
              userId: m.userId,
              position: m.position,
              phone: m.phone,
              email: m.email,
              joinedAt: m.joinedAt,
              user: m.user
            })),
            children: buildTree(d.id)
          })
        })
      return result
    }

    const data = buildTree(null)

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
