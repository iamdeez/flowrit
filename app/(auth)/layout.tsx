export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-indigo-600">Flowrit</span>
        </div>
        {children}
      </div>
    </div>
  )
}
