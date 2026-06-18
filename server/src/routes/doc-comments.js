import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

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

const extractMentions = (content) => {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const mentions = []
  let match
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      userId: match[2],
      nickname: match[1]
    })
  }
  return mentions
}

router.get('/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params
    const { blockId } = req.query
    const userId = req.user.userId

    const role = await getDocRole(userId, documentId)
    if (!canView(role)) {
      return res.status(403).json({ success: false, message: '无权访问此文档' })
    }

    const where = {
      documentId,
      parentId: null
    }

    if (blockId) {
      where.blockId = blockId
    }

    const comments = await prisma.docComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true }
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, nickname: true, avatar: true }
            },
            mentions: {
              include: {
                user: {
                  select: { id: true, nickname: true, avatar: true }
                }
              }
            },
            resolvedBy: {
              select: { id: true, nickname: true, avatar: true }
            }
          }
        },
        mentions: {
          include: {
            user: {
              select: { id: true, nickname: true, avatar: true }
            }
          }
        },
        resolvedBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    res.json({ success: true, data: comments })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:documentId', auth, async (req, res) => {
  try {
    const { documentId } = req.params
    const { content, blockId, blockText, parentId } = req.body
    const userId = req.user.userId

    const role = await getDocRole(userId, documentId)
    if (!canComment(role)) {
      return res.status(403).json({ success: false, message: '无权评论此文档' })
    }

    if (parentId) {
      const parentComment = await prisma.docComment.findUnique({
        where: { id: parentId }
      })
      if (!parentComment || parentComment.documentId !== documentId) {
        return res.status(400).json({ success: false, message: '无效的父评论' })
      }
    }

    const comment = await prisma.docComment.create({
      data: {
        documentId,
        userId,
        content,
        blockId: blockId || null,
        blockText: blockText || null,
        parentId: parentId || null
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true }
        },
        mentions: {
          include: {
            user: {
              select: { id: true, nickname: true, avatar: true }
            }
          }
        },
        resolvedBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    const mentions = extractMentions(content)
    for (const mention of mentions) {
      await prisma.docMention.create({
        data: {
          commentId: comment.id,
          userId: mention.userId
        }
      })
    }

    const io = req.app.get('io')
    if (io) {
      mentions.forEach(mention => {
        io.to(`user:${mention.userId}`).emit('doc:mention', {
          commentId: comment.id,
          documentId,
          content
        })
      })
    }

    const commentWithMentions = await prisma.docComment.findUnique({
      where: { id: comment.id },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true }
        },
        mentions: {
          include: {
            user: {
              select: { id: true, nickname: true, avatar: true }
            }
          }
        },
        resolvedBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    res.json({ success: true, data: commentWithMentions })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params
    const { content } = req.body
    const userId = req.user.userId

    const comment = await prisma.docComment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' })
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ success: false, message: '无权编辑此评论' })
    }

    const updatedComment = await prisma.docComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true }
        },
        mentions: {
          include: {
            user: {
              select: { id: true, nickname: true, avatar: true }
            }
          }
        },
        resolvedBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    res.json({ success: true, data: updatedComment })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params
    const userId = req.user.userId

    const comment = await prisma.docComment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' })
    }

    const role = await getDocRole(userId, comment.documentId)
    if (comment.userId !== userId && role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权删除此评论' })
    }

    await prisma.docComment.delete({ where: { id: commentId } })

    res.json({ success: true, data: { message: '评论已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:commentId/resolve', auth, async (req, res) => {
  try {
    const { commentId } = req.params
    const userId = req.user.userId

    const comment = await prisma.docComment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' })
    }

    const role = await getDocRole(userId, comment.documentId)
    if (!canComment(role)) {
      return res.status(403).json({ success: false, message: '无权操作' })
    }

    const updatedComment = await prisma.docComment.update({
      where: { id: commentId },
      data: {
        isResolved: true,
        resolvedById: userId,
        resolvedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true }
        },
        resolvedBy: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    res.json({ success: true, data: updatedComment })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:commentId/unresolve', auth, async (req, res) => {
  try {
    const { commentId } = req.params
    const userId = req.user.userId

    const comment = await prisma.docComment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' })
    }

    const role = await getDocRole(userId, comment.documentId)
    if (!canComment(role)) {
      return res.status(403).json({ success: false, message: '无权操作' })
    }

    const updatedComment = await prisma.docComment.update({
      where: { id: commentId },
      data: {
        isResolved: false,
        resolvedById: null,
        resolvedAt: null
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true }
        }
      }
    })

    res.json({ success: true, data: updatedComment })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
