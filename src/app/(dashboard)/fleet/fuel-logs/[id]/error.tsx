'use client'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function FuelLogDetailError({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <p className="text-red-600 font-medium">Something went wrong loading this fuel log.</p>
      <p className="text-sm text-gray-500">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}
