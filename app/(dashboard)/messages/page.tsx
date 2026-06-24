import { getMessageTemplates } from '@/lib/actions/message'
import { MessagesPageClient } from './messages-page-client'

export default async function MessagesPage() {
  const templates = await getMessageTemplates()

  return (
    <div className="flowrit-page">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">메시지 템플릿</h1>
        <p className="mt-1 text-sm text-gray-500">
          고객에게 보낼 메시지 템플릿을 관리합니다. 프로젝트에서 변수를 치환해 바로 복사할 수 있습니다.
        </p>
      </div>

      <MessagesPageClient templates={templates} />
    </div>
  )
}
