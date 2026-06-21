import { Router } from 'express'
import prisma from '../config/prisma.js'
import auth from '../middleware/auth.js'

const router = Router()

const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'select',
  'multiSelect',
  'member',
  'department',
  'attachment',
  'money',
  'detailTable'
]

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

const parseFormField = (field) => {
  if (!field) return null
  return {
    ...field,
    options: field.options ? JSON.parse(field.options) : null,
    validation: field.validation ? JSON.parse(field.validation) : null,
    config: field.config ? JSON.parse(field.config) : null
  }
}

const parseFormTemplate = (template) => {
  if (!template) return null
  return {
    ...template,
    fields: template.fields ? template.fields.map(f => parseFormField(f)).sort((a, b) => a.sortOrder - b.sortOrder) : []
  }
}

const fieldInputToData = (field) => {
  const data = {
    fieldKey: field.fieldKey,
    label: field.label,
    type: field.type,
    placeholder: field.placeholder ?? undefined,
    helpText: field.helpText ?? undefined,
    defaultValue: field.defaultValue ?? undefined,
    isRequired: field.isRequired ?? false,
    isHidden: field.isHidden ?? false,
    isDisabled: field.isDisabled ?? false,
    sortOrder: field.sortOrder ?? 0,
    options: field.options !== undefined ? JSON.stringify(field.options) : undefined,
    validation: field.validation !== undefined ? JSON.stringify(field.validation) : undefined,
    config: field.config !== undefined ? JSON.stringify(field.config) : undefined
  }
  return data
}

const validateField = (field) => {
  if (!field.fieldKey || typeof field.fieldKey !== 'string') {
    return '字段 fieldKey 必填'
  }
  if (!field.label || typeof field.label !== 'string') {
    return '字段 label 必填'
  }
  if (!field.type || !FIELD_TYPES.includes(field.type)) {
    return `字段类型无效，有效值: ${FIELD_TYPES.join(', ')}`
  }
  return null
}

router.get('/', auth, async (req, res) => {
  try {
    const { teamId } = req.query
    const userId = req.user.userId

    if (!teamId) {
      return res.status(400).json({ success: false, message: '请提供团队ID' })
    }

    if (!await checkTeamMember(userId, teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const templates = await prisma.formTemplate.findMany({
      where: { teamId },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        updatedBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        fields: true
      },
      orderBy: { sortOrder: 'asc' }
    })

    const data = templates.map(t => parseFormTemplate(t))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/team/:teamId', auth, async (req, res) => {
  try {
    const { teamId } = req.params
    const userId = req.user.userId

    if (!await checkTeamMember(userId, teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const templates = await prisma.formTemplate.findMany({
      where: { teamId },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        updatedBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        fields: true
      },
      orderBy: { sortOrder: 'asc' }
    })

    const data = templates.map(t => parseFormTemplate(t))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const template = await prisma.formTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        updatedBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        fields: true
      }
    })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    res.json({ success: true, data: parseFormTemplate(template) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { teamId, name, icon, description, category, isEnabled, sortOrder, fields } = req.body
    const userId = req.user.userId

    if (!await checkTeamMember(userId, teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    if (!name) {
      return res.status(400).json({ success: false, message: '请提供模板名称' })
    }

    if (fields && Array.isArray(fields)) {
      for (const field of fields) {
        const error = validateField(field)
        if (error) {
          return res.status(400).json({ success: false, message: error })
        }
      }
    }

    const template = await prisma.$transaction(async (tx) => {
      const newTemplate = await tx.formTemplate.create({
        data: {
          teamId,
          name,
          icon: icon ?? undefined,
          description: description ?? undefined,
          category: category ?? undefined,
          isEnabled: isEnabled ?? true,
          sortOrder: sortOrder ?? 0,
          createdById: userId,
          updatedById: userId,
          fields: fields && Array.isArray(fields) && fields.length > 0
            ? {
                create: fields.map(f => fieldInputToData(f))
              }
            : undefined
        },
        include: {
          createdBy: {
            select: { id: true, nickname: true, avatar: true }
          },
          updatedBy: {
            select: { id: true, nickname: true, avatar: true }
          },
          fields: true
        }
      })

      return newTemplate
    })

    res.json({ success: true, data: parseFormTemplate(template) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, icon, description, category, isEnabled, isDefault, sortOrder } = req.body
    const userId = req.user.userId

    const template = await prisma.formTemplate.findUnique({ where: { id } })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const updatedTemplate = await prisma.formTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        icon: icon !== undefined ? icon : undefined,
        description: description !== undefined ? description : undefined,
        category: category !== undefined ? category : undefined,
        isEnabled: isEnabled !== undefined ? isEnabled : undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
        updatedById: userId
      },
      include: {
        createdBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        updatedBy: {
          select: { id: true, nickname: true, avatar: true }
        },
        fields: true
      }
    })

    res.json({ success: true, data: parseFormTemplate(updatedTemplate) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const template = await prisma.formTemplate.findUnique({ where: { id } })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    await prisma.formTemplate.delete({ where: { id } })

    res.json({ success: true, data: { message: '表单模板已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:id/fields', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const template = await prisma.formTemplate.findUnique({ where: { id } })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const fields = await prisma.formField.findMany({
      where: { formTemplateId: id },
      orderBy: { sortOrder: 'asc' }
    })

    res.json({ success: true, data: fields.map(f => parseFormField(f)) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:id/fields', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const field = req.body

    const template = await prisma.formTemplate.findUnique({ where: { id } })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const error = validateField(field)
    if (error) {
      return res.status(400).json({ success: false, message: error })
    }

    const existingField = await prisma.formField.findUnique({
      where: {
        formTemplateId_fieldKey: {
          formTemplateId: id,
          fieldKey: field.fieldKey
        }
      }
    })

    if (existingField) {
      return res.status(400).json({ success: false, message: `字段 fieldKey "${field.fieldKey}" 已存在` })
    }

    const newField = await prisma.formField.create({
      data: {
        ...fieldInputToData(field),
        formTemplateId: id
      }
    })

    res.json({ success: true, data: parseFormField(newField) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id/fields/:fieldId', auth, async (req, res) => {
  try {
    const { id, fieldId } = req.params
    const userId = req.user.userId
    const field = req.body

    const template = await prisma.formTemplate.findUnique({ where: { id } })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const existingField = await prisma.formField.findUnique({
      where: { id: fieldId }
    })

    if (!existingField || existingField.formTemplateId !== id) {
      return res.status(404).json({ success: false, message: '字段不存在' })
    }

    if (field.type !== undefined && !FIELD_TYPES.includes(field.type)) {
      return res.status(400).json({ success: false, message: `字段类型无效，有效值: ${FIELD_TYPES.join(', ')}` })
    }

    if (field.fieldKey !== undefined) {
      const duplicateField = await prisma.formField.findUnique({
        where: {
          formTemplateId_fieldKey: {
            formTemplateId: id,
            fieldKey: field.fieldKey
          }
        }
      })
      if (duplicateField && duplicateField.id !== fieldId) {
        return res.status(400).json({ success: false, message: `字段 fieldKey "${field.fieldKey}" 已存在` })
      }
    }

    const updatedField = await prisma.formField.update({
      where: { id: fieldId },
      data: fieldInputToData(field)
    })

    res.json({ success: true, data: parseFormField(updatedField) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.delete('/:id/fields/:fieldId', auth, async (req, res) => {
  try {
    const { id, fieldId } = req.params
    const userId = req.user.userId

    const template = await prisma.formTemplate.findUnique({ where: { id } })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const existingField = await prisma.formField.findUnique({
      where: { id: fieldId }
    })

    if (!existingField || existingField.formTemplateId !== id) {
      return res.status(404).json({ success: false, message: '字段不存在' })
    }

    await prisma.formField.delete({ where: { id: fieldId } })

    res.json({ success: true, data: { message: '字段已删除' } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/:id/fields', auth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { fields } = req.body

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ success: false, message: '请提供字段数据' })
    }

    const template = await prisma.formTemplate.findUnique({ where: { id } })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    for (const field of fields) {
      const error = validateField(field)
      if (error) {
        return res.status(400).json({ success: false, message: error })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.formField.deleteMany({
        where: { formTemplateId: id }
      })

      for (const field of fields) {
        await tx.formField.create({
          data: {
            ...fieldInputToData(field),
            formTemplateId: id
          }
        })
      }
    })

    const createdFields = await prisma.formField.findMany({
      where: { formTemplateId: id },
      orderBy: { sortOrder: 'asc' }
    })

    res.json({ success: true, data: createdFields.map(f => parseFormField(f)) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.get('/:formTemplateId/records', auth, async (req, res) => {
  try {
    const { formTemplateId } = req.params
    const { page = 1, pageSize = 20 } = req.query
    const userId = req.user.userId

    const template = await prisma.formTemplate.findUnique({ where: { id: formTemplateId } })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const [records, total] = await Promise.all([
      prisma.formRecord.findMany({
        where: { formTemplateId },
        include: {
          submitter: {
            select: { id: true, nickname: true, avatar: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.formRecord.count({ where: { formTemplateId } })
    ])

    const parsedRecords = records.map(r => ({
      ...r,
      formData: parseJsonField(r.formData)
    }))

    res.json({
      success: true,
      data: { list: parsedRecords, items: parsedRecords, total, page: Number(page), pageSize: Number(pageSize) }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.post('/:formTemplateId/records', auth, async (req, res) => {
  try {
    const { formTemplateId } = req.params
    const { formData } = req.body
    const userId = req.user.userId

    const template = await prisma.formTemplate.findUnique({ where: { id: formTemplateId } })

    if (!template) {
      return res.status(404).json({ success: false, message: '表单模板不存在' })
    }

    if (!await checkTeamMember(userId, template.teamId)) {
      return res.status(403).json({ success: false, message: '您不是该团队成员' })
    }

    const record = await prisma.formRecord.create({
      data: {
        formTemplateId,
        submitterId: userId,
        teamId: template.teamId,
        formData: typeof formData === 'object' ? JSON.stringify(formData) : formData,
        status: 'submitted',
        submittedAt: new Date()
      },
      include: {
        submitter: {
          select: { id: true, nickname: true, avatar: true, email: true }
        }
      }
    })

    res.json({ success: true, data: record })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
