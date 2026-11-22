'use client'

import { useState } from 'react'
import { ReportSidebar, type ReportGroup } from './ReportSidebar'
import { ManagementReportParams } from './ManagementReportParams'
import { ReportPreview } from './ReportPreview'
import { useReportScreen } from './useReportScreen'

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

export function ManagementReportClient() {
  const screen = useReportScreen(REPORT_GROUPS)
  const selectedReport = screen.selected

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [equipmentCode, setEquipmentCode] = useState('')
  const [equipmentCategory, setEquipmentCategory] = useState('All')
  const [status, setStatus] = useState('All')

  const handleSelect = screen.select

  function handleGenerate() {
    screen.generate({ dateFrom, dateTo, equipmentCode, equipmentCategory, status })
  }

  function handleClear() {
    setDateFrom('')
    setDateTo('')
    setEquipmentCode('')
    setEquipmentCategory('All')
    setStatus('All')
    screen.clear()
  }

  const reportLabel = screen.label

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Report selector */}
      <ReportSidebar
        groups={screen.groups}
        selectedReport={selectedReport}
        onSelect={handleSelect}
      />

      {/* Right: Params + Preview */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ManagementReportParams
            reportLabel={reportLabel}
            fields={screen.fields}
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
            query={screen.query}
            result={screen.result.data}
            loading={screen.result.isFetching}
            error={screen.result.error}
          />
        </div>
      </div>
    </div>
  )
}
