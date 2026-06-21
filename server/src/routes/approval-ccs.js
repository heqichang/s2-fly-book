import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

router.post('/:ccId/read', auth, async (req, res) => {
  try {
    const { ccId } = req.params
    const userId = req.user.userId

    const cc = await prisma.approvalCc.findUnique({
      where: { id: ccId }
    })

    if (!cc) {
      return res.status(404).json({ success: false, message: '抄送记录不存在' })
    }

    if (cc.ccUserId !== userId) {
      return res.status(403).json({ success: false, message: '您没有权限操作此抄送' })
    }

    const updated = await prisma.approvalCc.update({
      where: { id: ccId },
      data: { readAt: new Date() }
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
