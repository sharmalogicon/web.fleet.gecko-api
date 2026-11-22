'use client'

import type { ReactNode } from 'react'
import { ListPage } from '@/components/shared/ListPage'
import { ReportPreview } from '@/components/reports/ReportPreview'
import { toReportQuery, useReportCatalogue, useReportRun, type ReportFilterValues } from '@/lib/api/fleet/reports'
import { useT } from '@/i18n/I18nContext'

/** API inquiry codes (the tire-changes page reads `tyre-changes`). */
export type InquiryCode = 'work-orders' | 'wip' | 'purchase-orders' | 'tyre-changes' | 'truck-movements'

/** WIP: rows open more than 7 days in orange (as before). */
function wipRowClass(row: unknown[], columns: { key: string }[]) {
  const i = columns.findIndex((c) => c.key === 'daysOpen')
  return i >= 0 && Number(row[i]) > 7 ? 'bg-orange-50 text-orange-800' : undefined
}

/**
 * An inquiry page on `GET /api/fleet/inquiry/{code}` (prompt 16 §C): the page's own filters (URL), the API's columns,
 * PDF / Excel export. Runs whenever the filters change.
 */
export function InquiryView({ code, titleKey, filters, values }: { code: InquiryCode; titleKey: string; filters: ReactNode; values: ReportFilterValues }) {
  const { t } = useT()
  const catalogue = useReportCatalogue()
  const entry = catalogue.data?.find((r) => r.group === 'inquiry' && r.code === code)
  // Until the catalogue is in, send every mapped filter (the API ignores what it does not take).
  const params = entry?.params ?? ['from', 'to', 'search', 'equipmentCode', 'woType', 'status', 'poNo', 'supplier', 'tripType']
  const q = toReportQuery(values, params)
  const result = useReportRun('inquiry', code, catalogue.isLoading ? null : { seq: 1, q })
  const count = result.data ? Number(result.data.rowCount) : 0

  return (
    <ListPage
      title={t(titleKey)}
      subtitle={result.data ? `${count.toLocaleString()} record${count !== 1 ? 's' : ''} found` : ''}
      filters={filters}
    >
      <div className="p-4">
        <ReportPreview kind="inquiry" reportId={code} reportLabel={entry?.title ?? t(titleKey)} query={q}
          result={result.data} loading={result.isFetching && !result.data} error={result.error}
          rowClass={code === 'wip' ? wipRowClass : undefined} />
      </div>
    </ListPage>
  )
}
