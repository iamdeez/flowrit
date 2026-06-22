'use client'

import { useActionState } from 'react'
import { updateNotificationSettings, type NotificationSettingsState } from '@/lib/actions/settings'
import { useFormToast } from '@/hooks/use-form-toast'

const initialState: NotificationSettingsState = {}

const NOTIFICATION_ITEMS = [
  {
    key: 'notify_new_inquiry',
    label: '새 의뢰 접수',
    description: '새 의뢰가 접수되면 이메일로 알림을 받습니다.',
  },
  {
    key: 'notify_revision_submitted',
    label: '수정 요청 제출',
    description: '고객이 수정 요청을 제출하면 알림을 받습니다.',
  },
  {
    key: 'notify_stage_changed',
    label: '단계 변경',
    description: '담당 프로젝트의 단계가 변경되면 알림을 받습니다.',
  },
  {
    key: 'notify_deadline_reminder',
    label: '마감일 리마인더',
    description: '마감 24시간 전 알림을 받습니다.',
  },
]

export function NotificationForm({
  settings,
}: {
  settings: Record<string, boolean>
}) {
  const [state, action, pending] = useActionState(updateNotificationSettings, initialState)
  useFormToast(state)

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">알림 설정</h2>
        <p className="text-sm text-gray-500 mb-4">이메일 알림 수신 여부를 설정합니다.</p>
      </div>

      <div className="space-y-4">
        {NOTIFICATION_ITEMS.map((item) => {
          const checked = settings[item.key] !== false
          return (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  name={item.key}
                  defaultChecked={checked}
                  value="on"
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-indigo-600 transition-colors" />
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </label>
          )
        })}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flowrit-button-primary disabled:opacity-50"
      >
        {pending ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}
