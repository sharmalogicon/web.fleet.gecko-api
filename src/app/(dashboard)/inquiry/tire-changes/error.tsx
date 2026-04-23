'use client'

export default function TireChangeInquiryError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <p className="text-sm text-red-600">Failed to load tire change inquiry: {error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}
