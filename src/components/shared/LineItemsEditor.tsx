'use client'

import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export interface LineColumn<T> {
  id: string
  header: string
  /** The cell's editor (usually a registered input: `register(\`skills.${index}.tradeCode\`)`). */
  cell: (item: T, index: number) => ReactNode
  className?: string
}

interface LineItemsEditorProps<T> {
  items: T[]
  columns: LineColumn<T>[]
  /** Stable key per row: useFieldArray's `field.id`. */
  getKey: (item: T, index: number) => string
  onAdd?: () => void
  onRemove?: (index: number) => void
  addLabel: string
  removeLabel: string
  emptyText: string
  readOnly?: boolean
  /** A row's message (e.g. the API's 400 for `lines[2]`), shown under the row. */
  rowError?: (index: number) => string | undefined
  /** A message for the whole list (e.g. `skills: "MECHANIC is listed twice"`). */
  error?: string
}

/**
 * The inline line-item grid (prompt 04): add / remove rows, one editor per cell.
 * Stateless: the form owns the rows (react-hook-form useFieldArray), this only lays them out,
 * so every later line grid (WO parts, PO lines, …) reuses it with its own columns.
 */
export function LineItemsEditor<T>({
  items, columns, getKey, onAdd, onRemove, addLabel, removeLabel, emptyText, readOnly, rowError, error,
}: LineItemsEditorProps<T>) {
  const editable = !readOnly
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
              {columns.map((c) => (
                <th key={c.id} className={`px-3 py-2 text-left text-xs font-medium text-gray-500 ${c.className ?? ''}`}>{c.header}</th>
              ))}
              {editable && onRemove && <th className="w-12" aria-label={removeLabel} />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-4 text-center text-sm text-gray-400">{emptyText}</td>
              </tr>
            ) : (
              items.map((item, index) => {
                const message = rowError?.(index)
                return (
                  <tr key={getKey(item, index)} className="align-top">
                    <td className="px-3 py-2 text-xs text-gray-400">{index + 1}</td>
                    {columns.map((c) => (
                      <td key={c.id} className={`px-3 py-2 ${c.className ?? ''}`}>
                        {c.cell(item, index)}
                        {message && c === columns[0] && <p className="mt-1 text-xs text-red-500">{message}</p>}
                      </td>
                    ))}
                    {editable && onRemove && (
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onRemove(index)}
                          title={removeLabel}
                          aria-label={`${removeLabel} ${index + 1}`}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {editable && onAdd && (
        <div>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            <Plus size={14} /> {addLabel}
          </button>
        </div>
      )}
    </div>
  )
}
