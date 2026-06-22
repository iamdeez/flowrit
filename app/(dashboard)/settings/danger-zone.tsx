'use client'

import { useActionState, useState } from 'react'
import { leaveWorkspace, deleteWorkspace, type DangerState } from '@/lib/actions/settings'

const initialState: DangerState = {}

export function DangerZone({
  isOwner,
  workspaceName,
}: {
  isOwner: boolean
  workspaceName: string
}) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const [leaveState, leaveAction, leavePending] = useActionState(leaveWorkspace, initialState)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteWorkspace, initialState)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-red-600 mb-4">위험 구역</h2>
      </div>

      {/* 탈퇴 (MEMBER만) */}
      {!isOwner && (
        <div className="border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">워크스페이스 탈퇴</h3>
          <p className="text-sm text-gray-500 mb-4">
            워크스페이스에서 탈퇴합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setShowLeaveDialog(true)}
            className="px-4 py-2 bg-white border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            워크스페이스 탈퇴
          </button>

          {/* 탈퇴 확인 다이얼로그 */}
          {showLeaveDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
                <h4 className="text-base font-semibold text-gray-900 mb-2">정말 탈퇴하시겠습니까?</h4>
                <p className="text-sm text-gray-500 mb-5">
                  워크스페이스에서 탈퇴하면 모든 데이터에 대한 접근 권한을 잃습니다.
                </p>
                {leaveState?.error && (
                  <p className="text-sm text-red-600 mb-3">{leaveState.error}</p>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowLeaveDialog(false)}
                    className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <form action={leaveAction}>
                    <button
                      type="submit"
                      disabled={leavePending}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {leavePending ? '처리 중...' : '탈퇴'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 삭제 (OWNER만) */}
      {isOwner && (
        <div className="border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">워크스페이스 삭제</h3>
          <p className="text-sm text-gray-500 mb-4">
            워크스페이스와 모든 데이터(프로젝트, 고객, 팀원)를 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            워크스페이스 삭제
          </button>

          {/* 삭제 확인 다이얼로그 */}
          {showDeleteDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
                <h4 className="text-base font-semibold text-gray-900 mb-2">워크스페이스를 삭제하시겠습니까?</h4>
                <p className="text-sm text-gray-500 mb-4">
                  이 작업은 되돌릴 수 없습니다. 아래에 워크스페이스 이름{' '}
                  <strong className="text-gray-900">{workspaceName}</strong>을 입력하여 확인하세요.
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={workspaceName}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {deleteState?.error && (
                  <p className="text-sm text-red-600 mb-3">{deleteState.error}</p>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowDeleteDialog(false); setConfirmText('') }}
                    className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <form action={deleteAction}>
                    <input type="hidden" name="confirmText" value={confirmText} />
                    <button
                      type="submit"
                      disabled={deletePending || confirmText !== workspaceName}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletePending ? '삭제 중...' : '영구 삭제'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
