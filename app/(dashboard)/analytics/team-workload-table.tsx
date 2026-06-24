type WorkloadRow = {
  name: string
  email?: string
  activeProjects: number
  pendingRevisions: number
}

export function TeamWorkloadTable({ rows }: { rows: WorkloadRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
              <th className="px-4 py-3">담당자</th>
              <th className="px-4 py-3 text-right">진행 중 프로젝트</th>
              <th className="px-4 py-3 text-right">미완료 수정 요청</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={`${row.name}-${row.email ?? 'none'}`} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{row.name}</p>
                  {row.email && <p className="mt-0.5 text-xs text-gray-400">{row.email}</p>}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {row.activeProjects}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {row.pendingRevisions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
