'use client'

import { useState } from 'react'
import { getMockEquipment } from '@/lib/mock/equipment'
import type { Equipment } from '@/types/equipment'

interface AddEquipmentModalProps {
  open: boolean
  onClose: () => void
  onAdd: (equipment: Equipment) => void
  alreadyAddedCodes: string[]
}

export function AddEquipmentModal({ open, onClose, onAdd, alreadyAddedCodes }: AddEquipmentModalProps) {
  const [query, setQuery] = useState('')
  const allEquipment = getMockEquipment()
  const filtered = allEquipment
    .filter((e) => !alreadyAddedCodes.includes(e.code))
    .filter(
      (e) =>
        query === '' ||
        e.code.toLowerCase().includes(query.toLowerCase()) ||
        (e.registrationNo ?? '').toLowerCase().includes(query.toLowerCase()),
    )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Add Equipment to Schedule</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-4">
          <input
            type="text"
            placeholder="Search equipment code or registration..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">No equipment available</p>
            )}
            {filtered.map((e) => (
              <div key={e.equipmentID} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.code}</p>
                  <p className="text-xs text-gray-400">
                    {e.registrationNo ?? '—'} · {e.category ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(e)
                    onClose()
                  }}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
