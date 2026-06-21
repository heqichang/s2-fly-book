import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

const userSelect = {
  id: true,
  nickname: true,
  avatar: true,
  email: true
}

const getTaskWithInstance = async (task) => {
  const instance = await prisma.approvalInstance.findUnique({
    where: { id: task.approvalInstanceId },
    include: {
      initiator: { select: userSelect },
      formTemplate: { select: { id: true, name: true, icon: true } },
      currentNode: { select: { id: true, nodeName: true } }
    }
  })

  return {
    ...task,
    approvalInstance: instance
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { status = 'pending', page = 1, pageSize = 20 } = req.query

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const where = {
      assigneeId: userId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const [tasks, total] = await Promise.all([
      prisma.approvalTask.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: userSelect },
          approvalNode: { select: { id: true, nodeName: true, nodeType: true } },
          approvalInstance: {
            include: {
              initiator: { select: userSelect },
              formTemplate: { select: { id: true, name: true, icon: true } },
              currentNode: { select: { id: true, nodeName: true } }
            }
          }
        }
      }),
      prisma.approvalTask.count({ where })
    ])

    res.json({
      success: true,
      data: {
        items: tasks,
        list: tasks,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const task = await prisma.approvalTask.findUnique({
      where: { id },
      include: {
        assignee: { select: userSelect },
        approvalNode: { select: { id: true, nodeName: true, nodeType: true } },
        approvalInstance: {
          include: {
            initiator: { select: userSelect },
            formTemplate: {
              include: { fields: { orderBy: { sortOrder: 'asc' } } }
            },
            approvalTemplate: {
              include: { nodes: { orderBy: { sortOrder: 'asc' } } }
            },
            currentNode: true,
            tasks: {
              include: {
                assignee: { select: userSelect },
                approvalNode: { select: { id: true, nodeName: true, nodeType: true } }
              },
              orderBy: { createdAt: 'asc' }
            },
            actions: {
              include: { actor: { select: userSelect } },
              orderBy: { createdAt: 'asc' }
            },
            comments: {
              include: {
                commenter: { select: userSelect },
                replies: {
                  include: { commenter: { select: userSelect } },
                  orderBy: { createdAt: 'asc' }
                }
              },
              where: { parentId: null },
              orderBy: { createdAt: 'asc' }
            },
            ccs: { include: { ccUser: { select: userSelect } } }
          }
        }
      }
    })

    if (!task) {
      return res.status(404).json({ success: false, message: '审批任务不存在' })
    }

    if (task.assigneeId !== userId) {
      const instance = task.approvalInstance
      const isInitiator = instance.initiatorId === userId
      const isCc = instance.ccs.some(c => c.ccUserId === userId)
      if (!isInitiator && !isCc) {
        return res.status(403).json({ success: false, message: '您没有权限查看此任务' })
      }
    }

    res.json({ success: true, data: task })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { comment } = req.body

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const task = await prisma.approvalTask.findUnique({
      where: { id },
      include: { approvalInstance: true, approvalNode: true }
    })

    if (!task) {
      return res.status(404).json({ success: false, message: '审批任务不存在' })
    }

    if (task.assigneeId !== userId) {
      return res.status(403).json({ success: false, message: '您无权处理此任务' })
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该任务已处理' })
    }

    const approvalInstanceId = task.approvalInstanceId

    const result = await prisma.$transaction(async (tx) => {
      await tx.approvalTask.update({
        where: { id },
        data: {
          status: 'approved',
          action: 'approve',
          comment,
          actedAt: new Date()
        }
      })

      await tx.approvalAction.create({
        data: {
          approvalInstanceId,
          actorId: userId,
          actionType: 'approve',
          actionStatus: 'approved',
          comment,
          fromNodeId: task.approvalNodeId
        }
      })

      const instance = await tx.approvalInstance.findUnique({
        where: { id: approvalInstanceId },
        include: {
          currentNode: true,
          tasks: true,
          initiator: { select: userSelect }
        }
      })

      const node = instance.currentNode
      const nodeTasks = instance.tasks.filter(t => t.approvalNodeId === node.id)
      const allCompleted = nodeTasks.every(t => t.status !== 'pending')
      const anyApproved = nodeTasks.some(t => t.status === 'approved')

      let shouldAdvance = false
      if (node.signType === 'or') {
        shouldAdvance = anyApproved
      } else {
        shouldAdvance = allCompleted
      }

      if (shouldAdvance) {
        const template = await tx.approvalTemplate.findUnique({
          where: { id: instance.approvalTemplateId },
          include: { nodes: { orderBy: { sortOrder: 'asc' } } }
        })

        const currentIndex = template.nodes.findIndex(n => n.id === node.id)
        const nextNode = template.nodes[currentIndex + 1]

        if (!nextNode) {
          return tx.approvalInstance.update({
            where: { id: approvalInstanceId },
            data: {
              status: 'approved',
              completedAt: new Date(),
              currentNodeId: null
            },
            include: { initiator: { select: userSelect } }
          })
        }

        if (nextNode.nodeType === 'cc') {
          const ccUserIds = JSON.parse(nextNode.ccUserIds || '[]')
          for (const ccUserId of ccUserIds) {
            await tx.approvalCc.create({
              data: {
                approvalInstanceId,
                approvalNodeId: nextNode.id,
                ccUserId
              }
            })
            await tx.approvalNotification.create({
              data: {
                userId: ccUserId,
                approvalInstanceId,
                notificationType: 'cc',
                title: '审批抄送',
                content: `「${instance.title}」已抄送给您`
              }
            })
          }
        } else if (nextNode.nodeType !== 'auto') {
          const assigneeIds = JSON.parse(nextNode.assigneeIds || '[]')
          for (const assigneeId of assigneeIds) {
            const newTask = await tx.approvalTask.create({
              data: {
                approvalInstanceId,
                approvalNodeId: nextNode.id,
                assigneeId,
                status: 'pending'
              }
            })
            await tx.approvalNotification.create({
              data: {
                userId: assigneeId,
                approvalInstanceId,
                approvalTaskId: newTask.id,
                notificationType: 'task',
                title: '待您审批',
                content: `您有新的审批任务：「${instance.title}」`
              }
            })
          }
        }

        return tx.approvalInstance.update({
          where: { id: approvalInstanceId },
          data: { currentNodeId: nextNode.id },
          include: { initiator: { select: userSelect } }
        })
      }

      return instance
    })

    if (result.status === 'approved' || result.currentNodeId !== task.approvalNodeId) {
      const initiatorId = result.initiatorId || result.initiator?.id
      if (initiatorId) {
        sendNotification(io, onlineUsers, initiatorId, 'approval_completed', {
          approvalInstanceId,
          status: result.status,
          title: result.title
        })
      }
    }

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { comment } = req.body

    if (!comment) {
      return res.status(400).json({ success: false, message: '请填写拒绝原因' })
    }

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const task = await prisma.approvalTask.findUnique({
      where: { id },
      include: { approvalInstance: true, approvalNode: true }
    })

    if (!task) {
      return res.status(404).json({ success: false, message: '审批任务不存在' })
    }

    if (task.assigneeId !== userId) {
      return res.status(403).json({ success: false, message: '您无权处理此任务' })
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该任务已处理' })
    }

    const approvalInstanceId = task.approvalInstanceId

    const result = await prisma.$transaction(async (tx) => {
      await tx.approvalTask.update({
        where: { id },
        data: {
          status: 'rejected',
          action: 'reject',
          comment,
          actedAt: new Date()
        }
      })

      const instance = await tx.approvalInstance.findUnique({
        where: { id: approvalInstanceId },
        include: { tasks: true, currentNode: true }
      })

      const otherTasks = instance.tasks.filter(
        t => t.id !== id && t.approvalNodeId === instance.currentNodeId && t.status === 'pending'
      )
      for (const t of otherTasks) {
        await tx.approvalTask.update({
          where: { id: t.id },
          data: {
            status: 'cancelled',
            action: 'cancelled',
            actedAt: new Date()
          }
        })
      }

      await tx.approvalAction.create({
        data: {
          approvalInstanceId,
          actorId: userId,
          actionType: 'reject',
          actionStatus: 'rejected',
          comment,
          fromNodeId: task.approvalNodeId
        }
      })

      const rejectedInstance = await tx.approvalInstance.update({
        where: { id: approvalInstanceId },
        data: {
          status: 'rejected',
          completedAt: new Date(),
          currentNodeId: null
        },
        include: { initiator: { select: userSelect } }
      })

      await tx.approvalNotification.create({
        data: {
          userId: instance.initiatorId,
          approvalInstanceId,
          notificationType: 'rejected',
          title: '审批已拒绝',
          content: `您发起的「${instance.title}」已被拒绝`
        }
      })

      return rejectedInstance
    })

    const instance = await prisma.approvalInstance.findUnique({
      where: { id: approvalInstanceId },
      include: { initiator: { select: userSelect } }
    })

    sendNotification(io, onlineUsers, instance.initiatorId, 'approval_completed', {
      approvalInstanceId,
      status: 'rejected',
      title: instance.title
    })

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/transfer', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { targetUserId, comment } = req.body

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '请选择转交对象' })
    }

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const task = await prisma.approvalTask.findUnique({
      where: { id },
      include: { approvalInstance: true, approvalNode: true }
    })

    if (!task) {
      return res.status(404).json({ success: false, message: '审批任务不存在' })
    }

    if (task.assigneeId !== userId) {
      return res.status(403).json({ success: false, message: '您无权处理此任务' })
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该任务已处理' })
    }

    const approvalInstanceId = task.approvalInstanceId

    const result = await prisma.$transaction(async (tx) => {
      await tx.approvalTask.update({
        where: { id },
        data: {
          status: 'transferred',
          action: 'transfer',
          comment,
          actedAt: new Date()
        }
      })

      const newTask = await tx.approvalTask.create({
        data: {
          approvalInstanceId,
          approvalNodeId: task.approvalNodeId,
          assigneeId: targetUserId,
          status: 'pending'
        },
        include: { assignee: { select: userSelect } }
      })

      await tx.approvalAction.create({
        data: {
          approvalInstanceId,
          actorId: userId,
          actionType: 'transfer',
          actionStatus: 'transferred',
          comment,
          fromNodeId: task.approvalNodeId,
          targetUserId
        }
      })

      await tx.approvalNotification.create({
        data: {
          userId: targetUserId,
          approvalInstanceId,
          approvalTaskId: newTask.id,
          notificationType: 'task',
          title: '待您审批（转交）',
          content: `您有新的审批任务（转交）：「${task.approvalInstance.title}」`
        }
      })

      return newTask
    })

    sendNotification(io, onlineUsers, targetUserId, 'approval_task_created', {
      approvalInstanceId,
      taskId: result.id,
      title: '审批任务（转交）'
    })

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/add-sign', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { targetUserIds, signType = 'before', comment } = req.body

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择加签人员' })
    }

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const task = await prisma.approvalTask.findUnique({
      where: { id },
      include: { approvalInstance: true, approvalNode: true }
    })

    if (!task) {
      return res.status(404).json({ success: false, message: '审批任务不存在' })
    }

    if (task.assigneeId !== userId) {
      return res.status(403).json({ success: false, message: '您无权处理此任务' })
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该任务已处理' })
    }

    const approvalInstanceId = task.approvalInstanceId

    const result = await prisma.$transaction(async (tx) => {
      const newTasks = []
      for (const targetUserId of targetUserIds) {
        const newTask = await tx.approvalTask.create({
          data: {
            approvalInstanceId,
            approvalNodeId: task.approvalNodeId,
            assigneeId: targetUserId,
            status: 'pending'
          },
          include: { assignee: { select: userSelect } }
        })
        newTasks.push(newTask)

        await tx.approvalNotification.create({
          data: {
            userId: targetUserId,
            approvalInstanceId,
            approvalTaskId: newTask.id,
            notificationType: 'task',
            title: '待您审批（加签）',
            content: `您有新的审批任务（加签）：「${task.approvalInstance.title}」`
          }
        })
      }

      await tx.approvalAction.create({
        data: {
          approvalInstanceId,
          actorId: userId,
          actionType: 'addSign',
          actionStatus: 'added',
          comment,
          fromNodeId: task.approvalNodeId,
          extraData: JSON.stringify({ signType, targetUserIds })
        }
      })

      if (signType === 'after') {
        await tx.approvalTask.update({
          where: { id },
          data: {
            status: 'approved',
            action: 'addSign_after',
            comment,
            actedAt: new Date()
          }
        })
      }

      return newTasks
    })

    for (const targetUserId of targetUserIds) {
      sendNotification(io, onlineUsers, targetUserId, 'approval_task_created', {
        approvalInstanceId,
        title: '审批任务（加签）'
      })
    }

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/urge', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { comment } = req.body

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const task = await prisma.approvalTask.findUnique({
      where: { id },
      include: { approvalInstance: true }
    })

    if (!task) {
      return res.status(404).json({ success: false, message: '审批任务不存在' })
    }

    const instance = task.approvalInstance
    if (instance.initiatorId !== userId) {
      return res.status(403).json({ success: false, message: '只有发起人可以催办' })
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该任务已处理' })
    }

    const approvalInstanceId = task.approvalInstanceId

    await prisma.$transaction(async (tx) => {
      await tx.approvalAction.create({
        data: {
          approvalInstanceId,
          actorId: userId,
          actionType: 'urge',
          actionStatus: 'urged',
          comment,
          fromNodeId: task.approvalNodeId
        }
      })

      await tx.approvalNotification.create({
        data: {
          userId: task.assigneeId,
          approvalInstanceId,
          approvalTaskId: id,
          notificationType: 'urge',
          title: '审批催办',
          content: `发起人催办了「${instance.title}」，请尽快处理`
        }
      })
    })

    sendNotification(io, onlineUsers, task.assigneeId, 'approval_urged', {
      approvalInstanceId,
      taskId: id,
      title: instance.title
    })

    res.json({ success: true, data: { message: '催办成功' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

const sendNotification = (io, onlineUsers, userId, event, data) => {
  const socketId = onlineUsers?.get(userId)
  if (socketId) {
    io.to(socketId).emit(event, data)
  }
}

export default router
