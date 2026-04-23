'use client'
import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import type { LookupOption } from '@/lib/hooks/lookups/types'

interface AutocompleteProps {
  options: LookupOption[]
  value?: string
  onChange: (value: string, label: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  id?: string
  name?: string
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  className,
  id,
  name,
}: AutocompleteProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Sync query when value changes externally
  useEffect(() => {
    if (value) {
      const match = options.find((o) => o.value === value)
      if (match) setQuery(match.label)
    } else {
      setQuery('')
    }
  }, [value, options])

  const filtered =
    query.length > 0
      ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
      : options.slice(0, 10)

  const select = useCallback(
    (opt: LookupOption) => {
      setQuery(opt.label)
      setOpen(false)
      onChange(opt.value, opt.label)
    },
    [onChange]
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    }
    if (e.key === 'Enter' && open && filtered[highlighted]) {
      e.preventDefault()
      select(filtered[highlighted])
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlighted(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 ${className ?? ''}`}
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-gray-400">Loading…</span>
      )}
      {open && !loading && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => select(opt)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === highlighted ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
      {open && !loading && filtered.length === 0 && query.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-400">
          No results
        </div>
      )}
    </div>
  )
}
