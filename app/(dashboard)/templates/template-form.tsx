'use client'

import { useActionState, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  createWorkflowTemplate,
  updateWorkflowTemplate,
  type TemplateFormState,
} from '@/lib/actions/template'

type StageDraft = {
  key: string
  internalName: string
  customerName: string
}

type TemplateFormProps = {
  mode: 'create' | 'edit'
  template?: {
    id: string
    name: string
    industry: string | null
    stages: {
      id: string
      internalName: string
      customerName: string
      order: number
    }[]
  }
}

const initialState: TemplateFormState = {}

const EMPTY_STAGE: StageDraft = {
  key: 'stage-1',
  internalName: '',
  customerName: '',
}

function initialStages(template: TemplateFormProps['template']): StageDraft[] {
  if (!template) return [EMPTY_STAGE]

  return template.stages.map((stage) => ({
    key: stage.id,
    internalName: stage.internalName,
    customerName: stage.customerName,
  }))
}

export function TemplateForm({ mode, template }: TemplateFormProps) {
  const action = mode === 'create' ? createWorkflowTemplate : updateWorkflowTemplate
  const [state, formAction, pending] = useActionState(action, initialState)
  const [stages, setStages] = useState(() => initialStages(template))

  function updateStage(key: string, field: 'internalName' | 'customerName', value: string) {
    setStages((current) =>
      current.map((stage) =>
        stage.key === key ? { ...stage, [field]: value } : stage
      )
    )
  }

  function addStage() {
    setStages((current) => [
      ...current,
      {
        key: `stage-${Date.now()}-${current.length}`,
        internalName: '',
        customerName: '',
      },
    ])
  }

  function removeStage(key: string) {
    setStages((current) =>
      current.length === 1 ? current : current.filter((stage) => stage.key !== key)
    )
  }

  function moveStage(index: number, direction: -1 | 1) {
    setStages((current) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= current.length) return current

      const next = [...current]
      const targetStage = next[targetIndex]
      next[targetIndex] = next[index]
      next[index] = targetStage
      return next
    })
  }

  return (
    <form action={formAction} className="space-y-5">
      {template && <input type="hidden" name="id" value={template.id} />}

      <div className="grid grid-cols-[1fr_180px] gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={`${mode}-name-${template?.id ?? 'new'}`}>
            템플릿 이름
          </label>
          <input
            id={`${mode}-name-${template?.id ?? 'new'}`}
            name="name"
            required
            defaultValue={template?.name ?? ''}
            placeholder="예: 촬영 후 보정"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={`${mode}-industry-${template?.id ?? 'new'}`}>
            업종
          </label>
          <input
            id={`${mode}-industry-${template?.id ?? 'new'}`}
            name="industry"
            defaultValue={template?.industry ?? ''}
            placeholder="photo"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">단계</h3>
          <button
            type="button"
            onClick={addStage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            단계 추가
          </button>
        </div>

        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div
              key={stage.key}
              className="grid grid-cols-[36px_1fr_1fr_112px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2"
            >
              <div className="text-center text-sm font-medium text-gray-500">{index + 1}</div>
              <input
                name="stageInternalName"
                value={stage.internalName}
                onChange={(event) =>
                  updateStage(stage.key, 'internalName', event.target.value)
                }
                placeholder="내부 표시명"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                name="stageCustomerName"
                value={stage.customerName}
                onChange={(event) =>
                  updateStage(stage.key, 'customerName', event.target.value)
                }
                placeholder="고객 표시명"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => moveStage(index, -1)}
                  disabled={index === 0}
                  className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="위로 이동"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStage(index, 1)}
                  disabled={index === stages.length - 1}
                  className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="아래로 이동"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStage(stage.key)}
                  disabled={stages.length === 1}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="단계 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '저장 중...' : mode === 'create' ? '템플릿 생성' : '변경사항 저장'}
      </button>
    </form>
  )
}
