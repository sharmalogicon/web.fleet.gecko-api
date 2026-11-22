'use client'

import { useState } from 'react'
import { cellInput } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import { toReportQuery, useReportCatalogue, useReportRun } from '@/lib/api/fleet/reports'
import { ReportPreview } from './ReportPreview'

const CODE = 'stock-movement-report'
const MOVEMENTS = ['RECEIPT', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'COUNT', 'VENDOR_RETURN', 'OPENING']

/**
 * Stock Movement Report (owner answer 11 Q1) on the generic report run (prompt 16 §B): `search` = item / document,
 * `status` = movement type; the date range comes from the parameters panel. Preview + PDF / Excel like the other reports.
 */
export function StockMovementReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const catalogue = useReportCatalogue()
  const params = catalogue.data?.find((r) => r.code === CODE)?.params ?? ['from', 'to', 'search', 'status']
  const [search, setSearch] = useState('')
  const [movement, setMovement] = useState('')
  const [run, setRun] = useState<{ seq: number; q: Record<string, string | undefined> } | null>(null)
  const result = useReportRun('reports', CODE, run)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          {t('report.itemOrDocument')}
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={`${cellInput} w-56`} placeholder="e.g. OIL-15W40 / GRN-…" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          {t('report.movement')}
          <input value={movement} onChange={(e) => setMovement(e.target.value.toUpperCase())} list="smr-movements" className={`${cellInput} w-48`} placeholder={t('common.all')} />
          <datalist id="smr-movements">{MOVEMENTS.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <button type="button"
          onClick={() => setRun((r) => ({ seq: (r?.seq ?? 0) + 1, q: toReportQuery({ dateFrom, dateTo, search, status: movement }, params) }))}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          Generate Report
        </button>
      </div>
      <ReportPreview reportId={CODE} reportLabel="Stock Movement Report" query={run?.q ?? null}
        result={result.data} loading={result.isFetching} error={result.error} />
    </div>
  )
}
