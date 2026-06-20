import { useState, useEffect } from 'react'
import type { ApprovalNode, ApprovalNodeType, FormField } from '../../types'
import ApprovalNodeCard from './ApprovalNodeCard'

interface ApprovalFlowDesignerProps {
  initialNodes?: ApprovalNode[]
  onChange?: (nodes: ApprovalNode[]) => void
  formFields?: FormField[]
}

type LocalAssigneeType = 'specified' | 'initiator' | 'departmentHead' | 'field'
type LocalSignType = 'and' | 'or'

interface NodeEditorState {
  nodeName: string
  assigneeType: LocalAssigneeType
  assigneeIds: string[]
  assigneeFieldKey: string
  signType: LocalSignType
  conditionExpression: string
  ccUserIds: string[]
}

const addableNodeTypes: { type: Exclude<ApprovalNodeType, 'initiator'>; label: string; icon: string }[] = [
  { type: 'approver', label: '审批人', icon: '✅' },
  { type: 'countersign', label: '会签', icon: '🤝' },
  { type: 'orSign', label: '或签', icon: '⚡' },
  { type: 'cc', label: '抄送人', icon: '📋' },
  { type: 'condition', label: '条件分支', icon: '🔀' },
  { type: 'autoApprove', label: '自动通过', icon: '✔️' },
  { type: 'autoReject', label: '自动拒绝', icon: '❌' }
]

const assigneeTypeOptions: { value: LocalAssigneeType; label: string }[] = [
  { value: 'specified', label: '指定人员' },
  { value: 'initiator', label: '发起人自选' },
  { value: 'departmentHead', label: '部门负责人' },
  { value: 'field', label: '表单字段' }
]

const signTypeOptions: { value: LocalSignType; label: string }[] = [
  { value: 'and', label: '会签（全部同意才通过）' },
  { value: 'or', label: '或签（任一同意即通过）' }
]

function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function createDefaultNode(type: ApprovalNodeType, sortOrder: number): ApprovalNode {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    approvalTemplateId: '',
    parentNodeId: null,
    nodeType: type,
    nodeName: getDefaultNodeName(type),
    sortOrder,
    assigneeType: null,
    assigneeIds: null,
    assigneeFieldKey: null,
    signType: null,
    conditionExpression: null,
    autoAction: type === 'autoApprove' ? 'approve' : type === 'autoReject' ? 'reject' : null,
    ccUserIds: null,
    config: null,
    childNodes: undefined,
    createdAt: now,
    updatedAt: now
  }
}

function getDefaultNodeName(type: ApprovalNodeType): string {
  const names: Record<ApprovalNodeType, string> = {
    initiator: '发起人',
    approver: '审批人',
    cc: '抄送人',
    condition: '条件分支',
    countersign: '会签节点',
    orSign: '或签节点',
    autoApprove: '自动通过',
    autoReject: '自动拒绝'
  }
  return names[type]
}

function mapAssigneeTypeToLocal(type?: string | null): LocalAssigneeType {
  if (!type) return 'specified'
  const map: Record<string, LocalAssigneeType> = {
    specified: 'specified',
    user: 'specified',
    initiator: 'initiator',
    departmentHead: 'departmentHead',
    initiatorLeader: 'departmentHead',
    field: 'field',
    formField: 'field'
  }
  return map[type] || 'specified'
}

function mapAssigneeTypeToApi(type: LocalAssigneeType): string {
  const map: Record<LocalAssigneeType, string> = {
    specified: 'user',
    initiator: 'initiator',
    departmentHead: 'initiatorLeader',
    field: 'formField'
  }
  return map[type]
}

function mapSignTypeToLocal(type?: string | null): LocalSignType {
  if (!type) return 'and'
  const map: Record<string, LocalSignType> = {
    and: 'and',
    all: 'and',
    or: 'or',
    any: 'or'
  }
  return map[type] || 'and'
}

function mapSignTypeToApi(type: LocalSignType): string {
  const map: Record<LocalSignType, string> = {
    and: 'all',
    or: 'any'
  }
  return map[type]
}

function ApprovalFlowDesigner({
  initialNodes = [],
  onChange,
  formFields = []
}: ApprovalFlowDesignerProps) {
  const [nodes, setNodes] = useState<ApprovalNode[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null)
  const [showEndAddMenu, setShowEndAddMenu] = useState(false)

  useEffect(() => {
    if (initialNodes && initialNodes.length > 0) {
      const sorted = [...initialNodes].sort((a, b) => a.sortOrder - b.sortOrder)
      setNodes(sorted)
    } else {
      const initiatorNode = createDefaultNode('initiator', 0)
      setNodes([initiatorNode])
    }
  }, [initialNodes])

  useEffect(() => {
    onChange?.(nodes)
  }, [nodes, onChange])

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null

  const getEditorState = (node: ApprovalNode | null): NodeEditorState => {
    if (!node) {
      return {
        nodeName: '',
        assigneeType: 'specified',
        assigneeIds: [],
        assigneeFieldKey: '',
        signType: 'and',
        conditionExpression: '',
        ccUserIds: []
      }
    }
    return {
      nodeName: node.nodeName,
      assigneeType: mapAssigneeTypeToLocal(node.assigneeType),
      assigneeIds: node.assigneeIds || [],
      assigneeFieldKey: node.assigneeFieldKey || '',
      signType: mapSignTypeToLocal(node.signType),
      conditionExpression: node.conditionExpression || '',
      ccUserIds: node.ccUserIds || []
    }
  }

  const [editorState, setEditorState] = useState<NodeEditorState>(getEditorState(null))

  useEffect(() => {
    setEditorState(getEditorState(selectedNode))
  }, [selectedNode])

  const handleSelectNode = (node: ApprovalNode) => {
    setSelectedNodeId(node.id)
    setShowAddMenu(null)
    setShowEndAddMenu(false)
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => {
      const filtered = prev.filter(n => n.id !== nodeId)
      return filtered.map((n, idx) => ({ ...n, sortOrder: idx }))
    })
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
  }

  const handleInsertAfter = (afterNodeId: string, newType: ApprovalNodeType) => {
    setNodes(prev => {
      const idx = prev.findIndex(n => n.id === afterNodeId)
      if (idx === -1) return prev
      const newNode = createDefaultNode(newType, idx + 1)
      const result = [...prev.slice(0, idx + 1), newNode, ...prev.slice(idx + 1)]
      return result.map((n, i) => ({ ...n, sortOrder: i }))
    })
    setShowAddMenu(null)
    setShowEndAddMenu(false)
  }

  const handleAddToEnd = (newType: ApprovalNodeType) => {
    setNodes(prev => {
      const newNode = createDefaultNode(newType, prev.length)
      return [...prev, newNode]
    })
    setShowAddMenu(null)
    setShowEndAddMenu(false)
  }

  const handleEditorChange = (field: keyof NodeEditorState, value: unknown) => {
    setEditorState(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveEditor = () => {
    if (!selectedNode) return
    setNodes(prev => prev.map(n => {
      if (n.id !== selectedNode.id) return n
      const updated: ApprovalNode = {
        ...n,
        nodeName: editorState.nodeName || getDefaultNodeName(n.nodeType),
        updatedAt: new Date().toISOString()
      }

      if (n.nodeType === 'cc') {
        updated.ccUserIds = editorState.ccUserIds.length > 0 ? editorState.ccUserIds : null
      } else if (n.nodeType === 'condition') {
        updated.conditionExpression = editorState.conditionExpression || null
      } else if (n.nodeType === 'countersign' || n.nodeType === 'orSign') {
        updated.assigneeType = mapAssigneeTypeToApi(editorState.assigneeType) as any
        updated.assigneeIds = editorState.assigneeIds.length > 0 ? editorState.assigneeIds : null
        updated.assigneeFieldKey = editorState.assigneeFieldKey || null
        updated.signType = mapSignTypeToApi(editorState.signType) as any
      } else if (n.nodeType === 'approver') {
        updated.assigneeType = mapAssigneeTypeToApi(editorState.assigneeType) as any
        updated.assigneeIds = editorState.assigneeIds.length > 0 ? editorState.assigneeIds : null
        updated.assigneeFieldKey = editorState.assigneeFieldKey || null
      }

      return updated
    }))
  }

  const renderAddMenu = (targetNodeId: string | 'end') => {
    const isOpen = targetNodeId === 'end' ? showEndAddMenu : showAddMenu === targetNodeId
    if (!isOpen) return null

    return (
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 bg-white rounded-xl shadow-xl border border-gray-200 py-2 w-48">
        {addableNodeTypes.map(item => (
          <button
            key={item.type}
            onClick={() => {
              if (targetNodeId === 'end') {
                handleAddToEnd(item.type)
              } else {
                handleInsertAfter(targetNodeId, item.type)
              }
            }}
            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors"
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-sm text-gray-700">{item.label}</span>
          </button>
        ))}
      </div>
    )
  }

  const renderEditor = () => {
    if (!selectedNode) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p>点击左侧节点进行编辑</p>
          </div>
        </div>
      )
    }

    const isInitiator = selectedNode.nodeType === 'initiator'
    const isAuto = selectedNode.nodeType === 'autoApprove' || selectedNode.nodeType === 'autoReject'
    const isCc = selectedNode.nodeType === 'cc'
    const isCondition = selectedNode.nodeType === 'condition'
    const isApprover = selectedNode.nodeType === 'approver'
    const isMultiSign = selectedNode.nodeType === 'countersign' || selectedNode.nodeType === 'orSign'

    return (
      <div className="h-full flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">节点设置</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">节点名称</label>
            <input
              type="text"
              value={editorState.nodeName}
              onChange={(e) => handleEditorChange('nodeName', e.target.value)}
              onBlur={handleSaveEditor}
              disabled={isInitiator || isAuto}
              placeholder="请输入节点名称"
              className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {(isApprover || isMultiSign) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">审批人类型</label>
                <select
                  value={editorState.assigneeType}
                  onChange={(e) => {
                    handleEditorChange('assigneeType', e.target.value as LocalAssigneeType)
                    setTimeout(handleSaveEditor, 0)
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                >
                  {assigneeTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {editorState.assigneeType === 'specified' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">指定人员ID</label>
                  <textarea
                    value={editorState.assigneeIds.join('\n')}
                    onChange={(e) => {
                      const ids = e.target.value.split('\n').filter(id => id.trim())
                      handleEditorChange('assigneeIds', ids)
                    }}
                    onBlur={handleSaveEditor}
                    placeholder="每行一个用户ID"
                    rows={4}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">已选择 {editorState.assigneeIds.length} 人</p>
                </div>
              )}

              {editorState.assigneeType === 'field' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">表单字段</label>
                  <select
                    value={editorState.assigneeFieldKey}
                    onChange={(e) => {
                      handleEditorChange('assigneeFieldKey', e.target.value)
                      setTimeout(handleSaveEditor, 0)
                    }}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
                  >
                    <option value="">请选择字段</option>
                    {formFields.filter(f => f.type === 'member' || f.type === 'department').map(field => (
                      <option key={field.fieldKey} value={field.fieldKey}>{field.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {isMultiSign && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">会签方式</label>
              <select
                value={editorState.signType}
                onChange={(e) => {
                  handleEditorChange('signType', e.target.value as LocalSignType)
                  setTimeout(handleSaveEditor, 0)
                }}
                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all"
              >
                {signTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {isCc && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">抄送人员ID</label>
              <textarea
                value={editorState.ccUserIds.join('\n')}
                onChange={(e) => {
                  const ids = e.target.value.split('\n').filter(id => id.trim())
                  handleEditorChange('ccUserIds', ids)
                }}
                onBlur={handleSaveEditor}
                placeholder="每行一个用户ID"
                rows={4}
                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all resize-none"
              />
              <p className="mt-1 text-xs text-gray-400">已选择 {editorState.ccUserIds.length} 人</p>
            </div>
          )}

          {isCondition && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">条件表达式</label>
              <textarea
                value={editorState.conditionExpression}
                onChange={(e) => handleEditorChange('conditionExpression', e.target.value)}
                onBlur={handleSaveEditor}
                placeholder="例如: amount > 1000"
                rows={4}
                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all resize-none font-mono"
              />
              <p className="mt-1 text-xs text-gray-400">支持使用表单字段key进行条件判断</p>
            </div>
          )}

          {(isInitiator || isAuto) && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">
                {isInitiator
                  ? '此节点为流程起点，由提交审批的人员自动触发，无需额外配置。'
                  : selectedNode.nodeType === 'autoApprove'
                    ? '此节点将自动通过审批，无需人工操作。'
                    : '此节点将自动拒绝审批，无需人工操作。'}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-md mx-auto space-y-0">
          {nodes.map((node, index) => (
            <div key={node.id} className="relative">
              <ApprovalNodeCard
                node={node}
                isSelected={selectedNodeId === node.id}
                isFirst={index === 0}
                isLast={index === nodes.length - 1 && !showEndAddMenu}
                onSelect={handleSelectNode}
                onDelete={handleDeleteNode}
                onInsertAfter={(id) => {
                  setShowAddMenu(showAddMenu === id ? null : id)
                  setShowEndAddMenu(false)
                }}
                formFields={formFields}
              />
              {showAddMenu === node.id && (
                <div className="relative">
                  {renderAddMenu(node.id)}
                </div>
              )}
            </div>
          ))}

          <div className="relative flex justify-center mt-2">
            <button
              onClick={() => {
                setShowEndAddMenu(!showEndAddMenu)
                setShowAddMenu(null)
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-dashed border-gray-300 hover:border-[#3370FF] hover:text-[#3370FF] text-gray-400 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {showEndAddMenu && renderAddMenu('end')}
          </div>
        </div>
      </div>

      <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0">
        {renderEditor()}
      </div>
    </div>
  )
}

export default ApprovalFlowDesigner
