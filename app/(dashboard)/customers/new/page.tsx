import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CustomerForm } from './customer-form'

export default function NewCustomerPage() {
  return (
    <div className="flowrit-page max-w-2xl">
      <Link
        href="/customers"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        고객 목록
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">고객 등록</h1>
        <p className="mt-1 text-sm text-gray-500">
          프로젝트와 수정 요청을 연결할 고객 정보를 먼저 등록합니다.
        </p>
      </div>

      <section className="flowrit-panel-padded">
        <CustomerForm />
      </section>
    </div>
  )
}
