export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">대시보드</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          새 프로젝트
        </button>
      </div>
      <p className="text-sm text-gray-500">T028, T031에서 구현 예정</p>
    </div>
  )
}
