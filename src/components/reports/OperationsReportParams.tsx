'use client'

interface OperationsReportParamsProps {
  reportLabel: string | null
  reportId: string | null
  dateFrom: string
  dateTo: string
  equipmentCode: string
  equipmentCategory: string
  vendorName: string
  documentStatus: string
  poNo: string
  serialNo: string
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onEquipmentCodeChange: (v: string) => void
  onEquipmentCategoryChange: (v: string) => void
  onVendorNameChange: (v: string) => void
  onDocumentStatusChange: (v: string) => void
  onPoNoChange: (v: string) => void
  onSerialNoChange: (v: string) => void
  onGenerate: () => void
  onClear: () => void
}

const CATEGORY_OPTIONS = ['All', 'TRUCK', 'TRAILER', 'FORKLIFT', 'OTHER']
const STATUS_OPTIONS = ['All', 'Draft', 'Approved', 'Cancelled']

const PO_REPORT_IDS = ['purchase-order-report', 'goods-receipt-report']
const TIRE_REPORT_IDS = ['tire-profile-report', 'tire-change-history', 'pending-recap-report']

export function OperationsReportParams({
  reportLabel,
  reportId,
  dateFrom,
  dateTo,
  equipmentCode,
  equipmentCategory,
  vendorName,
  documentStatus,
  poNo,
  serialNo,
  onDateFromChange,
  onDateToChange,
  onEquipmentCodeChange,
  onEquipmentCategoryChange,
  onVendorNameChange,
  onDocumentStatusChange,
  onPoNoChange,
  onSerialNoChange,
  onGenerate,
  onClear,
}: OperationsReportParamsProps) {
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'
  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  const showPoNo = reportId !== null && PO_REPORT_IDS.includes(reportId)
  const showSerialNo = reportId !== null && TIRE_REPORT_IDS.includes(reportId)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Report Parameters</h2>
        <p className="text-xs text-gray-400 mt-0.5">Configure filters and generate a preview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Report Name (readonly) */}
        <div className="sm:col-span-2">
          <label className={labelClass}>Report Name</label>
          <input
            type="text"
            readOnly
            value={reportLabel ?? 'Select a report from the list'}
            className={`${inputClass} bg-gray-50 text-gray-500 cursor-default`}
          />
        </div>

        {/* Date From */}
        <div>
          <label className={labelClass}>Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Date To */}
        <div>
          <label className={labelClass}>Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Equipment Code */}
        <div>
          <label className={labelClass}>Equipment Code</label>
          <input
            type="text"
            placeholder="e.g. EQ-001"
            value={equipmentCode}
            onChange={(e) => onEquipmentCodeChange(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Equipment Category */}
        <div>
          <label className={labelClass}>Equipment Category</label>
          <select
            value={equipmentCategory}
            onChange={(e) => onEquipmentCategoryChange(e.target.value)}
            className={inputClass}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Vendor Name */}
        <div>
          <label className={labelClass}>Vendor Name</label>
          <input
            type="text"
            placeholder="e.g. ABC Parts Co."
            value={vendorName}
            onChange={(e) => onVendorNameChange(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Document Status */}
        <div>
          <label className={labelClass}>Document Status</label>
          <select
            value={documentStatus}
            onChange={(e) => onDocumentStatusChange(e.target.value)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* PO No — shown only for PO / GR reports */}
        {showPoNo && (
          <div>
            <label className={labelClass}>PO No</label>
            <input
              type="text"
              placeholder="e.g. PO-2024-001"
              value={poNo}
              onChange={(e) => onPoNoChange(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Serial No — shown only for Tire reports */}
        {showSerialNo && (
          <div>
            <label className={labelClass}>Serial No</label>
            <input
              type="text"
              placeholder="Tire serial number"
              value={serialNo}
              onChange={(e) => onSerialNoChange(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!reportLabel}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Generate Report
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-5 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
