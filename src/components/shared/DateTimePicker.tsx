'use client'

interface DateTimePickerProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  label?: string
  error?: string
}

function parseDateTime(value?: string): { datePart: string; timePart: string } {
  if (!value) return { datePart: '', timePart: '' }
  // Handle both "YYYY-MM-DDTHH:mm" and "YYYY-MM-DD HH:mm"
  const normalized = value.replace(' ', 'T')
  const tIndex = normalized.indexOf('T')
  if (tIndex === -1) return { datePart: normalized, timePart: '' }
  return {
    datePart: normalized.slice(0, tIndex),
    timePart: normalized.slice(tIndex + 1, tIndex + 6), // HH:mm only
  }
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
  id,
  name,
  className,
  label,
  error,
}: DateTimePickerProps) {
  const { datePart, timePart } = parseDateTime(value)

  function handleDateChange(newDate: string) {
    onChange(`${newDate}T${timePart || '00:00'}`)
  }

  function handleTimeChange(newTime: string) {
    onChange(`${datePart || ''}T${newTime}`)
  }

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <input
          type="date"
          id={id}
          name={name}
          value={datePart}
          onChange={(e) => handleDateChange(e.target.value)}
          disabled={disabled}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <input
          type="time"
          value={timePart}
          onChange={(e) => handleTimeChange(e.target.value)}
          disabled={disabled}
          className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
