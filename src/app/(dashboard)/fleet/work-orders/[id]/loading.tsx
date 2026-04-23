export default function WorkOrderDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-blue-100 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )
}
