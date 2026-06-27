'use client'

import { useActionState, useState } from 'react'
import { leaveWorkspace, deleteWorkspace, type DangerState } from '@/lib/actions/settings'
import { useFormToast } from '@/hooks/use-form-toast'
import { Modal } from '@/components/ui/modal'

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
  useFormToast(leaveState)
  useFormToast(deleteState)

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-[var(--flowrit-danger)]">위험 구역</h2>

      {/* 탈퇴 (MEMBER만) */}
      {!isOwner && (
        <div className="rounded-[var(--flowrit-radius-panel)] border border-red-200 p-5">
          <h3 className="mb-1 text-sm font-semibold text-[var(--flowrit-text)]">워크스페이스 탈퇴</h3>
          <p className="mb-4 text-sm text-[var(--flowrit-text-muted)]">
            워크스페이스에서 탈퇴합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setShowLeaveDialog(true)}
            className="flowrit-button-secondary text-[var(--flowrit-danger)]"
          >
            워크스페이스 탈퇴
          </button>

          <Modal
            open={showLeaveDialog}
            onClose={() => setShowLeaveDialog(false)}
            title="정말 탈퇴하시겠습니까?"
            maxWidth="sm"
            description="워크스페이스에서 탈퇴하면 모든 데이터에 대한 접근 권한을 잃습니다."
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setShowLeaveDialog(false)}
                  className="flowrit-button-secondary"
                >
                  취소
                </button>
                <form action={leaveAction}>
                  <button
                    type="submit"
                    disabled={leavePending}
                    className="flowrit-button-primary flowrit-button-danger"
                  >
                    {leavePending ? '처리 중...' : '탈퇴'}
                  </button>
                </form>
              </>
            }
          >
            {leaveState?.error && <p className="flowrit-form-error">{leaveState.error}</p>}
          </Modal>
        </div>
      )}

      {/* 삭제 (OWNER만) */}
      {isOwner && (
        <div className="rounded-[var(--flowrit-radius-panel)] border border-red-200 p-5">
          <h3 className="mb-1 text-sm font-semibold text-[var(--flowrit-text)]">워크스페이스 삭제</h3>
          <p className="mb-4 text-sm text-[var(--flowrit-text-muted)]">
            워크스페이스와 모든 데이터(프로젝트, 고객, 팀원)를 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="flowrit-button-primary flowrit-button-danger"
          >
            워크스페이스 삭제
          </button>

          <Modal
            open={showDeleteDialog}
            onClose={() => { setShowDeleteDialog(false); setConfirmText('') }}
            title="워크스페이스를 삭제하시겠습니까?"
            maxWidth="sm"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => { setShowDeleteDialog(false); setConfirmText('') }}
                  className="flowrit-button-secondary"
                >
                  취소
                </button>
                <form action={deleteAction}>
                  <input type="hidden" name="confirmText" value={confirmText} />
                  <button
                    type="submit"
                    disabled={deletePending || confirmText !== workspaceName}
                    className="flowrit-button-primary flowrit-button-danger"
                  >
                    {deletePending ? '삭제 중...' : '영구 삭제'}
                  </button>
                </form>
              </>
            }
          >
            <p className="mb-4 text-sm text-[var(--flowrit-text-secondary)]">
              이 작업은 되돌릴 수 없습니다. 아래에 워크스페이스 이름{' '}
              <strong className="text-[var(--flowrit-text)]">{workspaceName}</strong>을 입력하여 확인하세요.
            </p>
            <label
              htmlFor="delete-confirm"
              className="mb-1 block text-xs font-medium text-[var(--flowrit-text-secondary)]"
            >
              워크스페이스 이름 확인
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={workspaceName}
              className="flowrit-input"
            />
            {deleteState?.error && <p className="flowrit-form-error mt-3">{deleteState.error}</p>}
          </Modal>
        </div>
      )}
    </div>
  )
}
