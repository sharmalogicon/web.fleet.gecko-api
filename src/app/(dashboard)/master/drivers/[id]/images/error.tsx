'use client'

interface ErrorProps {
  error: Error
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-sm text-red-600">{error.message || 'Something went wrong loading driver photos.'}</p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      >
        Try again
      </button>
    </div>
  )
}
