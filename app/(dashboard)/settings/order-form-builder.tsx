'use client'

import { useEffect, useState, useTransition, useActionState } from 'react'
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, X, Lock, GripVertical } from 'lucide-react'
import { Tooltip } from '@/components/tooltip'
import {
  addOrderFormField,
  updateOrderFormField,
  deleteOrderFormField,
  moveOrderFormField,
  type FormFieldRow,
} from '@/lib/actions/form-fields'

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: '텍스트',
  textarea: '장문',
  date: '날짜',
  select: '선택',
  file: '파일',
}

export function OrderFormBuilder({ fields }: { fields: FormFieldRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const [addState, addAction, addPending] = useActionState(addOrderFormField, {})
  const [editState, editAction, editPending] = useActionState(updateOrderFormField, {})

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (addState.success) setShowAddForm(false) }, [addState.success])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (editState.success) setEditingId(null) }, [editState.success])

  function handleMove(id: string, direction: 'up' | 'down') {
    startTransition(async () => { await moveOrderFormField(id, direction) })
  }

  function handleDelete(id: string) {
    if (!confirm('이 필드를 삭제하시겠습니까?')) return
    startTransition(async () => { await deleteOrderFormField(id) })
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">주문서 폼 필드</h2>
        <p className="mt-1 text-sm text-gray-500">
          고객에게 표시할 필드를 추가하거나 순서를 변경하세요.{' '}
          <Lock className="inline h-3 w-3 text-gray-400" /> 표시 필드는 삭제할 수 없습니다.
        </p>
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-[var(--flowrit-border)] bg-white overflow-hidden">
            {/* 필드 헤더 */}
            <div className="flex items-center gap-3 px-4 py-3">
              <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{field.label}</span>
                  {field.required && <span className="text-red-500 text-xs font-semibold">*</span>}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    {FIELD_TYPE_LABELS[field.type] ?? field.type}
                  </span>
                  {field.isSystem && <Lock className="h-3 w-3 text-gray-400" />}
                </div>
                {field.placeholder && (
                  <p className="mt-0.5 text-xs text-gray-400 truncate">{field.placeholder}</p>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Tooltip content="위로">
                  <button
                    onClick={() => handleMove(field.id, 'up')}
                    disabled={index === 0 || pending}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-25 rounded"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </Tooltip>
                <Tooltip content="아래로">
                  <button
                    onClick={() => handleMove(field.id, 'down')}
                    disabled={index === fields.length - 1 || pending}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-25 rounded"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </Tooltip>
                <Tooltip content="편집">
                  <button
                    onClick={() => setEditingId(editingId === field.id ? null : field.id)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                {!field.isSystem && (
                  <Tooltip content="삭제">
                    <button
                      onClick={() => handleDelete(field.id)}
                      disabled={pending}
                      className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-25 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* 인라인 편집 패널 */}
            {editingId === field.id && (
              <div className="border-t border-[var(--flowrit-border)] bg-gray-50 px-4 py-4">
                <form action={editAction} className="space-y-3">
                  <input type="hidden" name="id" value={field.id} />
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">필드 이름</label>
                    <input name="label" defaultValue={field.label} className="flowrit-input text-sm" required />
                  </div>
                  {field.type !== 'file' && field.type !== 'date' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">플레이스홀더</label>
                      <input
                        name="placeholder"
                        defaultValue={field.placeholder ?? ''}
                        className="flowrit-input text-sm"
                        placeholder="입력 예시 텍스트"
                      />
                    </div>
                  )}
                  {field.type === 'select' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        선택 옵션 <span className="text-gray-400">(줄바꿈으로 구분)</span>
                      </label>
                      <textarea
                        name="options"
                        rows={3}
                        defaultValue={field.options?.join('\n') ?? ''}
                        className="flowrit-input text-sm"
                        placeholder={'옵션 1\n옵션 2\n옵션 3'}
                      />
                    </div>
                  )}
                  {field.fieldKey !== 'name' && field.fieldKey !== 'content' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="required"
                        defaultChecked={field.required}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-xs text-gray-700">필수 입력</span>
                    </label>
                  )}
                  {editState.error && <p className="text-xs text-red-600">{editState.error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={editPending}
                      className="flowrit-button-primary text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      {editPending ? '저장 중...' : '저장'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flowrit-button-secondary text-xs px-3 py-1.5"
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 필드 추가 */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-4 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <Plus className="h-4 w-4" />
          필드 추가
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">새 필드 추가</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form action={addAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">필드 이름 *</label>
                <input name="label" className="flowrit-input text-sm" placeholder="예: 회사명" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">유형 *</label>
                <select name="type" className="flowrit-input text-sm" required>
                  <option value="text">텍스트 (한 줄)</option>
                  <option value="textarea">장문 (여러 줄)</option>
                  <option value="date">날짜</option>
                  <option value="select">선택 (드롭다운)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">플레이스홀더</label>
              <input name="placeholder" className="flowrit-input text-sm" placeholder="입력 예시 텍스트" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                선택 옵션 <span className="text-gray-400">(드롭다운 유형만 사용, 줄바꿈으로 구분)</span>
              </label>
              <textarea
                name="options"
                rows={3}
                className="flowrit-input text-sm"
                placeholder={'옵션 1\n옵션 2\n옵션 3'}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="required"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              <span className="text-xs text-gray-700">필수 입력</span>
            </label>
            {addState.error && <p className="text-xs text-red-600">{addState.error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addPending}
                className="flowrit-button-primary text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {addPending ? '추가 중...' : '필드 추가'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flowrit-button-secondary text-xs px-3 py-1.5"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
