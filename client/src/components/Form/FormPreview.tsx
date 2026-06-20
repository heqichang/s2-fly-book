import { useMemo } from 'react'
import type { FormField } from '../../types'
import FormFieldRenderer from './FormFieldRenderer'

interface FormPreviewProps {
  fields: FormField[]
  templateName?: string
  templateDescription?: string
  onBack?: () => void
}

function FormPreview({ fields, templateName, templateDescription, onBack }: FormPreviewProps) {
  const visibleFields = useMemo(() => {
    return fields
      .filter(f => !f.isHidden)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [fields])

  const defaultFormData = useMemo(() => {
    const data: Record<string, unknown> = {}
    visibleFields.forEach(field => {
      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        data[field.fieldKey] = field.defaultValue
      }
    })
    return data
  }, [visibleFields])

  return (
    <div className="h-full bg-[#f5f6f7] overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="返回"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3370FF] to-[#6a8cff] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {templateName || '未命名表单'}
                  </h1>
                </div>
                {templateDescription && (
                  <p className="text-sm text-gray-500 ml-12">{templateDescription}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            {visibleFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-1">暂无字段</p>
                <p className="text-gray-400 text-xs">请先添加表单字段</p>
              </div>
            ) : (
              <div className="space-y-6">
                {visibleFields.map((field) => (
                  <FormFieldRenderer
                    key={field.id}
                    field={field}
                    value={defaultFormData[field.fieldKey]}
                    preview
                  />
                ))}
              </div>
            )}
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              共 {visibleFields.length} 个字段 · 表单预览
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FormPreview
