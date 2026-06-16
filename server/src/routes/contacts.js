import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/', auth, async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: req.user.userId },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            nickname: true,
            avatar: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const data = contacts.map(c => ({
      id: c.id,
      contactId: c.contactId,
      remark: c.remark,
      createdAt: c.createdAt,
      user: c.contact
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/requests', auth, async (req, res) => {
  try {
    const { toId } = req.body
    const fromId = req.user.userId

    if (!toId) {
      return res.status(400).json({ success: false, message: '请提供对方用户ID' })
    }

    if (toId === fromId) {
      return res.status(400).json({ success: false, message: '不能添加自己为好友' })
    }

    const toUser = await prisma.user.findUnique({ where: { id: toId } })
    if (!toUser) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const existingContact = await prisma.contact.findUnique({
      where: { userId_contactId: { userId: fromId, contactId: toId } }
    })
    if (existingContact) {
      return res.status(400).json({ success: false, message: '对方已是您的好友' })
    }

    const existingRequest = await prisma.friendRequest.findUnique({
      where: { fromId_toId: { fromId, toId } }
    })
    if (existingRequest && existingRequest.status === 'pending') {
      return res.status(400).json({ success: false, message: '已发送过好友申请，请等待对方处理' })
    }

    if (existingRequest) {
      const request = await prisma.friendRequest.update({
        where: { id: existingRequest.id },
        data: { status: 'pending' }
      })
      return res.json({ success: true, data: request })
    }

    const request = await prisma.friendRequest.create({
      data: { fromId, toId }
    })

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const socketId = onlineUsers.get(toId)
    if (socketId) {
      io.to(socketId).emit('friend_request_received', {
        ...request,
        from: {
          id: (await prisma.user.findUnique({
            where: { id: fromId },
            select: { id: true, nickname: true, avatar: true, email: true }
          }))
        }
      })
    }

    res.json({ success: true, data: request })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { toId: req.user.userId },
      include: {
        from: {
          select: {
            id: true,
            email: true,
            nickname: true,
            avatar: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, data: requests })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/requests/sent', auth, async (req, res) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { fromId: req.user.userId },
      include: {
        to: {
          select: {
            id: true,
            email: true,
            nickname: true,
            avatar: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, data: requests })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/requests/:id/accept', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const request = await prisma.friendRequest.findUnique({
      where: { id }
    })

    if (!request) {
      return res.status(404).json({ success: false, message: '好友申请不存在' })
    }

    if (request.toId !== userId) {
      return res.status(403).json({ success: false, message: '无权处理此申请' })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该申请已被处理' })
    }

    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id },
        data: { status: 'accepted' }
      }),
      prisma.contact.create({
        data: { userId, contactId: request.fromId }
      }),
      prisma.contact.create({
        data: { userId: request.fromId, contactId: userId }
      })
    ])

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')
    const fromSocketId = onlineUsers.get(request.fromId)
    if (fromSocketId) {
      io.to(fromSocketId).emit('friend_request_accepted', { requestId: id })
    }

    res.json({ success: true, data: { message: '已同意好友申请' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/requests/:id/reject', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const request = await prisma.friendRequest.findUnique({
      where: { id }
    })

    if (!request) {
      return res.status(404).json({ success: false, message: '好友申请不存在' })
    }

    if (request.toId !== userId) {
      return res.status(403).json({ success: false, message: '无权处理此申请' })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该申请已被处理' })
    }

    await prisma.friendRequest.update({
      where: { id },
      data: { status: 'rejected' }
    })

    res.json({ success: true, data: { message: '已拒绝好友申请' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:contactId', auth, async (req, res) => {
  try {
    const { contactId } = req.params
    const userId = req.user.userId

    await prisma.$transaction([
      prisma.contact.deleteMany({
        where: {
          OR: [
            { userId, contactId },
            { userId: contactId, contactId: userId }
          ]
        }
      })
    ])

    res.json({ success: true, data: { message: '已删除联系人' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
