export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-gray-200 border-t-indigo-600" />
        <p className="text-sm font-medium text-gray-400">로딩 중...</p>
      </div>
    </div>
  )
}
