import { SidebarNav } from '@/components/sidebar-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <p className="text-lg font-bold text-indigo-600">Flowrit</p>
          <p className="text-xs text-gray-400 mt-0.5">나의 작업실</p>
        </div>
        <SidebarNav />
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
