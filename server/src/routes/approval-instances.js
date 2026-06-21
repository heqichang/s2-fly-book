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

const sendNotification = (io, onlineUsers, userId, event, data) => {
  const socketId = onlineUsers.get(userId)
  if (socketId) {
    io.to(socketId).emit(event, data)
  }
}

const createNotification = async (tx, userId, approvalInstanceId, approvalTaskId, notificationType, title, content) => {
  return tx.approvalNotification.create({
    data: {
      userId,
      approvalInstanceId,
      approvalTaskId,
      notificationType,
      title,
      content
    }
  })
}

const parseJsonField = (field) => {
  if (!field) return null
  try {
    return JSON.parse(field)
  } catch {
    return field
  }
}

const getNodeAssignees = (node, formData) => {
  const assigneeType = node.assigneeType
  const assigneeIds = parseJsonField(node.assigneeIds) || []

  if (assigneeType === 'field') {
    const fieldKey = node.assigneeFieldKey
    const value = formData[fieldKey]
    if (Array.isArray(value)) return value
    if (value) return [value]
    return []
  }

  return assigneeIds
}

const createTasksForNode = async (tx, approvalInstanceId, node, formData, existingTask = null) => {
  const assigneeIds = getNodeAssignees(node, formData)
  const tasks = []

  for (const assigneeId of assigneeIds) {
    const task = await tx.approvalTask.create({
      data: {
        approvalInstanceId,
        approvalNodeId: node.id,
        assigneeId,
        status: 'pending'
      },
      include: {
        assignee: { select: userSelect }
      }
    })
    tasks.push(task)
  }

  return tasks
}

const checkAndAdvanceFlow = async (tx, approvalInstanceId, io, onlineUsers) => {
  const instance = await tx.approvalInstance.findUnique({
    where: { id: approvalInstanceId },
    include: {
      currentNode: true,
      tasks: { include: { assignee: { select: userSelect } } },
      initiator: { select: userSelect }
    }
  })

  if (!instance || !instance.currentNode) return instance

  const node = instance.currentNode
  const nodeTasks = instance.tasks.filter(t => t.approvalNodeId === node.id)

  if (nodeTasks.length === 0) return instance

  const allCompleted = nodeTasks.every(t => t.status !== 'pending')
  const anyRejected = nodeTasks.some(t => t.status === 'rejected')
  const anyApproved = nodeTasks.some(t => t.status === 'approved')

  if (anyRejected) {
    return tx.approvalInstance.update({
      where: { id: approvalInstanceId },
      data: {
        status: 'rejected',
        completedAt: new Date(),
        currentNodeId: null
      },
      include: {
        initiator: { select: userSelect },
        currentNode: true
      }
    })
  }

  if (node.signType === 'or') {
    if (!anyApproved && !allCompleted) return instance
  } else {
    if (!allCompleted) return instance
  }

  const template = await tx.approvalTemplate.findUnique({
    where: { id: instance.approvalTemplateId },
    include: { nodes: { orderBy: { sortOrder: 'asc' } } }
  })

  const currentIndex = template.nodes.findIndex(n => n.id === node.id)
  const nextNode = template.nodes[currentIndex + 1]

  if (!nextNode) {
    const completedInstance = await tx.approvalInstance.update({
      where: { id: approvalInstanceId },
      data: {
        status: 'approved',
        completedAt: new Date(),
        currentNodeId: null
      },
      include: {
        initiator: { select: userSelect },
        currentNode: true
      }
    })

    await createNotification(
      tx,
      instance.initiatorId,
      approvalInstanceId,
      null,
      'approved',
      '审批已通过',
      `您发起的「${instance.title}」已审批通过`
    )

    sendNotification(io, onlineUsers, instance.initiatorId, 'approval_completed', {
      approvalInstanceId,
      status: 'approved',
      title: instance.title
    })

    return completedInstance
  }

  const formData = parseJsonField(instance.formData) || {}

  if (nextNode.nodeType === 'cc') {
    const ccUserIds = parseJsonField(nextNode.ccUserIds) || []
    for (const ccUserId of ccUserIds) {
      await tx.approvalCc.create({
        data: {
          approvalInstanceId,
          approvalNodeId: nextNode.id,
          ccUserId
        }
      })
      await createNotification(
        tx,
        ccUserId,
        approvalInstanceId,
        null,
        'cc',
        '审批抄送',
        `「${instance.title}」已抄送给您`
      )
      sendNotification(io, onlineUsers, ccUserId, 'approval_cc', {
        approvalInstanceId,
        title: instance.title
      })
    }

    return checkAndAdvanceFlow(tx, approvalInstanceId, io, onlineUsers)
  }

  if (nextNode.nodeType === 'auto') {
    await tx.approvalAction.create({
      data: {
        approvalInstanceId,
        actorId: instance.initiatorId,
        actionType: 'auto',
        actionStatus: nextNode.autoAction || 'approved',
        fromNodeId: node.id,
        toNodeId: nextNode.id
      }
    })

    const updatedInstance = await tx.approvalInstance.update({
      where: { id: approvalInstanceId },
      data: { currentNodeId: nextNode.id }
    })

    return checkAndAdvanceFlow(tx, approvalInstanceId, io, onlineUsers)
  }

  const updatedInstance = await tx.approvalInstance.update({
    where: { id: approvalInstanceId },
    data: { currentNodeId: nextNode.id }
  })

  const newTasks = await createTasksForNode(tx, approvalInstanceId, nextNode, formData)

  for (const task of newTasks) {
    await createNotification(
      tx,
      task.assigneeId,
      approvalInstanceId,
      task.id,
      'task',
      '待您审批',
      `您有新的审批任务：「${instance.title}」`
    )
    sendNotification(io, onlineUsers, task.assigneeId, 'approval_task_created', {
      approvalInstanceId,
      taskId: task.id,
      title: instance.title
    })
  }

  return updatedInstance
}

router.get('/pending', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page = 1, pageSize = 20, status } = req.query

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const where = {
      assigneeId: userId,
      status: status || 'pending'
    }

    const [tasks, total] = await Promise.all([
      prisma.approvalTask.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
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

    const data = tasks.map(task => ({
      id: task.approvalInstance.id,
      taskId: task.id,
      title: task.approvalInstance.title,
      status: task.approvalInstance.status,
      taskStatus: task.status,
      initiator: task.approvalInstance.initiator,
      formTemplate: task.approvalInstance.formTemplate,
      currentNode: task.approvalInstance.currentNode,
      assignedAt: task.assignedAt,
      deadlineAt: task.deadlineAt,
      createdAt: task.approvalInstance.createdAt
    }))

    res.json({ success: true, data: { list: data, items: data, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/initiated', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page = 1, pageSize = 20, status } = req.query

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const where = {
      initiatorId: userId
    }
    if (status) where.status = status

    const [instances, total] = await Promise.all([
      prisma.approvalInstance.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          initiator: { select: userSelect },
          formTemplate: { select: { id: true, name: true, icon: true } },
          currentNode: { select: { id: true, nodeName: true } }
        }
      }),
      prisma.approvalInstance.count({ where })
    ])

    res.json({ success: true, data: { list: instances, items: instances, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/submitted', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page = 1, pageSize = 20, status } = req.query

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const where = {
      initiatorId: userId
    }
    if (status) where.status = status

    const [instances, total] = await Promise.all([
      prisma.approvalInstance.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          initiator: { select: userSelect },
          formTemplate: { select: { id: true, name: true, icon: true } },
          currentNode: { select: { id: true, nodeName: true } }
        }
      }),
      prisma.approvalInstance.count({ where })
    ])

    res.json({ success: true, data: { list: instances, items: instances, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/approved', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page = 1, pageSize = 20, status } = req.query

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const taskWhere = {
      assigneeId: userId,
      NOT: { status: 'pending' }
    }

    const [tasks, total] = await Promise.all([
      prisma.approvalTask.findMany({
        where: taskWhere,
        skip,
        take,
        orderBy: { actedAt: 'desc' },
        include: {
          approvalInstance: {
            include: {
              initiator: { select: userSelect },
              formTemplate: { select: { id: true, name: true, icon: true } },
              currentNode: { select: { id: true, nodeName: true } }
            }
          }
        },
        distinct: ['approvalInstanceId']
      }),
      prisma.approvalTask.count({ where: taskWhere })
    ])

    const instances = tasks.map(task => ({
      ...task.approvalInstance,
      taskId: task.id,
      taskStatus: task.status,
      taskAction: task.action,
      taskComment: task.comment,
      actedAt: task.actedAt
    }))

    res.json({ success: true, data: { list: instances, items: instances, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/mine', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page = 1, pageSize = 20, status } = req.query

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const taskWhere = {
      assigneeId: userId,
      NOT: { status: 'pending' }
    }
    if (status) {
      taskWhere.status = status
    }

    const [tasks, total] = await Promise.all([
      prisma.approvalTask.findMany({
        where: taskWhere,
        skip,
        take,
        orderBy: { actedAt: 'desc' },
        include: {
          approvalInstance: {
            include: {
              initiator: { select: userSelect },
              formTemplate: { select: { id: true, name: true, icon: true } },
              currentNode: { select: { id: true, nodeName: true } }
            }
          }
        },
        distinct: ['approvalInstanceId']
      }),
      prisma.approvalTask.count({ where: taskWhere })
    ])

    const instances = tasks.map(task => ({
      ...task.approvalInstance,
      taskId: task.id,
      taskStatus: task.status,
      taskAction: task.action,
      taskComment: task.comment,
      actedAt: task.actedAt
    }))

    res.json({ success: true, data: { list: instances, items: instances, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/cc', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { page = 1, pageSize = 20 } = req.query

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const [ccRecords, total] = await Promise.all([
      prisma.approvalCc.findMany({
        where: { ccUserId: userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          approvalInstance: {
            include: {
              initiator: { select: userSelect },
              formTemplate: { select: { id: true, name: true, icon: true } },
              currentNode: { select: { id: true, nodeName: true } }
            }
          }
        }
      }),
      prisma.approvalCc.count({ where: { ccUserId: userId } })
    ])

    const data = ccRecords.map(cc => ({
      ...cc.approvalInstance,
      ccId: cc.id,
      readAt: cc.readAt
    }))

    res.json({ success: true, data: { list: data, items: data, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/all', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { teamId, page = 1, pageSize = 20, status } = req.query

    if (!teamId) {
      return res.status(400).json({ success: false, message: '请提供团队ID' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })

    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限查看团队所有审批' })
    }

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const where = { teamId }
    if (status) where.status = status

    const [instances, total] = await Promise.all([
      prisma.approvalInstance.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          initiator: { select: userSelect },
          formTemplate: { select: { id: true, name: true, icon: true } },
          currentNode: { select: { id: true, nodeName: true } }
        }
      }),
      prisma.approvalInstance.count({ where })
    ])

    res.json({ success: true, data: { list: instances, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const instance = await prisma.approvalInstance.findUnique({
      where: { id },
      include: {
        initiator: { select: userSelect },
        formTemplate: {
          include: {
            fields: { orderBy: { sortOrder: 'asc' } }
          }
        },
        approvalTemplate: {
          include: {
            nodes: { orderBy: { sortOrder: 'asc' } }
          }
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
          include: {
            actor: { select: userSelect }
          },
          orderBy: { createdAt: 'asc' }
        },
        comments: {
          include: {
            commenter: { select: userSelect },
            replies: {
              include: {
                commenter: { select: userSelect }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          where: { parentId: null },
          orderBy: { createdAt: 'asc' }
        },
        ccs: {
          include: {
            ccUser: { select: userSelect }
          }
        },
        team: { select: { id: true, name: true, logo: true } }
      }
    })

    if (!instance) {
      return res.status(404).json({ success: false, message: '审批实例不存在' })
    }

    const isInitiator = instance.initiatorId === userId
    const isInTask = instance.tasks.some(t => t.assigneeId === userId)
    const isCc = instance.ccs.some(c => c.ccUserId === userId)

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: instance.teamId, userId } }
    })

    const isTeamAdmin = teamMember && teamMember.role === 'admin'

    if (!isInitiator && !isInTask && !isCc && !isTeamAdmin) {
      return res.status(403).json({ success: false, message: '您没有权限查看此审批' })
    }

    const formData = parseJsonField(instance.formData) || {}

    const data = {
      ...instance,
      formData,
      isInitiator,
      isInTask,
      isCc,
      isTeamAdmin,
      myTask: instance.tasks.find(t => t.assigneeId === userId && t.status === 'pending')
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId
    const { approvalTemplateId, formTemplateId, teamId, formData, title, ccUserIds = [] } = req.body

    if (!approvalTemplateId || !formTemplateId || !teamId || !formData) {
      return res.status(400).json({ success: false, message: '请填写必要信息' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })

    if (!teamMember) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const approvalTemplate = await prisma.approvalTemplate.findUnique({
      where: { id: approvalTemplateId },
      include: { nodes: { orderBy: { sortOrder: 'asc' } } }
    })

    if (!approvalTemplate) {
      return res.status(404).json({ success: false, message: '审批模板不存在' })
    }

    if (approvalTemplate.teamId !== teamId) {
      return res.status(403).json({ success: false, message: '审批模板不属于该团队' })
    }

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const result = await prisma.$transaction(async (tx) => {
      const firstNode = approvalTemplate.nodes[0]

      const instance = await tx.approvalInstance.create({
        data: {
          approvalTemplateId,
          formTemplateId,
          teamId,
          initiatorId: userId,
          formData: JSON.stringify(formData),
          title: title || approvalTemplate.name,
          status: 'pending',
          currentNodeId: firstNode?.id || null,
          startedAt: new Date()
        },
        include: {
          initiator: { select: userSelect },
          formTemplate: { select: { id: true, name: true, icon: true } }
        }
      })

      for (const ccUserId of ccUserIds) {
        await tx.approvalCc.create({
          data: {
            approvalInstanceId: instance.id,
            ccUserId
          }
        })
        await createNotification(
          tx,
          ccUserId,
          instance.id,
          null,
          'cc',
          '审批抄送',
          `「${instance.title}」已抄送给您`
        )
      }

      if (firstNode && firstNode.nodeType !== 'cc' && firstNode.nodeType !== 'auto') {
        const tasks = await createTasksForNode(tx, instance.id, firstNode, formData)

        for (const task of tasks) {
          await createNotification(
            tx,
            task.assigneeId,
            instance.id,
            task.id,
            'task',
            '待您审批',
            `您有新的审批任务：「${instance.title}」`
          )
        }
      }

      await tx.approvalAction.create({
        data: {
          approvalInstanceId: instance.id,
          actorId: userId,
          actionType: 'submit',
          actionStatus: 'submitted'
        }
      })

      return instance
    })

    for (const ccUserId of ccUserIds) {
      sendNotification(io, onlineUsers, ccUserId, 'approval_cc', {
        approvalInstanceId: result.id,
        title: result.title
      })
    }

    const firstNode = approvalTemplate.nodes[0]
    if (firstNode && firstNode.nodeType !== 'cc' && firstNode.nodeType !== 'auto') {
      const assigneeIds = getNodeAssignees(firstNode, formData)
      for (const assigneeId of assigneeIds) {
        sendNotification(io, onlineUsers, assigneeId, 'approval_task_created', {
          approvalInstanceId: result.id,
          title: result.title
        })
      }
    }

    if (firstNode && (firstNode.nodeType === 'cc' || firstNode.nodeType === 'auto')) {
      await prisma.$transaction(async (tx) => {
        await checkAndAdvanceFlow(tx, result.id, io, onlineUsers)
      })
    }

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { comment, taskId } = req.body

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const result = await prisma.$transaction(async (tx) => {
      const instance = await tx.approvalInstance.findUnique({
        where: { id },
        include: {
          currentNode: true,
          tasks: true,
          initiator: { select: userSelect }
        }
      })

      if (!instance) {
        throw new Error('审批实例不存在')
      }

      if (instance.status !== 'pending') {
        throw new Error('该审批已结束')
      }

      const task = taskId
        ? instance.tasks.find(t => t.id === taskId)
        : instance.tasks.find(t => t.assigneeId === userId && t.status === 'pending' && t.approvalNodeId === instance.currentNodeId)

      if (!task) {
        throw new Error('您没有待处理的审批任务')
      }

      if (task.assigneeId !== userId) {
        throw new Error('您无权处理此任务')
      }

      await tx.approvalTask.update({
        where: { id: task.id },
        data: {
          status: 'approved',
          action: 'approve',
          comment,
          actedAt: new Date()
        }
      })

      await tx.approvalAction.create({
        data: {
          approvalInstanceId: id,
          actorId: userId,
          actionType: 'approve',
          actionStatus: 'approved',
          comment,
          fromNodeId: instance.currentNodeId
        }
      })

      const advancedInstance = await checkAndAdvanceFlow(tx, id, io, onlineUsers)

      return advancedInstance
    })

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { comment, taskId } = req.body

    if (!comment) {
      return res.status(400).json({ success: false, message: '请填写拒绝原因' })
    }

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const result = await prisma.$transaction(async (tx) => {
      const instance = await tx.approvalInstance.findUnique({
        where: { id },
        include: {
          currentNode: true,
          tasks: true,
          initiator: { select: userSelect }
        }
      })

      if (!instance) {
        throw new Error('审批实例不存在')
      }

      if (instance.status !== 'pending') {
        throw new Error('该审批已结束')
      }

      const task = taskId
        ? instance.tasks.find(t => t.id === taskId)
        : instance.tasks.find(t => t.assigneeId === userId && t.status === 'pending' && t.approvalNodeId === instance.currentNodeId)

      if (!task) {
        throw new Error('您没有待处理的审批任务')
      }

      if (task.assigneeId !== userId) {
        throw new Error('您无权处理此任务')
      }

      await tx.approvalTask.update({
        where: { id: task.id },
        data: {
          status: 'rejected',
          action: 'reject',
          comment,
          actedAt: new Date()
        }
      })

      const otherTasks = instance.tasks.filter(
        t => t.id !== task.id && t.approvalNodeId === instance.currentNodeId && t.status === 'pending'
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
          approvalInstanceId: id,
          actorId: userId,
          actionType: 'reject',
          actionStatus: 'rejected',
          comment,
          fromNodeId: instance.currentNodeId
        }
      })

      const rejectedInstance = await tx.approvalInstance.update({
        where: { id },
        data: {
          status: 'rejected',
          completedAt: new Date(),
          currentNodeId: null
        }
      })

      await createNotification(
        tx,
        instance.initiatorId,
        id,
        null,
        'rejected',
        '审批已拒绝',
        `您发起的「${instance.title}」已被拒绝`
      )

      return rejectedInstance
    })

    const instance = await prisma.approvalInstance.findUnique({
      where: { id },
      include: { initiator: { select: userSelect } }
    })

    sendNotification(io, onlineUsers, instance.initiatorId, 'approval_completed', {
      approvalInstanceId: id,
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
    const { targetUserId, comment, taskId } = req.body

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '请选择转交对象' })
    }

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const result = await prisma.$transaction(async (tx) => {
      const instance = await tx.approvalInstance.findUnique({
        where: { id },
        include: {
          currentNode: true,
          tasks: true
        }
      })

      if (!instance) {
        throw new Error('审批实例不存在')
      }

      if (instance.status !== 'pending') {
        throw new Error('该审批已结束')
      }

      const task = taskId
        ? instance.tasks.find(t => t.id === taskId)
        : instance.tasks.find(t => t.assigneeId === userId && t.status === 'pending' && t.approvalNodeId === instance.currentNodeId)

      if (!task) {
        throw new Error('您没有待处理的审批任务')
      }

      if (task.assigneeId !== userId) {
        throw new Error('您无权处理此任务')
      }

      await tx.approvalTask.update({
        where: { id: task.id },
        data: {
          status: 'transferred',
          action: 'transfer',
          comment,
          actedAt: new Date()
        }
      })

      const newTask = await tx.approvalTask.create({
        data: {
          approvalInstanceId: id,
          approvalNodeId: task.approvalNodeId,
          assigneeId: targetUserId,
          status: 'pending'
        },
        include: {
          assignee: { select: userSelect }
        }
      })

      await tx.approvalAction.create({
        data: {
          approvalInstanceId: id,
          actorId: userId,
          actionType: 'transfer',
          actionStatus: 'transferred',
          comment,
          fromNodeId: instance.currentNodeId,
          targetUserId
        }
      })

      await createNotification(
        tx,
        targetUserId,
        id,
        newTask.id,
        'task',
        '待您审批（转交）',
        `您有新的审批任务（转交）：「${instance.title}」`
      )

      return newTask
    })

    sendNotification(io, onlineUsers, targetUserId, 'approval_task_created', {
      approvalInstanceId: id,
      taskId: result.id,
      title: result.approvalInstance?.title || '审批任务'
    })

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/addSign', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { targetUserIds, signType = 'before', comment, taskId } = req.body

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择加签人员' })
    }

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const result = await prisma.$transaction(async (tx) => {
      const instance = await tx.approvalInstance.findUnique({
        where: { id },
        include: {
          currentNode: true,
          tasks: true
        }
      })

      if (!instance) {
        throw new Error('审批实例不存在')
      }

      if (instance.status !== 'pending') {
        throw new Error('该审批已结束')
      }

      const task = taskId
        ? instance.tasks.find(t => t.id === taskId)
        : instance.tasks.find(t => t.assigneeId === userId && t.status === 'pending' && t.approvalNodeId === instance.currentNodeId)

      if (!task) {
        throw new Error('您没有待处理的审批任务')
      }

      if (task.assigneeId !== userId) {
        throw new Error('您无权处理此任务')
      }

      const newTasks = []
      for (const targetUserId of targetUserIds) {
        const newTask = await tx.approvalTask.create({
          data: {
            approvalInstanceId: id,
            approvalNodeId: task.approvalNodeId,
            assigneeId: targetUserId,
            status: 'pending'
          },
          include: {
            assignee: { select: userSelect }
          }
        })
        newTasks.push(newTask)

        await createNotification(
          tx,
          targetUserId,
          id,
          newTask.id,
          'task',
          '待您审批（加签）',
          `您有新的审批任务（加签）：「${instance.title}」`
        )
      }

      await tx.approvalAction.create({
        data: {
          approvalInstanceId: id,
          actorId: userId,
          actionType: 'addSign',
          actionStatus: 'added',
          comment,
          fromNodeId: instance.currentNodeId,
          extraData: JSON.stringify({ signType, targetUserIds })
        }
      })

      if (signType === 'before') {
        await tx.approvalTask.update({
          where: { id: task.id },
          data: {
            status: 'pending'
          }
        })
      } else {
        await tx.approvalTask.update({
          where: { id: task.id },
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
        approvalInstanceId: id,
        title: '审批任务（加签）'
      })
    }

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/withdraw', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { comment } = req.body

    const io = req.app.get('io')
    const onlineUsers = req.app.get('onlineUsers')

    const result = await prisma.$transaction(async (tx) => {
      const instance = await tx.approvalInstance.findUnique({
        where: { id },
        include: {
          tasks: true
        }
      })

      if (!instance) {
        throw new Error('审批实例不存在')
      }

      if (instance.initiatorId !== userId) {
        throw new Error('只有发起人可以撤回审批')
      }

      if (instance.status !== 'pending') {
        throw new Error('该审批已结束，无法撤回')
      }

      const pendingTasks = instance.tasks.filter(t => t.status === 'pending')
      for (const task of pendingTasks) {
        await tx.approvalTask.update({
          where: { id: task.id },
          data: {
            status: 'cancelled',
            action: 'withdrawn',
            actedAt: new Date()
          }
        })
      }

      await tx.approvalAction.create({
        data: {
          approvalInstanceId: id,
          actorId: userId,
          actionType: 'withdraw',
          actionStatus: 'withdrawn',
          comment
        }
      })

      const withdrawnInstance = await tx.approvalInstance.update({
        where: { id },
        data: {
          status: 'withdrawn',
          completedAt: new Date(),
          currentNodeId: null
        }
      })

      for (const task of pendingTasks) {
        await createNotification(
          tx,
          task.assigneeId,
          id,
          task.id,
          'withdrawn',
          '审批已撤回',
          `「${instance.title}」已被发起人撤回`
        )
      }

      return withdrawnInstance
    })

    const instance = await prisma.approvalInstance.findUnique({
      where: { id },
      include: { tasks: { where: { status: 'pending' } } }
    })

    for (const task of instance.tasks) {
      sendNotification(io, onlineUsers, task.assigneeId, 'approval_withdrawn', {
        approvalInstanceId: id,
        title: instance.title
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

    const result = await prisma.$transaction(async (tx) => {
      const instance = await tx.approvalInstance.findUnique({
        where: { id },
        include: {
          currentNode: true,
          tasks: true,
          initiator: { select: userSelect }
        }
      })

      if (!instance) {
        throw new Error('审批实例不存在')
      }

      if (instance.initiatorId !== userId) {
        throw new Error('只有发起人可以催办')
      }

      if (instance.status !== 'pending') {
        throw new Error('该审批已结束')
      }

      const pendingTasks = instance.tasks.filter(
        t => t.status === 'pending' && t.approvalNodeId === instance.currentNodeId
      )

      if (pendingTasks.length === 0) {
        throw new Error('当前没有待处理的审批人')
      }

      await tx.approvalAction.create({
        data: {
          approvalInstanceId: id,
          actorId: userId,
          actionType: 'urge',
          actionStatus: 'urged',
          comment,
          fromNodeId: instance.currentNodeId
        }
      })

      for (const task of pendingTasks) {
        await createNotification(
          tx,
          task.assigneeId,
          id,
          task.id,
          'urge',
          '审批催办',
          `发起人催办了「${instance.title}」，请尽快处理`
        )
      }

      return { urgedCount: pendingTasks.length }
    })

    const instance = await prisma.approvalInstance.findUnique({
      where: { id },
      include: {
        currentNode: true,
        tasks: { where: { status: 'pending' } }
      }
    })

    for (const task of instance.tasks) {
      if (task.approvalNodeId === instance.currentNodeId) {
        sendNotification(io, onlineUsers, task.assigneeId, 'approval_urged', {
          approvalInstanceId: id,
          title: instance.title
        })
      }
    }

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { content, parentId } = req.body

    if (!content) {
      return res.status(400).json({ success: false, message: '请输入评论内容' })
    }

    const instance = await prisma.approvalInstance.findUnique({
      where: { id }
    })

    if (!instance) {
      return res.status(404).json({ success: false, message: '审批实例不存在' })
    }

    const isInitiator = instance.initiatorId === userId
    const isInTask = await prisma.approvalTask.findFirst({
      where: { approvalInstanceId: id, assigneeId: userId }
    })
    const isCc = await prisma.approvalCc.findUnique({
      where: { approvalInstanceId_ccUserId: { approvalInstanceId: id, ccUserId: userId } }
    })

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: instance.teamId, userId } }
    })

    if (!isInitiator && !isInTask && !isCc && !(teamMember && teamMember.role === 'admin')) {
      return res.status(403).json({ success: false, message: '您没有权限评论此审批' })
    }

    const comment = await prisma.approvalComment.create({
      data: {
        approvalInstanceId: id,
        commenterId: userId,
        content,
        parentId
      },
      include: {
        commenter: { select: userSelect },
        parent: parentId ? {
          include: {
            commenter: { select: userSelect }
          }
        } : undefined
      }
    })

    res.json({ success: true, data: comment })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/tasks', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const instance = await prisma.approvalInstance.findUnique({
      where: { id }
    })

    if (!instance) {
      return res.status(404).json({ success: false, message: '审批实例不存在' })
    }

    const isInitiator = instance.initiatorId === userId
    const isInTask = await prisma.approvalTask.findFirst({
      where: { approvalInstanceId: id, assigneeId: userId }
    })
    const isCc = await prisma.approvalCc.findUnique({
      where: { approvalInstanceId_ccUserId: { approvalInstanceId: id, ccUserId: userId } }
    })

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: instance.teamId, userId } }
    })

    if (!isInitiator && !isInTask && !isCc && !(teamMember && teamMember.role === 'admin')) {
      return res.status(403).json({ success: false, message: '您没有权限查看此审批' })
    }

    const tasks = await prisma.approvalTask.findMany({
      where: { approvalInstanceId: id },
      include: {
        assignee: { select: userSelect },
        approvalNode: { select: { id: true, nodeName: true, nodeType: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json({ success: true, data: tasks })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/actions', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const instance = await prisma.approvalInstance.findUnique({
      where: { id }
    })

    if (!instance) {
      return res.status(404).json({ success: false, message: '审批实例不存在' })
    }

    const isInitiator = instance.initiatorId === userId
    const isInTask = await prisma.approvalTask.findFirst({
      where: { approvalInstanceId: id, assigneeId: userId }
    })
    const isCc = await prisma.approvalCc.findUnique({
      where: { approvalInstanceId_ccUserId: { approvalInstanceId: id, ccUserId: userId } }
    })

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: instance.teamId, userId } }
    })

    if (!isInitiator && !isInTask && !isCc && !(teamMember && teamMember.role === 'admin')) {
      return res.status(403).json({ success: false, message: '您没有权限查看此审批' })
    }

    const actions = await prisma.approvalAction.findMany({
      where: { approvalInstanceId: id },
      include: {
        actor: { select: userSelect }
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json({ success: true, data: actions })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/comments', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const instance = await prisma.approvalInstance.findUnique({
      where: { id }
    })

    if (!instance) {
      return res.status(404).json({ success: false, message: '审批实例不存在' })
    }

    const isInitiator = instance.initiatorId === userId
    const isInTask = await prisma.approvalTask.findFirst({
      where: { approvalInstanceId: id, assigneeId: userId }
    })
    const isCc = await prisma.approvalCc.findUnique({
      where: { approvalInstanceId_ccUserId: { approvalInstanceId: id, ccUserId: userId } }
    })

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: instance.teamId, userId } }
    })

    if (!isInitiator && !isInTask && !isCc && !(teamMember && teamMember.role === 'admin')) {
      return res.status(403).json({ success: false, message: '您没有权限查看此审批' })
    }

    const comments = await prisma.approvalComment.findMany({
      where: { approvalInstanceId: id, parentId: null },
      include: {
        commenter: { select: userSelect },
        replies: {
          include: {
            commenter: { select: userSelect }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json({ success: true, data: comments })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/timeline', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const instance = await prisma.approvalInstance.findUnique({
      where: { id }
    })

    if (!instance) {
      return res.status(404).json({ success: false, message: '审批实例不存在' })
    }

    const isInitiator = instance.initiatorId === userId
    const isInTask = await prisma.approvalTask.findFirst({
      where: { approvalInstanceId: id, assigneeId: userId }
    })
    const isCc = await prisma.approvalCc.findUnique({
      where: { approvalInstanceId_ccUserId: { approvalInstanceId: id, ccUserId: userId } }
    })

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: instance.teamId, userId } }
    })

    if (!isInitiator && !isInTask && !isCc && !(teamMember && teamMember.role === 'admin')) {
      return res.status(403).json({ success: false, message: '您没有权限查看此审批' })
    }

    const actions = await prisma.approvalAction.findMany({
      where: { approvalInstanceId: id },
      include: {
        actor: { select: userSelect }
      },
      orderBy: { createdAt: 'asc' }
    })

    const data = actions.map(action => ({
      id: action.id,
      type: action.actionType,
      status: action.actionStatus,
      comment: action.comment,
      actor: action.actor,
      fromNodeId: action.fromNodeId,
      toNodeId: action.toNodeId,
      targetUserId: action.targetUserId,
      extraData: parseJsonField(action.extraData),
      createdAt: action.createdAt
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
