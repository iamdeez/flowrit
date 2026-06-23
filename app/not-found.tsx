import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="mb-2 text-sm font-medium text-indigo-600">404</p>
        <h1 className="mb-3 text-2xl font-semibold text-gray-900">페이지를 찾을 수 없습니다</h1>
        <p className="mb-8 text-sm text-gray-500">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          대시보드로
        </Link>
      </div>
    </div>
  )
}
