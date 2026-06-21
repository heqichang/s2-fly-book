import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

const parseJsonField = (value) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const serializeNode = (node) => ({
  id: node.id,
  approvalTemplateId: node.approvalTemplateId,
  parentNodeId: node.parentNodeId,
  nodeType: node.nodeType,
  nodeName: node.nodeName,
  sortOrder: node.sortOrder,
  assigneeType: node.assigneeType,
  assigneeIds: parseJsonField(node.assigneeIds),
  assigneeFieldKey: node.assigneeFieldKey,
  signType: node.signType,
  conditionExpression: node.conditionExpression,
  autoAction: node.autoAction,
  ccUserIds: parseJsonField(node.ccUserIds),
  config: parseJsonField(node.config),
  createdAt: node.createdAt,
  updatedAt: node.updatedAt
})

const prepareNodeData = (data) => {
  const result = { ...data }
  if (result.assigneeIds !== undefined) {
    result.assigneeIds = Array.isArray(result.assigneeIds)
      ? JSON.stringify(result.assigneeIds)
      : result.assigneeIds
  }
  if (result.ccUserIds !== undefined) {
    result.ccUserIds = Array.isArray(result.ccUserIds)
      ? JSON.stringify(result.ccUserIds)
      : result.ccUserIds
  }
  if (result.config !== undefined) {
    result.config = typeof result.config === 'object' && result.config !== null
      ? JSON.stringify(result.config)
      : result.config
  }
  return result
}

router.get('/', auth, async (req, res) => {
  try {
    const { teamId, formTemplateId } = req.query
    const userId = req.user.userId

    if (!teamId && !formTemplateId) {
      return res.status(400).json({ success: false, message: '请提供团队ID或表单模板ID' })
    }

    let where = {}
    if (teamId) {
      where.teamId = teamId
    }
    if (formTemplateId) {
      where.formTemplateId = formTemplateId
    }

    if (teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } }
      })
      if (!teamMember) {
        return res.status(403).json({ success: false, message: '您不是该团队成员' })
      }
    } else if (formTemplateId) {
      const formTemplate = await prisma.formTemplate.findUnique({
        where: { id: formTemplateId },
        include: { team: true }
      })
      if (!formTemplate) {
        return res.status(404).json({ success: false, message: '表单模板不存在' })
      }
      const teamMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: formTemplate.teamId, userId } }
      })
      if (!teamMember) {
        return res.status(403).json({ success: false, message: '您不是该团队成员' })
      }
    }

    const templates = await prisma.approvalTemplate.findMany({
      where,
      include: {
        formTemplate: {
          select: { id: true, name: true, icon: true }
        },
        createdBy: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        _count: {
          select: {
            nodes: true,
            instances: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const data = templates.map(t => ({
      id: t.id,
      formTemplateId: t.formTemplateId,
      formTemplate: t.formTemplate,
      teamId: t.teamId,
      name: t.name,
      description: t.description,
      isEnabled: t.isEnabled,
      timeoutHours: t.timeoutHours,
      createdById: t.createdById,
      createdBy: t.createdBy,
      nodeCount: t._count.nodes,
      instanceCount: t._count.instances,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/form/:formTemplateId', auth, async (req, res) => {
  try {
    const { formTemplateId } = req.params
    const userId = req.user.userId

    const formTemplate = await prisma.formTemplate.findUnique({
      where: { id: formTemplateId },
      include: { team: true }
    })

    if (!formTemplate) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: formTemplate.teamId,
          userId
        }
      }
    })

    if (!teamMember) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const templates = await prisma.approvalTemplate.findMany({
      where: { formTemplateId },
      include: {
        createdBy: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        _count: {
          select: {
            nodes: true,
            instances: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const data = templates.map(t => ({
      id: t.id,
      formTemplateId: t.formTemplateId,
      teamId: t.teamId,
      name: t.name,
      description: t.description,
      isEnabled: t.isEnabled,
      timeoutHours: t.timeoutHours,
      createdById: t.createdById,
      createdBy: t.createdBy,
      nodeCount: t._count.nodes,
      instanceCount: t._count.instances,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: {
        formTemplate: true,
        team: true,
        createdBy: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        nodes: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!template) {
      return res.status(404).json({ success: false, message: '审批模板不存在' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: template.teamId,
          userId
        }
      }
    })

    if (!teamMember) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const data = {
      id: template.id,
      formTemplateId: template.formTemplateId,
      formTemplate: template.formTemplate
        ? {
            id: template.formTemplate.id,
            name: template.formTemplate.name
          }
        : null,
      teamId: template.teamId,
      name: template.name,
      description: template.description,
      isEnabled: template.isEnabled,
      timeoutHours: template.timeoutHours,
      createdById: template.createdById,
      createdBy: template.createdBy,
      nodes: template.nodes.map(serializeNode),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { formTemplateId, name, description, isEnabled, timeoutHours, nodes } = req.body
    const userId = req.user.userId

    if (!formTemplateId) {
      return res.status(400).json({ success: false, message: '请提供表单模板ID' })
    }

    if (!name) {
      return res.status(400).json({ success: false, message: '请提供审批模板名称' })
    }

    const formTemplate = await prisma.formTemplate.findUnique({
      where: { id: formTemplateId }
    })

    if (!formTemplate) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: formTemplate.teamId,
          userId
        }
      }
    })

    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限创建审批模板' })
    }

    const template = await prisma.$transaction(async (tx) => {
      const newTemplate = await tx.approvalTemplate.create({
        data: {
          formTemplateId,
          teamId: formTemplate.teamId,
          name,
          description,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
          timeoutHours,
          createdById: userId,
          updatedById: userId,
          nodes: nodes && Array.isArray(nodes) && nodes.length > 0
            ? {
                create: nodes.map(n => prepareNodeData({
                  parentNodeId: n.parentNodeId,
                  nodeType: n.nodeType,
                  nodeName: n.nodeName,
                  sortOrder: n.sortOrder || 0,
                  assigneeType: n.assigneeType,
                  assigneeIds: n.assigneeIds,
                  assigneeFieldKey: n.assigneeFieldKey,
                  signType: n.signType,
                  conditionExpression: n.conditionExpression,
                  autoAction: n.autoAction,
                  ccUserIds: n.ccUserIds,
                  config: n.config
                }))
              }
            : undefined
        },
        include: {
          createdBy: {
            select: {
              id: true,
              nickname: true,
              avatar: true
            }
          },
          nodes: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      })

      return newTemplate
    })

    const data = {
      id: template.id,
      formTemplateId: template.formTemplateId,
      teamId: template.teamId,
      name: template.name,
      description: template.description,
      isEnabled: template.isEnabled,
      timeoutHours: template.timeoutHours,
      createdById: template.createdById,
      createdBy: template.createdBy,
      nodes: template.nodes.map(serializeNode),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, isEnabled, timeoutHours } = req.body
    const userId = req.user.userId

    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: { team: true }
    })

    if (!template) {
      return res.status(404).json({ success: false, message: '审批模板不存在' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: template.teamId,
          userId
        }
      }
    })

    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限修改审批模板' })
    }

    const updated = await prisma.approvalTemplate.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        isEnabled: isEnabled !== undefined ? isEnabled : undefined,
        timeoutHours: timeoutHours !== undefined ? timeoutHours : undefined,
        updatedById: userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            nickname: true,
            avatar: true
          }
        },
        nodes: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    const data = {
      id: updated.id,
      formTemplateId: updated.formTemplateId,
      teamId: updated.teamId,
      name: updated.name,
      description: updated.description,
      isEnabled: updated.isEnabled,
      timeoutHours: updated.timeoutHours,
      createdById: updated.createdById,
      createdBy: updated.createdBy,
      nodes: updated.nodes.map(serializeNode),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: { team: true }
    })

    if (!template) {
      return res.status(404).json({ success: false, message: '审批模板不存在' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: template.teamId,
          userId
        }
      }
    })

    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限删除审批模板' })
    }

    await prisma.approvalTemplate.delete({ where: { id } })

    res.json({ success: true, data: { message: '审批模板已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/nodes', auth, async (req, res) => {
  try {
    const { id } = req.params
    const {
      parentNodeId,
      nodeType,
      nodeName,
      sortOrder,
      assigneeType,
      assigneeIds,
      assigneeFieldKey,
      signType,
      conditionExpression,
      autoAction,
      ccUserIds,
      config
    } = req.body
    const userId = req.user.userId

    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: { team: true }
    })

    if (!template) {
      return res.status(404).json({ success: false, message: '审批模板不存在' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: template.teamId,
          userId
        }
      }
    })

    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限添加节点' })
    }

    if (!nodeType) {
      return res.status(400).json({ success: false, message: '请提供节点类型' })
    }

    if (!nodeName) {
      return res.status(400).json({ success: false, message: '请提供节点名称' })
    }

    const nodeData = prepareNodeData({
      parentNodeId,
      nodeType,
      nodeName,
      sortOrder: sortOrder || 0,
      assigneeType,
      assigneeIds,
      assigneeFieldKey,
      signType,
      conditionExpression,
      autoAction,
      ccUserIds,
      config
    })

    const node = await prisma.approvalNode.create({
      data: {
        approvalTemplateId: id,
        ...nodeData
      }
    })

    res.json({ success: true, data: serializeNode(node) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id/nodes/:nodeId', auth, async (req, res) => {
  try {
    const { id, nodeId } = req.params
    const {
      parentNodeId,
      nodeType,
      nodeName,
      sortOrder,
      assigneeType,
      assigneeIds,
      assigneeFieldKey,
      signType,
      conditionExpression,
      autoAction,
      ccUserIds,
      config
    } = req.body
    const userId = req.user.userId

    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: { team: true }
    })

    if (!template) {
      return res.status(404).json({ success: false, message: '审批模板不存在' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: template.teamId,
          userId
        }
      }
    })

    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限修改节点' })
    }

    const existingNode = await prisma.approvalNode.findUnique({
      where: { id: nodeId }
    })

    if (!existingNode || existingNode.approvalTemplateId !== id) {
      return res.status(404).json({ success: false, message: '节点不存在' })
    }

    const nodeData = prepareNodeData({
      parentNodeId: parentNodeId !== undefined ? parentNodeId : undefined,
      nodeType: nodeType || undefined,
      nodeName: nodeName || undefined,
      sortOrder: sortOrder !== undefined ? sortOrder : undefined,
      assigneeType: assigneeType !== undefined ? assigneeType : undefined,
      assigneeIds: assigneeIds !== undefined ? assigneeIds : undefined,
      assigneeFieldKey: assigneeFieldKey !== undefined ? assigneeFieldKey : undefined,
      signType: signType !== undefined ? signType : undefined,
      conditionExpression: conditionExpression !== undefined ? conditionExpression : undefined,
      autoAction: autoAction !== undefined ? autoAction : undefined,
      ccUserIds: ccUserIds !== undefined ? ccUserIds : undefined,
      config: config !== undefined ? config : undefined
    })

    const updatedNode = await prisma.approvalNode.update({
      where: { id: nodeId },
      data: nodeData
    })

    res.json({ success: true, data: serializeNode(updatedNode) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id/nodes/:nodeId', auth, async (req, res) => {
  try {
    const { id, nodeId } = req.params
    const userId = req.user.userId

    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: { team: true }
    })

    if (!template) {
      return res.status(404).json({ success: false, message: '审批模板不存在' })
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: template.teamId,
          userId
        }
      }
    })

    if (!teamMember || teamMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: '您没有权限删除节点' })
    }

    const existingNode = await prisma.approvalNode.findUnique({
      where: { id: nodeId }
    })

    if (!existingNode || existingNode.approvalTemplateId !== id) {
      return res.status(404).json({ success: false, message: '节点不存在' })
    }

    await prisma.approvalNode.delete({ where: { id: nodeId } })

    res.json({ success: true, data: { message: '节点已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
