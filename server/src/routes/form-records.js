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

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const record = await prisma.formRecord.findUnique({
      where: { id },
      include: {
        formTemplate: {
          include: {
            fields: true
          }
        },
        submitter: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            email: true
          }
        }
      }
    })

    if (!record) {
      return res.status(404).json({ success: false, message: '表单记录不存在' })
    }

    const isMember = await checkTeamMember(userId, record.teamId)
    if (!isMember) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    res.json({ success: true, data: record })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const record = await prisma.formRecord.findUnique({
      where: { id }
    })

    if (!record) {
      return res.status(404).json({ success: false, message: '表单记录不存在' })
    }

    const isMember = await checkTeamMember(userId, record.teamId)
    if (!isMember) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    await prisma.formRecord.delete({
      where: { id }
    })

    res.json({ success: true, data: { message: '表单记录已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
