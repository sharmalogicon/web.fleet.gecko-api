'use client'

import { getMockEquipment } from '@/lib/mock/equipment'

interface ReportPreviewProps {
  reportId: string | null
  reportLabel: string | null
  generated: boolean
}

const PLACEHOLDER_ROWS = [
  { col1: 'REF-001', col2: 'Category A', col3: '฿12,500' },
  { col1: 'REF-002', col2: 'Category B', col3: '฿8,750' },
  { col1: 'REF-003', col2: 'Category A', col3: '฿21,000' },
  { col1: 'REF-004', col2: 'Category C', col3: '฿5,200' },
  { col1: 'REF-005', col2: 'Category B', col3: '฿17,300' },
]

function EquipmentSummaryTable() {
  const rows = getMockEquipment().slice(0, 5)
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="text-left px-3 py-2 font-medium text-gray-600">Code</th>
          <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
          <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
          <th className="text-right px-3 py-2 font-medium text-gray-600">Meter</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((eq) => (
          <tr key={eq.equipmentID} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-mono text-blue-700">{eq.code}</td>
            <td className="px-3 py-2 text-gray-700">{eq.category}</td>
            <td className="px-3 py-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  eq.status === 'ACTIVE'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {eq.status}
              </span>
            </td>
            <td className="px-3 py-2 text-right text-gray-700">
              {eq.currentMeter?.toLocaleString() ?? '—'} {eq.meterType}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GenericSummaryTable({ label }: { label: string }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="text-left px-3 py-2 font-medium text-gray-600">Reference</th>
          <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
          <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
        </tr>
      </thead>
      <tbody>
        {PLACEHOLDER_ROWS.map((row) => (
          <tr key={row.col1} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-mono text-blue-700">{row.col1}</td>
            <td className="px-3 py-2 text-gray-700">{row.col2}</td>
            <td className="px-3 py-2 text-right text-gray-700">{row.col3}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ReportPreview({ reportId, reportLabel, generated }: ReportPreviewProps) {
  if (!generated || !reportId) {
    return (
      <div className="flex items-center justify-center min-h-48 text-sm text-gray-400 italic">
        Select a report and click Generate to preview
      </div>
    )
  }

  const now = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const isEquipmentSummary = reportId === 'equipment-summary'

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Report Preview — {reportLabel}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Generated on {now}</p>
        </div>
        {/* Export buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative group">
            <button
              type="button"
              disabled
              className="px-3 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
            >
              Export PDF
            </button>
            <span className="absolute right-0 top-full mt-1 w-48 text-xs bg-gray-800 text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap">
              Available in full API mode
            </span>
          </div>
          <div className="relative group">
            <button
              type="button"
              disabled
              className="px-3 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
            >
              Export Excel
            </button>
            <span className="absolute right-0 top-full mt-1 w-48 text-xs bg-gray-800 text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap">
              Available in full API mode
            </span>
          </div>
        </div>
      </div>

      {/* Summary note for non-equipment reports */}
      {!isEquipmentSummary && (
        <p className="text-sm text-gray-600">
          Report generated on {now}.{' '}
          <span className="font-medium">5 records found.</span>
        </p>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {isEquipmentSummary ? <EquipmentSummaryTable /> : <GenericSummaryTable label={reportLabel ?? ''} />}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 text-right">
        Showing 5 of {isEquipmentSummary ? 6 : 24} records. Full data available in production API.
      </p>
    </div>
  )
}
