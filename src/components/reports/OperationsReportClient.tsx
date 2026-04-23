'use client'

import { useState } from 'react'
import { ReportSidebar, type ReportGroup } from './ReportSidebar'
import { OperationsReportParams } from './OperationsReportParams'
import { ReportPreview } from './ReportPreview'

const REPORT_GROUPS: ReportGroup[] = [
  {
    groupLabel: 'Operations Reports',
    reports: [
      { id: 'work-order-report', label: 'Work Order Report' },
      { id: 'fuel-log-report', label: 'Fuel Log Report' },
      { id: 'meter-reading-report', label: 'Meter Reading Report' },
      { id: 'goods-requisition-report', label: 'Goods Requisition Report' },
    ],
  },
  {
    groupLabel: 'Inventory Reports',
    reports: [
      { id: 'stock-movement-report', label: 'Stock Movement Report' },
      { id: 'purchase-order-report', label: 'Purchase Order Report' },
      { id: 'goods-receipt-report', label: 'Goods Receipt Report' },
    ],
  },
  {
    groupLabel: 'Tire Reports',
    reports: [
      { id: 'tire-profile-report', label: 'Tire Profile Report' },
      { id: 'tire-change-history', label: 'Tire Change History' },
      { id: 'pending-recap-report', label: 'Pending Recap Report' },
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

export function OperationsReportClient() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [equipmentCode, setEquipmentCode] = useState('')
  const [equipmentCategory, setEquipmentCategory] = useState('All')
  const [vendorName, setVendorName] = useState('')
  const [documentStatus, setDocumentStatus] = useState('All')
  const [poNo, setPoNo] = useState('')
  const [serialNo, setSerialNo] = useState('')

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
    setVendorName('')
    setDocumentStatus('All')
    setPoNo('')
    setSerialNo('')
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
          <OperationsReportParams
            reportLabel={reportLabel}
            reportId={selectedReport}
            dateFrom={dateFrom}
            dateTo={dateTo}
            equipmentCode={equipmentCode}
            equipmentCategory={equipmentCategory}
            vendorName={vendorName}
            documentStatus={documentStatus}
            poNo={poNo}
            serialNo={serialNo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onEquipmentCodeChange={setEquipmentCode}
            onEquipmentCategoryChange={setEquipmentCategory}
            onVendorNameChange={setVendorName}
            onDocumentStatusChange={setDocumentStatus}
            onPoNoChange={setPoNo}
            onSerialNoChange={setSerialNo}
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
