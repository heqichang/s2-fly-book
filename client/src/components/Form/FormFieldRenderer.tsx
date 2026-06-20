import { useState } from 'react'
import type { FormField, FormFieldOption, DetailTableColumn } from '../../types'
import Avatar from '../common/Avatar'
import FileIcon from '../File/FileIcon'

interface FormFieldRendererProps {
  field: FormField
  value: unknown
  onChange?: (value: unknown) => void
  readonly?: boolean
  preview?: boolean
}

interface UserOption {
  id: string
  nickname: string
  avatar?: string | null
}

interface DepartmentOption {
  id: string
  name: string
}

interface FileValue {
  id: string
  name: string
  url: string
  size?: number
  mimeType?: string
}

const mockUsers: UserOption[] = [
  { id: '1', nickname: '张三', avatar: null },
  { id: '2', nickname: '李四', avatar: null },
  { id: '3', nickname: '王五', avatar: null },
  { id: '4', nickname: '赵六', avatar: null }
]

const mockDepartments: DepartmentOption[] = [
  { id: '1', name: '技术部' },
  { id: '2', name: '产品部' },
  { id: '3', name: '设计部' },
  { id: '4', name: '市场部' }
]

function formatNumber(num: number | null | undefined, precision?: number): string {
  if (num === null || num === undefined || isNaN(num)) return ''
  if (precision === undefined || precision === null) return String(num)
  return num.toFixed(precision)
}

function FormFieldRenderer({ field, value, onChange, readonly = false, preview = false }: FormFieldRendererProps) {
  const [showSelectDropdown, setShowSelectDropdown] = useState(false)
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false)

  const handleChange = (newValue: unknown) => {
    if (!readonly && !preview && onChange) {
      onChange(newValue)
    }
  }

  const renderLabel = () => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {field.label}
      {field.isRequired && !preview && <span className="text-red-400 ml-1">*</span>}
    </label>
  )

  const renderHelpText = () => (
    field.helpText && !preview && (
      <p className="mt-1.5 text-xs text-gray-400">{field.helpText}</p>
    )
  )

  const baseInputClass = readonly || preview
    ? 'w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-600 cursor-not-allowed'
    : 'w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20 focus:bg-white transition-all placeholder-gray-400 border border-transparent focus:border-[#3370FF]/20'

  const renderTextField = () => (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={field.placeholder || ''}
      disabled={readonly || preview}
      className={baseInputClass}
    />
  )

  const renderTextareaField = () => (
    <textarea
      value={String(value ?? '')}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={field.placeholder || ''}
      disabled={readonly || preview}
      rows={4}
      className={`${baseInputClass} resize-none`}
    />
  )

  const renderNumberField = () => (
    <input
      type="number"
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(e) => handleChange(e.target.value === '' ? null : Number(e.target.value))}
      placeholder={field.placeholder || ''}
      disabled={readonly || preview}
      className={baseInputClass}
    />
  )

  const renderDateField = () => (
    <input
      type="date"
      value={String(value ?? '')}
      onChange={(e) => handleChange(e.target.value)}
      disabled={readonly || preview}
      className={baseInputClass}
    />
  )

  const renderTimeField = () => (
    <input
      type="time"
      value={String(value ?? '')}
      onChange={(e) => handleChange(e.target.value)}
      disabled={readonly || preview}
      className={baseInputClass}
    />
  )

  const renderSelectField = () => {
    const options = field.options || []
    const selectedOption = options.find(o => o.value === value)

    if (readonly || preview) {
      return (
        <div className="w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-600">
          {selectedOption?.label || '-'}
        </div>
      )
    }

    return (
      <div className="relative">
        <div
          onClick={() => setShowSelectDropdown(!showSelectDropdown)}
          className={`${baseInputClass} cursor-pointer flex items-center justify-between`}
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {selectedOption?.label || field.placeholder || '请选择'}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${showSelectDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {showSelectDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowSelectDropdown(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 max-h-60 overflow-y-auto">
              {options.map((opt: FormFieldOption) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    handleChange(opt.value)
                    setShowSelectDropdown(false)
                  }}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                    value === opt.value ? 'bg-blue-50 text-[#3370FF]' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </div>
              ))}
              {options.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">暂无选项</div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  const renderMultiSelectField = () => {
    const options = field.options || []
    const selectedValues: string[] = Array.isArray(value) ? value as string[] : []

    if (readonly || preview) {
      const selectedOptions = options.filter(o => selectedValues.includes(o.value))
      return (
        <div className="flex flex-wrap gap-1.5 min-h-[44px] px-4 py-2.5 bg-gray-50 rounded-lg">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(opt => (
              <span key={opt.value} className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                {opt.label}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </div>
      )
    }

    const toggleOption = (optValue: string) => {
      const newValues = selectedValues.includes(optValue)
        ? selectedValues.filter(v => v !== optValue)
        : [...selectedValues, optValue]
      handleChange(newValues)
    }

    return (
      <div className={`${baseInputClass} min-h-[44px]`}>
        <div className="flex flex-wrap gap-1.5">
          {options.length > 0 ? (
            options.map((opt: FormFieldOption) => {
              const isSelected = selectedValues.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOption(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#3370FF] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })
          ) : (
            <span className="text-gray-400 text-sm">暂无选项</span>
          )}
        </div>
      </div>
    )
  }

  const renderMemberField = () => {
    const allowMultiple = !!field.config?.allowMultiple
    const selectedUserIds: string[] = allowMultiple
      ? (Array.isArray(value) ? value as string[] : [])
      : (value ? [String(value)] : [])
    const selectedUsers = mockUsers.filter(u => selectedUserIds.includes(u.id))

    if (readonly || preview) {
      return (
        <div className="flex flex-wrap gap-2 min-h-[44px] px-4 py-2.5 bg-gray-50 rounded-lg">
          {selectedUsers.length > 0 ? (
            selectedUsers.map(user => (
              <div key={user.id} className="flex items-center gap-1.5">
                <Avatar src={user.avatar || undefined} nickname={user.nickname} size="sm" />
                <span className="text-sm text-gray-700">{user.nickname}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </div>
      )
    }

    const toggleUser = (userId: string) => {
      if (allowMultiple) {
        const newValues = selectedUserIds.includes(userId)
          ? selectedUserIds.filter(id => id !== userId)
          : [...selectedUserIds, userId]
        handleChange(newValues)
      } else {
        handleChange(userId)
        setShowMemberDropdown(false)
      }
    }

    return (
      <div className="relative">
        <div
          onClick={() => setShowMemberDropdown(!showMemberDropdown)}
          className={`${baseInputClass} cursor-pointer min-h-[44px]`}
        >
          {selectedUsers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(user => (
                <div key={user.id} className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded-lg">
                  <Avatar src={user.avatar || undefined} nickname={user.nickname} size="sm" />
                  <span className="text-xs text-[#3370FF]">{user.nickname}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-400">{field.placeholder || '请选择成员'}</span>
          )}
        </div>
        {showMemberDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMemberDropdown(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 max-h-60 overflow-y-auto">
              {mockUsers.map(user => {
                const isSelected = selectedUserIds.includes(user.id)
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Avatar src={user.avatar || undefined} nickname={user.nickname} size="sm" />
                    <span className="text-gray-700">{user.nickname}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-[#3370FF] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  const renderDepartmentField = () => {
    const allowMultiple = !!field.config?.allowMultiple
    const selectedDeptIds: string[] = allowMultiple
      ? (Array.isArray(value) ? value as string[] : [])
      : (value ? [String(value)] : [])
    const selectedDepts = mockDepartments.filter(d => selectedDeptIds.includes(d.id))

    if (readonly || preview) {
      return (
        <div className="flex flex-wrap gap-1.5 min-h-[44px] px-4 py-2.5 bg-gray-50 rounded-lg">
          {selectedDepts.length > 0 ? (
            selectedDepts.map(dept => (
              <span key={dept.id} className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {dept.name}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </div>
      )
    }

    const toggleDept = (deptId: string) => {
      if (allowMultiple) {
        const newValues = selectedDeptIds.includes(deptId)
          ? selectedDeptIds.filter(id => id !== deptId)
          : [...selectedDeptIds, deptId]
        handleChange(newValues)
      } else {
        handleChange(deptId)
        setShowDepartmentDropdown(false)
      }
    }

    return (
      <div className="relative">
        <div
          onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
          className={`${baseInputClass} cursor-pointer min-h-[44px]`}
        >
          {selectedDepts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedDepts.map(dept => (
                <span key={dept.id} className="px-2.5 py-1 bg-blue-50 text-[#3370FF] text-xs rounded-full">
                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {dept.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-400">{field.placeholder || '请选择部门'}</span>
          )}
        </div>
        {showDepartmentDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDepartmentDropdown(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 max-h-60 overflow-y-auto">
              {mockDepartments.map(dept => {
                const isSelected = selectedDeptIds.includes(dept.id)
                return (
                  <div
                    key={dept.id}
                    onClick={() => toggleDept(dept.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-700">{dept.name}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-[#3370FF] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  const renderAttachmentField = () => {
    const files: FileValue[] = Array.isArray(value) ? (value as FileValue[]) : []
    const allowMultiple = !!field.config?.allowMultiple
    const maxCount = field.config?.maxCount || 5

    if (readonly || preview) {
      return (
        <div className="space-y-2 min-h-[44px] px-4 py-3 bg-gray-50 rounded-lg">
          {files.length > 0 ? (
            files.map(file => (
              <div key={file.id} className="flex items-center gap-2">
                <FileIcon filename={file.name} />
                <span className="text-sm text-gray-700">{file.name}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </div>
      )
    }

    const handleUploadClick = () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = allowMultiple
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement
        const fileList = target.files
        if (fileList) {
          const newFiles: FileValue[] = Array.from(fileList).map(f => ({
            id: Math.random().toString(36).substring(2, 11),
            name: f.name,
            url: URL.createObjectURL(f),
            size: f.size,
            mimeType: f.type
          }))
          if (allowMultiple) {
            const combined = [...files, ...newFiles].slice(0, maxCount)
            handleChange(combined)
          } else {
            handleChange(newFiles.slice(0, 1))
          }
        }
      }
      input.click()
    }

    const removeFile = (fileId: string) => {
      handleChange(files.filter(f => f.id !== fileId))
    }

    return (
      <div className="space-y-2">
        <div className={`${baseInputClass} p-3 cursor-pointer border-2 border-dashed flex flex-col items-center justify-center gap-2 min-h-[88px] hover:border-[#3370FF]/40 hover:bg-blue-50/30 transition-all`}
          onClick={handleUploadClick}
        >
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm text-gray-500">
            {allowMultiple ? `点击上传文件（最多${maxCount}个）` : '点击上传文件'}
          </span>
        </div>
        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map(file => (
              <div key={file.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <FileIcon filename={file.name} />
                <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                {!readonly && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id) }}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderMoneyField = () => {
    const precision = field.config?.precision ?? 2
    const displayValue = formatNumber(value as number | null | undefined, precision)

    if (readonly || preview) {
      return (
        <div className="w-full px-4 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-600">
          {displayValue ? `¥ ${displayValue}` : '-'}
        </div>
      )
    }

    return (
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
        <input
          type="number"
          step={`${Math.pow(10, -precision)}`}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => handleChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder={field.placeholder || '请输入金额'}
          className={`${baseInputClass} pl-8`}
        />
      </div>
    )
  }

  const renderDetailTableField = () => {
    const columns = field.config?.detailTableColumns || []
    const rows: Record<string, unknown>[] = Array.isArray(value) ? (value as Record<string, unknown>[]) : []

    const addRow = () => {
      const newRow: Record<string, unknown> = {}
      columns.forEach(col => {
        newRow[col.key] = col.type === 'number' || col.type === 'money' ? null : ''
      })
      handleChange([...rows, newRow])
    }

    const removeRow = (index: number) => {
      const newRows = rows.filter((_, i) => i !== index)
      handleChange(newRows)
    }

    const updateCell = (rowIndex: number, colKey: string, newValue: unknown) => {
      const newRows = [...rows]
      newRows[rowIndex] = { ...newRows[rowIndex], [colKey]: newValue }
      handleChange(newRows)
    }

    const getColumnOptions = (col: DetailTableColumn) => {
      if (col.type === 'select') {
        return col.options || []
      }
      return []
    }

    return (
      <div className="space-y-2">
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 border-b border-gray-100">
                    {col.label}
                    {col.isRequired && <span className="text-red-400 ml-0.5">*</span>}
                  </th>
                ))}
                {!readonly && !preview && (
                  <th className="px-2 py-2.5 w-10 border-b border-gray-100" />
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-50 last:border-0">
                    {columns.map((col) => {
                      const cellValue = row[col.key]
                      const cellOptions = getColumnOptions(col)
                      if (readonly || preview) {
                        if (col.type === 'select') {
                          const selected = cellOptions.find(o => o.value === cellValue)
                          return (
                            <td key={col.key} className="px-4 py-2.5 text-gray-600">
                              {selected?.label || '-'}
                            </td>
                          )
                        }
                        if (col.type === 'money') {
                          return (
                            <td key={col.key} className="px-4 py-2.5 text-gray-600">
                              {cellValue !== null && cellValue !== undefined && cellValue !== '' ? `¥ ${formatNumber(cellValue as number, 2)}` : '-'}
                            </td>
                          )
                        }
                        return (
                          <td key={col.key} className="px-4 py-2.5 text-gray-600">
                            {cellValue !== null && cellValue !== undefined && cellValue !== '' ? String(cellValue) : '-'}
                          </td>
                        )
                      }
                      if (col.type === 'select') {
                        return (
                          <td key={col.key} className="px-2 py-1.5">
                            <select
                              value={String(cellValue ?? '')}
                              onChange={(e) => updateCell(rowIndex, col.key, e.target.value || null)}
                              className="w-full px-3 py-1.5 bg-gray-50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                            >
                              <option value="">请选择</option>
                              {cellOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>
                        )
                      }
                      const inputType = col.type === 'number' || col.type === 'money' ? 'number' : col.type === 'date' ? 'date' : 'text'
                      return (
                        <td key={col.key} className="px-2 py-1.5">
                          <input
                            type={inputType}
                            value={cellValue === null || cellValue === undefined ? '' : String(cellValue)}
                            onChange={(e) => {
                              const val = col.type === 'number' || col.type === 'money'
                                ? e.target.value === '' ? null : Number(e.target.value)
                                : e.target.value
                              updateCell(rowIndex, col.key, val)
                            }}
                            placeholder={`请输入${col.label}`}
                            className="w-full px-3 py-1.5 bg-gray-50 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3370FF]/20"
                          />
                        </td>
                      )
                    })}
                    {!readonly && !preview && (
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(rowIndex)}
                          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + (readonly || preview ? 0 : 1)} className="px-4 py-6 text-center text-gray-400 text-sm">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!readonly && !preview && (
          <button
            type="button"
            onClick={addRow}
            className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-[#3370FF]/40 hover:text-[#3370FF] hover:bg-blue-50/30 transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加一行
          </button>
        )}
      </div>
    )
  }

  const renderField = () => {
    switch (field.type) {
      case 'text': return renderTextField()
      case 'textarea': return renderTextareaField()
      case 'number': return renderNumberField()
      case 'date': return renderDateField()
      case 'time': return renderTimeField()
      case 'select': return renderSelectField()
      case 'multiSelect': return renderMultiSelectField()
      case 'member': return renderMemberField()
      case 'department': return renderDepartmentField()
      case 'attachment': return renderAttachmentField()
      case 'money': return renderMoneyField()
      case 'detailTable': return renderDetailTableField()
      default: return renderTextField()
    }
  }

  if (field.isHidden && !preview) {
    return null
  }

  return (
    <div className={preview ? '' : ''}>
      {renderLabel()}
      {renderField()}
      {renderHelpText()}
    </div>
  )
}

export default FormFieldRenderer
