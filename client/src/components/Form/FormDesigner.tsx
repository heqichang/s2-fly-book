import { useState, useMemo } from 'react'
import type { FormField, FormFieldType, FormFieldOption, DetailTableColumn } from '../../types'

interface FormDesignerProps {
  initialFields?: FormField[]
  templateName?: string
  onTemplateNameChange?: (name: string) => void
  onSave?: (fields: FormField[]) => void
  onCancel?: () => void
}

interface FieldTypeItem {
  type: FormFieldType
  label: string
  icon: string
}

const FIELD_TYPES: FieldTypeItem[] = [
  { type: 'text', label: '单行文本', icon: 'M4 6h16M4 12h16M4 18h7' },
  { type: 'textarea', label: '多行文本', icon: 'M4 6h16v12H4z M4 10h16 M4 14h16' },
  { type: 'number', label: '数字', icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14' },
  { type: 'date', label: '日期', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { type: 'time', label: '时间', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { type: 'select', label: '单选', icon: 'M9 5l7 7-7 7' },
  { type: 'multiSelect', label: '多选', icon: 'M9 5l7 7-7 7M5 5l7 7-7 7' },
  { type: 'member', label: '成员选择', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { type: 'department', label: '部门选择', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { type: 'attachment', label: '附件', icon: 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13' },
  { type: 'money', label: '金额', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { type: 'detailTable', label: '明细表格', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' }
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function getDefaultOptions(): FormFieldOption[] {
  return [
    { label: '选项1', value: generateId() },
    { label: '选项2', value: generateId() },
    { label: '选项3', value: generateId() }
  ]
}

function getDefaultColumns(): DetailTableColumn[] {
  return [
    { key: generateId(), label: '字段1', type: 'text', isRequired: false },
    { key: generateId(), label: '字段2', type: 'text', isRequired: false }
  ]
}

function createField(type: FormFieldType, sortOrder: number): FormField {
  const field: FormField = {
    id: generateId(),
    formTemplateId: '',
    fieldKey: `field_${generateId()}`,
    label: FIELD_TYPES.find(f => f.type === type)?.label || '字段',
    type,
    placeholder: '',
    helpText: '',
    defaultValue: null,
    isRequired: false,
    isHidden: false,
    isDisabled: false,
    sortOrder,
    createdAt: '',
    updatedAt: ''
  }

  if (type === 'select' || type === 'multiSelect') {
    field.options = getDefaultOptions()
  }

  if (type === 'detailTable') {
    field.config = { detailTableColumns: getDefaultColumns() }
  }

  if (type === 'money') {
    field.config = { precision: 2 }
  }

  if (type === 'attachment') {
    field.config = { allowMultiple: true, maxCount: 5 }
  }

  if (type === 'member' || type === 'department') {
    field.config = { allowMultiple: false }
  }

  return field
}

function FormDesigner({
  initialFields,
  templateName: propTemplateName,
  onTemplateNameChange,
  onSave,
  onCancel
}: FormDesignerProps) {
  const [fields, setFields] = useState<FormField[]>(() => {
    if (initialFields && initialFields.length > 0) {
      return initialFields.map((f, i) => ({ ...f, sortOrder: i }))
    }
    return []
  })
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState(propTemplateName || '')
  const [draggedType, setDraggedType] = useState<FormFieldType | null>(null)
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const selectedField = useMemo(() => {
    return fields.find(f => f.id === selectedFieldId) || null
  }, [fields, selectedFieldId])

  const handleTemplateNameChange = (name: string) => {
    setTemplateName(name)
    onTemplateNameChange?.(name)
  }

  const handleAddField = (type: FormFieldType) => {
    const newField = createField(type, fields.length)
    const newFields = [...fields, newField]
    setFields(newFields)
    setSelectedFieldId(newField.id)
  }

  const handleDeleteField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id).map((f, i) => ({ ...f, sortOrder: i }))
    setFields(newFields)
    if (selectedFieldId === id) {
      setSelectedFieldId(newFields[0]?.id || null)
    }
  }

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const handleMoveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields]
    const [removed] = newFields.splice(fromIndex, 1)
    newFields.splice(toIndex, 0, removed)
    setFields(newFields.map((f, i) => ({ ...f, sortOrder: i })))
  }

  const handleSave = () => {
    onSave?.(fields)
  }

  const handleDragStartFromPanel = (type: FormFieldType) => {
    setDraggedType(type)
    setDraggedFieldId(null)
  }

  const handleDragStartFromCanvas = (fieldId: string) => {
    setDraggedFieldId(fieldId)
    setDraggedType(null)
  }

  const handleDragEnd = () => {
    setDraggedType(null)
    setDraggedFieldId(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedType) {
      const newField = createField(draggedType, index)
      const newFields = [...fields]
      newFields.splice(index, 0, newField)
      setFields(newFields.map((f, i) => ({ ...f, sortOrder: i })))
      setSelectedFieldId(newField.id)
    } else if (draggedFieldId) {
      const fromIndex = fields.findIndex(f => f.id === draggedFieldId)
      if (fromIndex !== -1 && fromIndex !== index) {
        handleMoveField(fromIndex, index)
      }
    }
    handleDragEnd()
  }

  const handleAddOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId)
    if (!field) return
    const newOptions = [...(field.options || []), { label: `选项${(field.options?.length || 0) + 1}`, value: generateId() }]
    handleUpdateField(fieldId, { options: newOptions })
  }

  const handleUpdateOption = (fieldId: string, optionIndex: number, updates: Partial<FormFieldOption>) => {
    const field = fields.find(f => f.id === fieldId)
    if (!field || !field.options) return
    const newOptions = field.options.map((opt, i) => i === optionIndex ? { ...opt, ...updates } : opt)
    handleUpdateField(fieldId, { options: newOptions })
  }

  const handleDeleteOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId)
    if (!field || !field.options) return
    const newOptions = field.options.filter((_, i) => i !== optionIndex)
    handleUpdateField(fieldId, { options: newOptions })
  }

  const handleAddColumn = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId)
    if (!field) return
    const columns = field.config?.detailTableColumns || []
    const newColumn: DetailTableColumn = { key: generateId(), label: `字段${columns.length + 1}`, type: 'text', isRequired: false }
    handleUpdateField(fieldId, { config: { ...field.config, detailTableColumns: [...columns, newColumn] } })
  }

  const handleUpdateColumn = (fieldId: string, columnIndex: number, updates: Partial<DetailTableColumn>) => {
    const field = fields.find(f => f.id === fieldId)
    if (!field || !field.config?.detailTableColumns) return
    const newColumns = field.config.detailTableColumns.map((col, i) => i === columnIndex ? { ...col, ...updates } : col)
    handleUpdateField(fieldId, { config: { ...field.config, detailTableColumns: newColumns } })
  }

  const handleDeleteColumn = (fieldId: string, columnIndex: number) => {
    const field = fields.find(f => f.id === fieldId)
    if (!field || !field.config?.detailTableColumns) return
    const newColumns = field.config.detailTableColumns.filter((_, i) => i !== columnIndex)
    handleUpdateField(fieldId, { config: { ...field.config, detailTableColumns: newColumns } })
  }

  return (
    <div className="h-full flex flex-col bg-[#f5f6f7]">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="返回"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <input
            type="text"
            value={templateName}
            onChange={(e) => handleTemplateNameChange(e.target.value)}
            placeholder="请输入表单名称"
            className="flex-1 px-4 py-2 text-lg font-semibold text-gray-900 outline-none placeholder-gray-300 bg-transparent focus:bg-gray-50 rounded-lg transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
            >
              取消
            </button>
          )}
          {onSave && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#3370FF] hover:bg-[#2a5fd9] text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              保存
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-60 bg-white border-r border-gray-100 flex-shrink-0 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">字段类型</h3>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((item) => (
                <div
                  key={item.type}
                  draggable
                  onDragStart={() => handleDragStartFromPanel(item.type)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleAddField(item.type)}
                  className="flex flex-col items-center justify-center p-3 bg-gray-50 hover:bg-blue-50 hover:border-[#3370FF] border border-gray-100 rounded-lg cursor-grab active:cursor-grabbing transition-all group"
                >
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-[#3370FF] mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  <span className="text-xs text-gray-600 group-hover:text-[#3370FF]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          onDragOver={(e) => { e.preventDefault(); setDragOverIndex(fields.length) }}
          onDrop={(e) => handleDrop(e, fields.length)}
        >
          <div className="max-w-3xl mx-auto p-8">
            {fields.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#3370FF]/40 hover:bg-blue-50/30 transition-all"
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(0) }}
                onDrop={(e) => handleDrop(e, 0)}
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-1">拖拽左侧字段到此处或点击添加</p>
                <p className="text-gray-400 text-xs">从左侧选择字段类型开始设计表单</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleDragStartFromCanvas(field.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={`relative bg-white rounded-xl p-5 border transition-all cursor-pointer ${
                      selectedFieldId === field.id
                        ? 'border-[#3370FF] ring-2 ring-[#3370FF]/10 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    } ${dragOverIndex === index ? 'border-t-2 border-t-[#3370FF]' : ''}`}
                  >
                    {dragOverIndex === index && (
                      <div className="absolute top-0 left-4 right-4 h-0.5 bg-[#3370FF] -translate-y-1/2 rounded-full" />
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">
                            {field.label || '未命名字段'}
                            {field.isRequired && <span className="text-red-400 ml-1">*</span>}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                            {FIELD_TYPES.find(f => f.type === field.type)?.label || field.type}
                          </span>
                          {field.isHidden && (
                            <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-xs rounded-full">已隐藏</span>
                          )}
                        </div>
                        {field.placeholder && (
                          <p className="text-xs text-gray-400 ml-6">提示: {field.placeholder}</p>
                        )}
                        {field.helpText && (
                          <p className="text-xs text-gray-400 ml-6">说明: {field.helpText}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id) }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <div
                  className="h-2 rounded-lg transition-all"
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(fields.length) }}
                  onDrop={(e) => handleDrop(e, fields.length)}
                >
                  {dragOverIndex === fields.length && (
                    <div className="h-1 bg-[#3370FF] rounded-full mx-4" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-72 bg-white border-l border-gray-100 flex-shrink-0 overflow-y-auto">
          {selectedField ? (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">字段属性</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">字段标签</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => handleUpdateField(selectedField.id, { label: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">字段Key</label>
                  <input
                    type="text"
                    value={selectedField.fieldKey}
                    onChange={(e) => handleUpdateField(selectedField.id, { fieldKey: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                  />
                </div>

                {selectedField.type !== 'detailTable' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">占位文本</label>
                    <input
                      type="text"
                      value={selectedField.placeholder || ''}
                      onChange={(e) => handleUpdateField(selectedField.id, { placeholder: e.target.value })}
                      placeholder="请输入占位文本"
                      className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">帮助说明</label>
                  <input
                    type="text"
                    value={selectedField.helpText || ''}
                    onChange={(e) => handleUpdateField(selectedField.id, { helpText: e.target.value })}
                    placeholder="填写此字段的说明提示"
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                  />
                </div>

                {selectedField.type !== 'detailTable' && selectedField.type !== 'attachment' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">默认值</label>
                    {selectedField.type === 'textarea' ? (
                      <textarea
                        value={String(selectedField.defaultValue || '')}
                        onChange={(e) => handleUpdateField(selectedField.id, { defaultValue: e.target.value })}
                        rows={2}
                        placeholder="默认值"
                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 resize-none"
                      />
                    ) : selectedField.type === 'multiSelect' ? (
                      <div className="text-xs text-gray-400 px-3 py-2 bg-gray-50 rounded-lg">
                        多选默认值在选项中设置
                      </div>
                    ) : (
                      <input
                        type={selectedField.type === 'number' || selectedField.type === 'money' ? 'number' : 'text'}
                        value={String(selectedField.defaultValue || '')}
                        onChange={(e) => {
                          const val = selectedField.type === 'number' || selectedField.type === 'money'
                            ? e.target.value === '' ? null : Number(e.target.value)
                            : e.target.value
                          handleUpdateField(selectedField.id, { defaultValue: val })
                        }}
                        placeholder="默认值"
                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                      />
                    )}
                  </div>
                )}

                {(selectedField.type === 'select' || selectedField.type === 'multiSelect') && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-700">选项列表</label>
                      <button
                        onClick={() => handleAddOption(selectedField.id)}
                        className="text-xs text-[#3370FF] hover:text-[#2a5fd9] font-medium"
                      >
                        + 添加选项
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedField.options?.map((opt, idx) => (
                        <div key={opt.value} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => handleUpdateOption(selectedField.id, idx, { label: e.target.value })}
                            placeholder={`选项${idx + 1}`}
                            className="flex-1 px-3 py-1.5 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                          />
                          <button
                            onClick={() => handleDeleteOption(selectedField.id, idx)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedField.type === 'detailTable' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-700">表格列</label>
                      <button
                        onClick={() => handleAddColumn(selectedField.id)}
                        className="text-xs text-[#3370FF] hover:text-[#2a5fd9] font-medium"
                      >
                        + 添加列
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedField.config?.detailTableColumns?.map((col, idx) => (
                        <div key={col.key} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                          <input
                            type="text"
                            value={col.label}
                            onChange={(e) => handleUpdateColumn(selectedField.id, idx, { label: e.target.value })}
                            placeholder="列名称"
                            className="flex-1 px-2 py-1 bg-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 border border-gray-200"
                          />
                          <select
                            value={col.type}
                            onChange={(e) => handleUpdateColumn(selectedField.id, idx, { type: e.target.value as FormFieldType })}
                            className="px-2 py-1 bg-white rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 border border-gray-200"
                          >
                            <option value="text">文本</option>
                            <option value="number">数字</option>
                            <option value="money">金额</option>
                            <option value="date">日期</option>
                            <option value="select">单选</option>
                          </select>
                          <button
                            onClick={() => handleDeleteColumn(selectedField.id, idx)}
                            className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedField.type === 'money' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">小数位数</label>
                    <select
                      value={selectedField.config?.precision ?? 2}
                      onChange={(e) => handleUpdateField(selectedField.id, { config: { ...selectedField.config, precision: Number(e.target.value) } })}
                      className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                    >
                      <option value={0}>0位</option>
                      <option value={1}>1位</option>
                      <option value={2}>2位</option>
                      <option value={4}>4位</option>
                    </select>
                  </div>
                )}

                {(selectedField.type === 'member' || selectedField.type === 'department' || selectedField.type === 'attachment') && (
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">
                      {selectedField.type === 'attachment' ? '允许多个文件' : '允许多选'}
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selectedField.config?.allowMultiple}
                        onChange={(e) => handleUpdateField(selectedField.id, { config: { ...selectedField.config, allowMultiple: e.target.checked } })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3370FF]" />
                    </label>
                  </div>
                )}

                {selectedField.type === 'attachment' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">最大数量</label>
                    <input
                      type="number"
                      min={1}
                      value={selectedField.config?.maxCount ?? 5}
                      onChange={(e) => handleUpdateField(selectedField.id, { config: { ...selectedField.config, maxCount: Number(e.target.value) } })}
                      className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">必填项</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedField.isRequired}
                        onChange={(e) => handleUpdateField(selectedField.id, { isRequired: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3370FF]" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">隐藏字段</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedField.isHidden}
                        onChange={(e) => handleUpdateField(selectedField.id, { isHidden: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3370FF]" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">禁用编辑</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedField.isDisabled}
                        onChange={(e) => handleUpdateField(selectedField.id, { isDisabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3370FF]" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 mb-1">选择字段进行编辑</p>
              <p className="text-xs text-gray-400">点击画布中的字段查看属性</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FormDesigner
