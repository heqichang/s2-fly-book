import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const formTemplates = [
  {
    name: '请假申请',
    icon: '📅',
    description: '员工请假申请审批流程',
    category: '人事',
    sortOrder: 1,
    fields: [
      {
        fieldKey: 'leaveType',
        label: '请假类型',
        type: 'select',
        placeholder: '请选择请假类型',
        isRequired: true,
        sortOrder: 1,
        options: [
          { label: '年假', value: 'annual' },
          { label: '事假', value: 'personal' },
          { label: '病假', value: 'sick' },
          { label: '婚假', value: 'marriage' },
          { label: '产假', value: 'maternity' },
          { label: '陪产假', value: 'paternity' },
          { label: '丧假', value: 'bereavement' },
          { label: '调休', value: 'compensatory' }
        ]
      },
      {
        fieldKey: 'startDate',
        label: '开始日期',
        type: 'date',
        isRequired: true,
        sortOrder: 2
      },
      {
        fieldKey: 'endDate',
        label: '结束日期',
        type: 'date',
        isRequired: true,
        sortOrder: 3
      },
      {
        fieldKey: 'leaveDays',
        label: '请假天数',
        type: 'number',
        placeholder: '请输入请假天数',
        isRequired: true,
        sortOrder: 4,
        validation: { min: 0.5 }
      },
      {
        fieldKey: 'leaveReason',
        label: '请假原因',
        type: 'textarea',
        placeholder: '请详细说明请假原因',
        isRequired: true,
        sortOrder: 5
      },
      {
        fieldKey: 'attachments',
        label: '附件',
        type: 'attachment',
        helpText: '可上传相关证明材料',
        sortOrder: 6
      }
    ],
    approvalFlow: 'hr'
  },
  {
    name: '加班申请',
    icon: '⏰',
    description: '员工加班申请审批流程',
    category: '人事',
    sortOrder: 2,
    fields: [
      {
        fieldKey: 'overtimeDate',
        label: '加班日期',
        type: 'date',
        isRequired: true,
        sortOrder: 1
      },
      {
        fieldKey: 'startTime',
        label: '开始时间',
        type: 'time',
        isRequired: true,
        sortOrder: 2
      },
      {
        fieldKey: 'endTime',
        label: '结束时间',
        type: 'time',
        isRequired: true,
        sortOrder: 3
      },
      {
        fieldKey: 'overtimeHours',
        label: '加班时长(小时)',
        type: 'number',
        placeholder: '请输入加班时长',
        isRequired: true,
        sortOrder: 4,
        validation: { min: 0.5 }
      },
      {
        fieldKey: 'overtimeReason',
        label: '加班原因',
        type: 'textarea',
        placeholder: '请详细说明加班原因',
        isRequired: true,
        sortOrder: 5
      }
    ],
    approvalFlow: 'hr'
  },
  {
    name: '报销申请',
    icon: '💰',
    description: '员工费用报销审批流程',
    category: '财务',
    sortOrder: 3,
    fields: [
      {
        fieldKey: 'expenseType',
        label: '报销类型',
        type: 'select',
        placeholder: '请选择报销类型',
        isRequired: true,
        sortOrder: 1,
        options: [
          { label: '差旅费', value: 'travel' },
          { label: '交通费', value: 'transport' },
          { label: '餐饮费', value: 'meal' },
          { label: '住宿费', value: 'hotel' },
          { label: '办公用品', value: 'office' },
          { label: '通讯费', value: 'communication' },
          { label: '培训费', value: 'training' },
          { label: '其他', value: 'other' }
        ]
      },
      {
        fieldKey: 'expenseAmount',
        label: '报销金额',
        type: 'money',
        placeholder: '请输入报销金额',
        isRequired: true,
        sortOrder: 2,
        validation: { min: 0 }
      },
      {
        fieldKey: 'expenseDate',
        label: '发生日期',
        type: 'date',
        isRequired: true,
        sortOrder: 3
      },
      {
        fieldKey: 'expenseDescription',
        label: '费用说明',
        type: 'textarea',
        placeholder: '请详细说明费用情况',
        isRequired: true,
        sortOrder: 4
      },
      {
        fieldKey: 'attachments',
        label: '附件',
        type: 'attachment',
        helpText: '请上传发票等相关凭证',
        isRequired: true,
        sortOrder: 5
      }
    ],
    approvalFlow: 'finance'
  },
  {
    name: '采购申请',
    icon: '🛒',
    description: '物品采购申请审批流程',
    category: '行政',
    sortOrder: 4,
    fields: [
      {
        fieldKey: 'purchaseType',
        label: '采购类型',
        type: 'select',
        placeholder: '请选择采购类型',
        isRequired: true,
        sortOrder: 1,
        options: [
          { label: '办公用品', value: 'office' },
          { label: 'IT设备', value: 'it' },
          { label: '家具', value: 'furniture' },
          { label: '劳保用品', value: 'safety' },
          { label: '营销物料', value: 'marketing' },
          { label: '其他', value: 'other' }
        ]
      },
      {
        fieldKey: 'purchaseAmount',
        label: '采购金额',
        type: 'money',
        placeholder: '请输入预估采购金额',
        isRequired: true,
        sortOrder: 2,
        validation: { min: 0 }
      },
      {
        fieldKey: 'demandDate',
        label: '需求日期',
        type: 'date',
        isRequired: true,
        sortOrder: 3
      },
      {
        fieldKey: 'purchaseDetails',
        label: '采购明细',
        type: 'detailTable',
        isRequired: true,
        sortOrder: 4,
        config: {
          columns: [
            { key: 'itemName', label: '物品名称', type: 'text', required: true },
            { key: 'specification', label: '规格型号', type: 'text' },
            { key: 'quantity', label: '数量', type: 'number', required: true },
            { key: 'unitPrice', label: '单价', type: 'money' },
            { key: 'subtotal', label: '小计', type: 'money' },
            { key: 'remark', label: '备注', type: 'text' }
          ]
        }
      },
      {
        fieldKey: 'purchaseReason',
        label: '采购原因',
        type: 'textarea',
        placeholder: '请详细说明采购原因及用途',
        isRequired: true,
        sortOrder: 5
      },
      {
        fieldKey: 'attachments',
        label: '附件',
        type: 'attachment',
        helpText: '可上传报价单等相关文件',
        sortOrder: 6
      }
    ],
    approvalFlow: 'finance'
  },
  {
    name: '出差申请',
    icon: '✈️',
    description: '员工出差申请审批流程',
    category: '人事',
    sortOrder: 5,
    fields: [
      {
        fieldKey: 'destination',
        label: '出差目的地',
        type: 'text',
        placeholder: '请输入出差目的地',
        isRequired: true,
        sortOrder: 1
      },
      {
        fieldKey: 'startDate',
        label: '开始日期',
        type: 'date',
        isRequired: true,
        sortOrder: 2
      },
      {
        fieldKey: 'endDate',
        label: '结束日期',
        type: 'date',
        isRequired: true,
        sortOrder: 3
      },
      {
        fieldKey: 'travelDays',
        label: '出差天数',
        type: 'number',
        placeholder: '请输入出差天数',
        isRequired: true,
        sortOrder: 4,
        validation: { min: 1 }
      },
      {
        fieldKey: 'transport',
        label: '交通工具',
        type: 'select',
        placeholder: '请选择交通工具',
        isRequired: true,
        sortOrder: 5,
        options: [
          { label: '飞机', value: 'plane' },
          { label: '高铁', value: 'train' },
          { label: '汽车', value: 'bus' },
          { label: '自驾', value: 'self' },
          { label: '其他', value: 'other' }
        ]
      },
      {
        fieldKey: 'travelReason',
        label: '出差事由',
        type: 'textarea',
        placeholder: '请详细说明出差事由及工作内容',
        isRequired: true,
        sortOrder: 6
      }
    ],
    approvalFlow: 'hr'
  },
  {
    name: '用印申请',
    icon: '🔖',
    description: '公司印章使用申请审批流程',
    category: '行政',
    sortOrder: 6,
    fields: [
      {
        fieldKey: 'sealType',
        label: '用印类型',
        type: 'select',
        placeholder: '请选择用印类型',
        isRequired: true,
        sortOrder: 1,
        options: [
          { label: '公章', value: 'official' },
          { label: '合同专用章', value: 'contract' },
          { label: '财务专用章', value: 'finance' },
          { label: '发票专用章', value: 'invoice' },
          { label: '法人章', value: 'legal' },
          { label: '其他', value: 'other' }
        ]
      },
      {
        fieldKey: 'sealCount',
        label: '用印次数',
        type: 'number',
        placeholder: '请输入用印次数',
        isRequired: true,
        sortOrder: 2,
        validation: { min: 1 }
      },
      {
        fieldKey: 'sealDescription',
        label: '用印说明',
        type: 'textarea',
        placeholder: '请详细说明用印事由、文件名称及内容',
        isRequired: true,
        sortOrder: 3
      },
      {
        fieldKey: 'attachments',
        label: '附件',
        type: 'attachment',
        helpText: '请上传需要用印的文件',
        isRequired: true,
        sortOrder: 4
      }
    ],
    approvalFlow: 'hr'
  },
  {
    name: '合同审批',
    icon: '📝',
    description: '合同签订审批流程',
    category: '法务',
    sortOrder: 7,
    fields: [
      {
        fieldKey: 'contractName',
        label: '合同名称',
        type: 'text',
        placeholder: '请输入合同名称',
        isRequired: true,
        sortOrder: 1
      },
      {
        fieldKey: 'contractType',
        label: '合同类型',
        type: 'select',
        placeholder: '请选择合同类型',
        isRequired: true,
        sortOrder: 2,
        options: [
          { label: '采购合同', value: 'purchase' },
          { label: '销售合同', value: 'sales' },
          { label: '服务合同', value: 'service' },
          { label: '劳动合同', value: 'labor' },
          { label: '租赁合同', value: 'lease' },
          { label: '保密协议', value: 'nda' },
          { label: '合作协议', value: 'cooperation' },
          { label: '其他', value: 'other' }
        ]
      },
      {
        fieldKey: 'contractAmount',
        label: '合同金额',
        type: 'money',
        placeholder: '请输入合同金额',
        isRequired: true,
        sortOrder: 3,
        validation: { min: 0 }
      },
      {
        fieldKey: 'counterparty',
        label: '对方单位',
        type: 'text',
        placeholder: '请输入对方单位名称',
        isRequired: true,
        sortOrder: 4
      },
      {
        fieldKey: 'startDate',
        label: '合同开始日期',
        type: 'date',
        isRequired: true,
        sortOrder: 5
      },
      {
        fieldKey: 'endDate',
        label: '合同结束日期',
        type: 'date',
        isRequired: true,
        sortOrder: 6
      },
      {
        fieldKey: 'contractDescription',
        label: '合同说明',
        type: 'textarea',
        placeholder: '请简要说明合同主要内容及背景',
        isRequired: true,
        sortOrder: 7
      },
      {
        fieldKey: 'attachments',
        label: '附件',
        type: 'attachment',
        helpText: '请上传合同草案等相关文件',
        isRequired: true,
        sortOrder: 8
      }
    ],
    approvalFlow: 'finance'
  },
  {
    name: '入职申请',
    icon: '👤',
    description: '新员工入职申请审批流程',
    category: '人事',
    sortOrder: 8,
    fields: [
      {
        fieldKey: 'candidateName',
        label: '姓名',
        type: 'text',
        placeholder: '请输入候选人姓名',
        isRequired: true,
        sortOrder: 1
      },
      {
        fieldKey: 'candidatePhone',
        label: '手机号',
        type: 'text',
        placeholder: '请输入手机号',
        isRequired: true,
        sortOrder: 2,
        validation: { pattern: '^1[3-9]\\d{9}$' }
      },
      {
        fieldKey: 'candidateEmail',
        label: '邮箱',
        type: 'text',
        placeholder: '请输入邮箱地址',
        isRequired: true,
        sortOrder: 3,
        validation: { pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$' }
      },
      {
        fieldKey: 'department',
        label: '应聘部门',
        type: 'department',
        placeholder: '请选择应聘部门',
        isRequired: true,
        sortOrder: 4
      },
      {
        fieldKey: 'position',
        label: '岗位',
        type: 'select',
        placeholder: '请选择岗位',
        isRequired: true,
        sortOrder: 5,
        options: [
          { label: '前端开发工程师', value: 'frontend' },
          { label: '后端开发工程师', value: 'backend' },
          { label: '产品经理', value: 'product' },
          { label: 'UI设计师', value: 'ui' },
          { label: '测试工程师', value: 'qa' },
          { label: '运维工程师', value: 'ops' },
          { label: '销售经理', value: 'sales' },
          { label: '市场专员', value: 'marketing' },
          { label: '人事专员', value: 'hr' },
          { label: '财务专员', value: 'finance' },
          { label: '行政专员', value: 'admin' },
          { label: '其他', value: 'other' }
        ]
      },
      {
        fieldKey: 'onboardDate',
        label: '入职日期',
        type: 'date',
        isRequired: true,
        sortOrder: 6
      },
      {
        fieldKey: 'remark',
        label: '备注',
        type: 'textarea',
        placeholder: '其他需要说明的信息',
        sortOrder: 7
      }
    ],
    approvalFlow: 'hr'
  }
]

const getApprovalNodes = (flowType) => {
  const secondNodeName = flowType === 'finance' ? '财务审批' : 'HR审批'
  const secondNodeAssigneeType = flowType === 'finance' ? 'finance' : 'hr'

  return [
    {
      nodeType: 'start',
      nodeName: '发起人',
      sortOrder: 1,
      assigneeType: 'initiator',
      config: { editable: true }
    },
    {
      nodeType: 'approve',
      nodeName: '部门负责人审批',
      sortOrder: 2,
      assigneeType: 'departmentHead',
      signType: 'or',
      config: { allowReject: true, allowTransfer: true, allowAddSign: true }
    },
    {
      nodeType: 'approve',
      nodeName: secondNodeName,
      sortOrder: 3,
      assigneeType: secondNodeAssigneeType,
      signType: 'or',
      config: { allowReject: true, allowTransfer: true, allowAddSign: true }
    },
    {
      nodeType: 'end',
      nodeName: '完成',
      sortOrder: 4,
      config: {}
    }
  ]
}

const prepareFieldData = (field) => ({
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
})

const prepareNodeData = (node) => ({
  nodeType: node.nodeType,
  nodeName: node.nodeName,
  sortOrder: node.sortOrder ?? 0,
  assigneeType: node.assigneeType ?? undefined,
  assigneeIds: node.assigneeIds !== undefined ? (Array.isArray(node.assigneeIds) ? JSON.stringify(node.assigneeIds) : node.assigneeIds) : undefined,
  assigneeFieldKey: node.assigneeFieldKey ?? undefined,
  signType: node.signType ?? undefined,
  conditionExpression: node.conditionExpression ?? undefined,
  autoAction: node.autoAction ?? undefined,
  ccUserIds: node.ccUserIds !== undefined ? (Array.isArray(node.ccUserIds) ? JSON.stringify(node.ccUserIds) : node.ccUserIds) : undefined,
  config: node.config !== undefined ? (typeof node.config === 'object' && node.config !== null ? JSON.stringify(node.config) : node.config) : undefined
})

export async function runSeed() {
  try {
    console.log('开始执行审批表单模板种子数据...')

    const teams = await prisma.team.findMany()
    if (teams.length === 0) {
      console.log('未找到团队，请先创建团队后再执行种子数据')
      return
    }

    const anyUser = await prisma.user.findFirst()
    if (!anyUser) {
      console.log('未找到用户，请先创建用户后再执行种子数据')
      return
    }

    for (const team of teams) {
      console.log(`处理团队: ${team.name} (${team.id})`)

      const ownerId = team.ownerId || anyUser.id

      for (const template of formTemplates) {
        const existing = await prisma.formTemplate.findFirst({
          where: {
            teamId: team.id,
            name: template.name
          }
        })

        if (existing) {
          console.log(`  跳过已存在的模板: ${template.name}`)
          continue
        }

        const createdTemplate = await prisma.$transaction(async (tx) => {
          const formTpl = await tx.formTemplate.create({
            data: {
              teamId: team.id,
              name: template.name,
              icon: template.icon,
              description: template.description,
              category: template.category,
              isEnabled: true,
              isDefault: true,
              sortOrder: template.sortOrder,
              createdById: ownerId,
              updatedById: ownerId,
              fields: {
                create: template.fields.map(f => prepareFieldData(f))
              }
            }
          })

          const approvalNodes = getApprovalNodes(template.approvalFlow)

          const approvalTpl = await tx.approvalTemplate.create({
            data: {
              formTemplateId: formTpl.id,
              teamId: team.id,
              name: `${template.name}审批流程`,
              description: `${template.name}默认审批流程`,
              isEnabled: true,
              createdById: ownerId,
              updatedById: ownerId,
              nodes: {
                create: approvalNodes.map(n => prepareNodeData(n))
              }
            }
          })

          return { formTemplate: formTpl, approvalTemplate: approvalTpl }
        })

        console.log(`  创建模板: ${template.name} - 表单ID: ${createdTemplate.formTemplate.id}, 审批ID: ${createdTemplate.approvalTemplate.id}`)
      }
    }

    console.log('种子数据执行完成！')
  } catch (error) {
    console.error('种子数据执行失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

runSeed()
