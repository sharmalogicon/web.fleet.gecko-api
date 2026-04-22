export default function DriverProfileLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-80 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )
}
