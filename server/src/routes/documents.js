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

  return null
}

const canView = (role) => {
  return ['viewer', 'commenter', 'editor', 'admin'].includes(role)
}

const canComment = (role) => {
  return ['commenter', 'editor', 'admin'].includes(role)
}

const canEdit = (role) => {
  return ['editor', 'admin'].includes(role)
}

const canAdmin = (role) => {
  return role === 'admin'
}

// ============= 文件夹相关 API =============

router.get('/folders/:teamId', auth, async (req, res) => {
  try {
    const { teamId } = req.params
    const { parentId } = req.query
    const userId = req.user.userId

    if (!await checkTeamMember(userId, teamId)) {
      return res.status(403).json({ success: false, message: '无权访问该团队' })
    }

    const folders = await prisma.docFolder.findMany({
      where: {
        teamId,
        parentId: parentId || null
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        _count: {
          select: { children: true, documents: true }
        }
      }
    })

    res.json({ success: true, data: folders })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/folders', auth, async (req, res) => {
  try {
    const { teamId, name, parentId } = req.body
    const userId = req.user.userId

    if (!await checkTeamMember(userId, teamId)) {
      return res.status(403).json({ success: false, message: '无权访问该团队' })
    }

    const folder = await prisma.docFolder.create({
      data: {
        teamId,
        name,
        parentId: parentId || null,
        createdById: userId
      },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    res.json({ success: true, data: folder })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/folders/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, parentId } = req.body
    const userId = req.user.userId

    const folder = await prisma.docFolder.findUnique({
      where: { id }
    })

    if (!folder) {
      return res.status(404).json({ success: false, message: '文件夹不存在' })
    }

    if (!await checkTeamMember(userId, folder.teamId)) {
      return res.status(403).json({ success: false, message: '无权操作' })
    }

    if (parentId && parentId !== 'root') {
      const parentFolder = await prisma.docFolder.findUnique({
        where: { id: parentId }
      })
      if (!parentFolder || parentFolder.teamId !== folder.teamId) {
        return res.status(400).json({ success: false, message: '无效的目标文件夹' })
      }
    }

    const updatedFolder = await prisma.docFolder.update({
      where: { id },
      data: {
        name,
        parentId: parentId === 'root' ? null : parentId
      },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    res.json({ success: true, data: updatedFolder })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/folders/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const folder = await prisma.docFolder.findUnique({
      where: { id }
    })

    if (!folder) {
      return res.status(404).json({ success: false, message: '文件夹不存在' })
    }

    if (!await checkTeamMember(userId, folder.teamId)) {
      return res.status(403).json({ success: false, message: '无权操作' })
    }

    await prisma.docFolder.delete({ where: { id } })

    res.json({ success: true, data: { message: '文件夹已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= 文档相关 API =============

router.get('/team/:teamId', auth, async (req, res) => {
  try {
    const { teamId } = req.params
    const { folderId } = req.query
    const userId = req.user.userId

    if (!await checkTeamMember(userId, teamId)) {
      return res.status(403).json({ success: false, message: '无权访问该团队' })
    }

    const documents = await prisma.document.findMany({
      where: {
        teamId,
        folderId: folderId || null,
        isDeleted: false
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        updatedBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        favorites: {
          where: { userId },
          select: { id: true }
        }
      }
    })

    const docsWithFavorites = documents.map(doc => ({
      ...doc,
      isFavorite: doc.favorites.length > 0,
      favorites: undefined
    }))

    res.json({ success: true, data: docsWithFavorites })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const doc = await prisma.document.findUnique({
      where: { id, isDeleted: false },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        updatedBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        folder: {
          select: { id: true, name: true, parentId: true }
        },
        favorites: {
          where: { userId },
          select: { id: true }
        }
      }
    })

    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' })
    }

    const role = await getDocRole(userId, id)
    if (!canView(role)) {
      return res.status(403).json({ success: false, message: '无权访问此文档' })
    }

    await prisma.docRecent.upsert({
      where: {
        userId_documentId: {
          userId,
          documentId: id
        }
      },
      update: { openedAt: new Date() },
      create: {
        userId,
        documentId: id
      }
    })

    res.json({
      success: true,
      data: {
        ...doc,
        isFavorite: doc.favorites.length > 0,
        role,
        favorites: undefined
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { teamId, folderId, title, template } = req.body
    const userId = req.user.userId

    if (!await checkTeamMember(userId, teamId)) {
      return res.status(403).json({ success: false, message: '无权访问该团队' })
    }

    const defaultContent = template || JSON.stringify([
      { id: uuidv4(), type: 'heading', level: 1, content: title || '未命名文档' },
      { id: uuidv4(), type: 'paragraph', content: '' }
    ])

    const doc = await prisma.document.create({
      data: {
        teamId,
        folderId: folderId || null,
        title: title || '未命名文档',
        content: defaultContent,
        createdById: userId,
        updatedById: userId
      },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        updatedBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    await prisma.docPermission.create({
      data: {
        documentId: doc.id,
        userId,
        role: 'admin'
      }
    })

    await prisma.docShare.create({
      data: {
        documentId: doc.id,
        shareType: 'private'
      }
    })

    res.json({ success: true, data: doc })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, folderId } = req.body
    const userId = req.user.userId

    const role = await getDocRole(userId, id)
    if (!canEdit(role)) {
      return res.status(403).json({ success: false, message: '无权编辑此文档' })
    }

    const updateData = { updatedById: userId }
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (folderId !== undefined) updateData.folderId = folderId === 'root' ? null : folderId

    const doc = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        updatedBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    res.json({ success: true, data: doc })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const role = await getDocRole(userId, id)
    if (!canAdmin(role)) {
      return res.status(403).json({ success: false, message: '无权删除此文档' })
    }

    await prisma.document.update({
      where: { id },
      data: { isDeleted: true }
    })

    res.json({ success: true, data: { message: '文档已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/move', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { folderId } = req.body
    const userId = req.user.userId

    const role = await getDocRole(userId, id)
    if (!canEdit(role)) {
      return res.status(403).json({ success: false, message: '无权操作此文档' })
    }

    const doc = await prisma.document.update({
      where: { id },
      data: {
        folderId: folderId === 'root' ? null : folderId,
        updatedById: userId
      }
    })

    res.json({ success: true, data: doc })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/rename', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { title } = req.body
    const userId = req.user.userId

    const role = await getDocRole(userId, id)
    if (!canEdit(role)) {
      return res.status(403).json({ success: false, message: '无权操作此文档' })
    }

    const doc = await prisma.document.update({
      where: { id },
      data: {
        title,
        updatedById: userId
      }
    })

    res.json({ success: true, data: doc })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= 最近打开文档 =============

router.get('/recent/list', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { limit = 20 } = req.query

    const recents = await prisma.docRecent.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
      take: parseInt(limit),
      include: {
        document: {
          where: { isDeleted: false },
          include: {
            createdBy: {
              select: { id: true, nickname: true, avatar: true }
            }
          }
        }
      }
    })

    const validRecents = recents
      .filter(r => r.document)
      .map(r => ({
        id: r.id,
        openedAt: r.openedAt,
        document: r.document
      }))

    res.json({ success: true, data: validRecents })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============= 收藏文档 =============

router.get('/favorites/list', auth, async (req, res) => {
  try {
    const userId = req.user.userId

    const favorites = await prisma.docFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        document: {
          where: { isDeleted: false },
          include: {
            createdBy: {
              select: { id: true, nickname: true, avatar: true }
            }
          }
        }
      }
    })

    const validFavorites = favorites
      .filter(f => f.document)
      .map(f => ({
        id: f.id,
        createdAt: f.createdAt,
        document: f.document
      }))

    res.json({ success: true, data: validFavorites })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const doc = await prisma.document.findUnique({
      where: { id, isDeleted: false }
    })

    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' })
    }

    const role = await getDocRole(userId, id)
    if (!canView(role)) {
      return res.status(403).json({ success: false, message: '无权访问此文档' })
    }

    const existing = await prisma.docFavorite.findUnique({
      where: {
        userId_documentId: {
          userId,
          documentId: id
        }
      }
    })

    if (existing) {
      await prisma.docFavorite.delete({
        where: { id: existing.id }
      })
      res.json({ success: true, data: { isFavorite: false } })
    } else {
      await prisma.docFavorite.create({
        data: {
          userId,
          documentId: id
        }
      })
      res.json({ success: true, data: { isFavorite: true } })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
