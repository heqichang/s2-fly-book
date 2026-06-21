import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page = 1, pageSize = 20, status, notificationType } = req.query

    const pageNum = parseInt(page) || 1
    const sizeNum = parseInt(pageSize) || 20
    const skip = (pageNum - 1) * sizeNum

    const where = { userId }

    if (status === 'read') {
      where.isRead = true
    } else if (status === 'unread') {
      where.isRead = false
    }

    if (notificationType) {
      where.notificationType = notificationType
    }

    const [notifications, total] = await Promise.all([
      prisma.approvalNotification.findMany({
        where,
        include: {
          approvalInstance: {
            include: {
              initiator: {
                select: {
                  id: true,
                  nickname: true,
                  avatar: true
                }
              }
            }
          },
          approvalTask: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: sizeNum
      }),
      prisma.approvalNotification.count({ where })
    ])

    const data = notifications.map(n => ({
      id: n.id,
      notificationType: n.notificationType,
      title: n.title,
      content: n.content,
      isRead: n.isRead,
      readAt: n.readAt,
      createdAt: n.createdAt,
      approvalInstanceId: n.approvalInstanceId,
      approvalTaskId: n.approvalTaskId,
      approvalInstance: {
        id: n.approvalInstance.id,
        title: n.approvalInstance.title,
        status: n.approvalInstance.status,
        initiator: n.approvalInstance.initiator
      },
      approvalTask: n.approvalTask ? {
        id: n.approvalTask.id,
        status: n.approvalTask.status
      } : null
    }))

    res.json({
      success: true,
      data: {
        list: data,
        total,
        page: pageNum,
        pageSize: sizeNum,
        totalPages: Math.ceil(total / sizeNum)
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.userId

    const count = await prisma.approvalNotification.count({
      where: {
        userId,
        isRead: false
      }
    })

    res.json({ success: true, data: { count } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const notification = await prisma.approvalNotification.findUnique({
      where: { id },
      include: {
        approvalInstance: {
          include: {
            initiator: {
              select: { id: true, nickname: true, avatar: true }
            }
          }
        },
        approvalTask: true
      }
    })

    if (!notification) {
      return res.status(404).json({ success: false, message: '通知不存在' })
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ success: false, message: '您没有权限查看此通知' })
    }

    res.json({ success: true, data: notification })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const notification = await prisma.approvalNotification.findUnique({
      where: { id }
    })

    if (!notification) {
      return res.status(404).json({ success: false, message: '通知不存在' })
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ success: false, message: '您没有权限操作此通知' })
    }

    const updated = await prisma.approvalNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

router.put('/:id/read', auth, markNotificationRead)
router.post('/:id/read', auth, markNotificationRead)

const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.userId

    const result = await prisma.approvalNotification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    res.json({ success: true, data: { updatedCount: result.count } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

router.put('/read-all', auth, markAllNotificationsRead)
router.post('/read-all', auth, markAllNotificationsRead)

router.delete('/all', auth, async (req, res) => {
  try {
    const userId = req.user.userId

    const result = await prisma.approvalNotification.deleteMany({
      where: { userId }
    })

    res.json({ success: true, data: { deletedCount: result.count } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const notification = await prisma.approvalNotification.findUnique({
      where: { id }
    })

    if (!notification) {
      return res.status(404).json({ success: false, message: '通知不存在' })
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ success: false, message: '您没有权限删除此通知' })
    }

    await prisma.approvalNotification.delete({
      where: { id }
    })

    res.json({ success: true, data: { message: '通知已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
