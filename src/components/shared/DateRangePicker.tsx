'use client'

interface DateRangePickerProps {
  fromValue?: string
  toValue?: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  fromLabel?: string
  toLabel?: string
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  fromLabel,
  toLabel,
  disabled,
  className,
}: DateRangePickerProps) {
  return (
    <div className={`flex items-end gap-2 ${className ?? ''}`}>
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">
          {fromLabel ?? 'From'}
        </label>
        <input
          type="date"
          value={fromValue ?? ''}
          onChange={(e) => onFromChange(e.target.value)}
          max={toValue || undefined}
          disabled={disabled}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>
      <span className="text-gray-400 pb-2">—</span>
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">
          {toLabel ?? 'To'}
        </label>
        <input
          type="date"
          value={toValue ?? ''}
          onChange={(e) => onToChange(e.target.value)}
          min={fromValue || undefined}
          disabled={disabled}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>
    </div>
  )
}
