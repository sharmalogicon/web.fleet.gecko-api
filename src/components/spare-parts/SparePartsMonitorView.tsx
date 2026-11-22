'use client'

import { ListPage } from '@/components/shared/ListPage'
import { Alert, Loading, num } from '@/components/docs/DocBits'
import { SparePartsMonitorClient } from '@/components/spare-parts/SparePartsMonitorClient'
import { SparePartsMonitorFilters } from '@/components/spare-parts/SparePartsMonitorFilters'
import { useT } from '@/i18n/I18nContext'
import type { components } from '@/lib/api/fleet.schema'
import { useDocList } from '@/lib/api/fleet/documents'
import { errorText } from '@/lib/api/errorText'
import type { SparePartsMonitor } from '@/types/spare-parts-monitor'

type Issue = components['schemas']['StockIssueDto']

/** A stock issue as a monitoring row (prompt 11 §I): POSTED → ACTIVE, anything else → INACTIVE (the API status in remarks). */
export function toMonitorRow(d: Issue, i: number): SparePartsMonitor {
  const at = d.postedAt ? new Date(d.postedAt) : null
  return {
    monitorID: i + 1,
    workOrderNo: d.workOrderNo ?? '—',
    equipmentCode: d.assetCode ?? '',
    orderDate: d.documentDate.slice(0, 10),
    orderTime: at ? at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : undefined,
    grandTotal: num(d.totalCost),
    status: d.status === 'POSTED' ? 'ACTIVE' : 'INACTIVE',
    remarks: [d.documentNo, d.issueKind === 'RETURN' ? 'RETURN' : null, d.status === 'POSTED' ? null : d.status, d.remarks].filter(Boolean).join(' · '),
  }
}

export function SparePartsMonitorView({ workOrderNo, equipmentCode, status }: { workOrderNo: string; equipmentCode: string; status: string }) {
  const { t } = useT()
  const list = useDocList<Issue>('stockIssues', { workOrderNo: workOrderNo.trim() || undefined, assetCode: equipmentCode.trim() || undefined })
  // workOrderNo / assetCode are filtered by the API (backend #11).
  const rows = (list.data ?? []).map(toMonitorRow).filter((r) => status === 'ALL' || r.status === status)
  return (
    <ListPage
      title={t('nav.spareParts')}
      subtitle={`${rows.length} record${rows.length !== 1 ? 's' : ''} found`}
      filters={<SparePartsMonitorFilters workOrderNo={workOrderNo} equipmentCode={equipmentCode} status={status} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <SparePartsMonitorClient initialData={rows} />}
    </ListPage>
  )
}
