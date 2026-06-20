import { useMemo, useState } from 'react'
import type { FormField } from '../../types'
import FormFieldRenderer from './FormFieldRenderer'

interface FormFillerProps {
  fields: FormField[]
  formData: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  readonly?: boolean
  templateName?: string
  templateDescription?: string
  onSubmit?: () => void
  onCancel?: () => void
  submitText?: string
}

function FormFiller({
  fields,
  formData,
  onChange,
  readonly = false,
  templateName,
  templateDescription,
  onSubmit,
  onCancel,
  submitText = '提交'
}: FormFillerProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const visibleFields = useMemo(() => {
    return fields
      .filter(f => !f.isHidden)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [fields])

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    const newData = { ...formData, [fieldKey]: value }
    onChange(newData)
    if (errors[fieldKey]) {
      const newErrors = { ...errors }
      delete newErrors[fieldKey]
      setErrors(newErrors)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    visibleFields.forEach(field => {
      if (field.isRequired) {
        const value = formData[field.fieldKey]
        if (value === undefined || value === null || value === '') {
          newErrors[field.fieldKey] = `${field.label}不能为空`
        } else if (Array.isArray(value) && value.length === 0) {
          newErrors[field.fieldKey] = `${field.label}不能为空`
        }
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onSubmit?.()
    }
  }

  return (
    <div className="h-full bg-[#f5f6f7] overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {(templateName || templateDescription) && (
            <div className="px-8 py-6 border-b border-gray-100">
              {templateName && (
                <h1 className="text-xl font-semibold text-gray-900 mb-1">{templateName}</h1>
              )}
              {templateDescription && (
                <p className="text-sm text-gray-500">{templateDescription}</p>
              )}
            </div>
          )}

          <div className="px-8 py-6">
            {visibleFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">暂无字段</p>
              </div>
            ) : (
              <div className="space-y-6">
                {visibleFields.map((field) => (
                  <div key={field.id}>
                    <FormFieldRenderer
                      field={field}
                      value={formData[field.fieldKey]}
                      onChange={(value) => handleFieldChange(field.fieldKey, value)}
                      readonly={readonly || field.isDisabled}
                    />
                    {errors[field.fieldKey] && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors[field.fieldKey]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!readonly && visibleFields.length > 0 && (onSubmit || onCancel) && (
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
                >
                  取消
                </button>
              )}
              {onSubmit && (
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2.5 bg-[#3370FF] hover:bg-[#2a5fd9] text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {submitText}
                </button>
              )}
            </div>
          )}
        </div>

        {readonly && (
          <div className="mt-4 text-center text-xs text-gray-400">
            此表单为只读模式
          </div>
        )}
      </div>
    </div>
  )
}

export default FormFiller
