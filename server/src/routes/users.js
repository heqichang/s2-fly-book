import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

router.put('/profile', auth, async (req, res) => {
  try {
    const { nickname, avatar } = req.body

    if (!nickname && avatar === undefined) {
      return res.status(400).json({ success: false, message: '请提供要修改的信息' })
    }

    const data = {}
    if (nickname) data.nickname = nickname
    if (avatar !== undefined) data.avatar = avatar

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/search', auth, async (req, res) => {
  try {
    const { email } = req.query

    if (!email) {
      return res.status(400).json({ success: false, message: '请提供搜索关键词' })
    }

    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: email
        },
        NOT: {
          id: req.user.userId
        }
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        status: true
      },
      take: 20
    })

    res.json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
