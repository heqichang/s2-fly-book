import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

const checkTeamMember = async (userId, teamId) => {
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId
      }
    }
  })
  return !!member
}

const getDocRole = async (userId, documentId) => {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      permissions: {
        where: { userId }
      },
      shares: true
    }
  })

  if (!doc) return null

  if (doc.createdById === userId) return 'admin'

  const permission = doc.permissions[0]
  if (permission) return permission.role

  const share = doc.shares[0]
  if (share && share.shareType === 'team' && share.teamRole) {
    const isTeamMember = await checkTeamMember(userId, doc.teamId)
    if (isTeamMember) return share.teamRole
  }

  if (share && share.linkEnabled && share.linkRole) {
    return share.linkRole
  }

  return null
}

const canView = (role) => {
  return ['viewer', 'commenter', 'editor', 'admin'].includes(role)
}

const canAdmin = (role) => {
  return role === 'admin'
}

// ============= 文档权限 API =============

router.get('/permissions/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params
    const userId = req.user.userId

    const role = await getDocRole(userId, documentId)
    if (!canAdmin(role)) {
      return res.status(403).json({ success: false, message: '无权查看权限' })
    }

    const permissions = await prisma.docPermission.findMany({
      where: { documentId },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json({ success: true, data: permissions })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/permissions/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params
    const { userId: targetUserId, role } = req.body
    const userId = req.user.userId

    const currentRole = await getDocRole(userId, documentId)
    if (!canAdmin(currentRole)) {
      return res.status(403).json({ success: false, message: '无权管理权限' })
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (!doc) {
      const isTeamMember = await checkTeamMember(targetUserId, doc.teamId)
      if (!isTeamMember) {
        return res.status(400).json({ success: false, message: '该用户不在团队中' })
      }
    }

    const permission = await prisma.docPermission.upsert({
      where: {
        documentId_userId: {
          documentId,
          userId: targetUserId
        }
      },
      update: { role },
      create: {
        documentId,
        userId: targetUserId,
        role
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    res.json({ success: true, data: permission })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/permissions/:documentId/:userId', auth, async (req, res) => {
  try {
    const { documentId, userId: targetUserId } = req.params
    const userId = req.user.userId

    const currentRole = await getDocRole(userId, documentId)
    if (!canAdmin(currentRole)) {
      return res.status(403).json({ success: false, message: '无权管理权限' })
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (doc && doc.createdById === targetUserId) {
      return res.status(400).json({ success: false, message: '不能移除文档创建者' })
    }

    await prisma.docPermission.delete({
      where: {
        documentId_userId: {
          documentId,
          userId: targetUserId
        }
      }
    })

    res.json({ success: true, data: { message: '权限已移除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= 文档分享 API =============

router.get('/share/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params
    const userId = req.user.userId

    const role = await getDocRole(userId, documentId)
    if (!canView(role)) {
      return res.status(403).json({ success: false, message: '无权访问此文档' })
    }

    const share = await prisma.docShare.findUnique({
      where: { documentId }
    })

    const isAdmin = canAdmin(role)

    res.json({
      success: true,
      data: {
        ...share,
        canManage: isAdmin
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/share/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params
    const { shareType, teamRole, linkEnabled, linkRole } = req.body
    const userId = req.user.userId

    const role = await getDocRole(userId, documentId)
    if (!canAdmin(role)) {
      return res.status(403).json({ success: false, message: '无权管理分享' })
    }

    const share = await prisma.docShare.findUnique({
      where: { documentId }
    })

    let linkToken = share?.linkToken

    if (linkEnabled && !linkToken) {
      linkToken = uuidv4()
    }

    const updatedShare = await prisma.docShare.update({
      where: { documentId },
      data: {
        shareType: shareType || share.shareType,
        teamRole: teamRole !== undefined ? teamRole : share.teamRole,
        linkEnabled: linkEnabled !== undefined ? linkEnabled : share.linkEnabled,
        linkRole: linkRole !== undefined ? linkRole : share.linkRole,
        linkToken
      }
    })

    res.json({ success: true, data: updatedShare })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/share/link/:token', async (req, res) => {
  try {
    const { token } = req.params

    const share = await prisma.docShare.findUnique({
      where: { linkToken: token }
    })

    if (!share || !share.linkEnabled) {
      return res.status(404).json({ success: false, message: '链接无效或已关闭' })
    }

    const doc = await prisma.document.findUnique({
      where: {
        id: share.documentId,
        isDeleted: false
      },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' })
    }

    res.json({
      success: true,
      data: {
        document: {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        createdBy: doc.createdBy
        },
        role: share.linkRole
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
