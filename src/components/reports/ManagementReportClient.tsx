'use client'

import { useState } from 'react'
import { ReportSidebar, type ReportGroup } from './ReportSidebar'
import { ManagementReportParams } from './ManagementReportParams'
import { ReportPreview } from './ReportPreview'

const REPORT_GROUPS: ReportGroup[] = [
  {
    groupLabel: 'Fleet Reports',
    reports: [
      { id: 'equipment-summary', label: 'Equipment Summary' },
      { id: 'driver-summary', label: 'Driver Summary' },
      { id: 'work-order-summary', label: 'Work Order Summary' },
      { id: 'fuel-consumption-summary', label: 'Fuel Consumption Summary' },
    ],
  },
  {
    groupLabel: 'Maintenance Reports',
    reports: [
      { id: 'pm-schedule-summary', label: 'PM Schedule Summary' },
      { id: 'service-cost-summary', label: 'Service Cost Summary' },
      { id: 'tire-life-summary', label: 'Tire Life Summary' },
    ],
  },
  {
    groupLabel: 'Financial Reports',
    reports: [
      { id: 'vendor-invoice-summary', label: 'Vendor Invoice Summary' },
      { id: 'purchase-order-summary', label: 'Purchase Order Summary' },
    ],
  },
]

function findReportLabel(id: string | null): string | null {
  if (!id) return null
  for (const group of REPORT_GROUPS) {
    const found = group.reports.find((r) => r.id === id)
    if (found) return found.label
  }
  return null
}

export function ManagementReportClient() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [equipmentCode, setEquipmentCode] = useState('')
  const [equipmentCategory, setEquipmentCategory] = useState('All')
  const [status, setStatus] = useState('All')

  function handleSelect(id: string) {
    setSelectedReport(id)
    setGenerated(false)
  }

  function handleGenerate() {
    if (!selectedReport) return
    setGenerated(true)
  }

  function handleClear() {
    setDateFrom('')
    setDateTo('')
    setEquipmentCode('')
    setEquipmentCategory('All')
    setStatus('All')
    setGenerated(false)
  }

  const reportLabel = findReportLabel(selectedReport)

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Report selector */}
      <ReportSidebar
        groups={REPORT_GROUPS}
        selectedReport={selectedReport}
        onSelect={handleSelect}
      />

      {/* Right: Params + Preview */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ManagementReportParams
            reportLabel={reportLabel}
            dateFrom={dateFrom}
            dateTo={dateTo}
            equipmentCode={equipmentCode}
            equipmentCategory={equipmentCategory}
            status={status}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onEquipmentCodeChange={setEquipmentCode}
            onEquipmentCategoryChange={setEquipmentCategory}
            onStatusChange={setStatus}
            onGenerate={handleGenerate}
            onClear={handleClear}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-64">
          <ReportPreview
            reportId={selectedReport}
            reportLabel={reportLabel}
            generated={generated}
          />
        </div>
      </div>
    </div>
  )
}
