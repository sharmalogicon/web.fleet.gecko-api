'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { ListPage } from '@/components/shared/ListPage'
import { Alert, Loading, fmtDate, money, num } from '@/components/docs/DocBits'
import { TireChangeInquiryFilters } from '@/components/inquiry/TireChangeInquiryFilters'
import { useT } from '@/i18n/I18nContext'
import { errorText } from '@/lib/api/errorText'
import { useAssets } from '@/lib/api/fleet/assets'
import { useTyreDocuments, useTyreEvents, type TyreDocumentDto, type TyreEventWithDoc } from '@/lib/api/fleet/tyres'

interface Row extends TyreEventWithDoc { doc?: TyreDocumentDto }
const col = createColumnHelper<Row>()

/** Tyre events with their document: the event's own documentNo / assetCode when the API sends them, else the joined document. */
export function withDocuments(events: TyreEventWithDoc[], docs: TyreDocumentDto[]): Row[] {
  const byId = new Map(docs.map((d) => [d.tyreDocumentId, d]))
  return events.map((e) => ({ ...e, doc: e.tyreDocumentId ? byId.get(e.tyreDocumentId) : undefined }))
}

/** `/inquiry/tire-changes` on `/api/fleet/tyre-events` (prompt 13 §D), read-only. */
export function TyreEventInquiryView(p: { documentNo: string; equipmentCode: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const code = p.equipmentCode.trim().toUpperCase()
  const assets = useAssets({ search: code || undefined })
  const asset = code ? assets.data?.rows.find((a) => a.code.toUpperCase() === code) : undefined
  const waitAsset = !!code && assets.isLoading
  const events = useTyreEvents({ assetProfileId: asset?.id, from: p.dateFrom || undefined, to: p.dateTo || undefined }, !waitAsset && (!code || !!asset))
  // Join the document lists only while events do not carry documentNo themselves (owner answer 13 Q4).
  const needJoin = (events.data ?? []).some((e) => e.tyreDocumentId && !(e as TyreEventWithDoc).documentNo)
  const changes = useTyreDocuments({ kind: 'CHANGE', from: p.dateFrom || undefined, to: p.dateTo || undefined }, needJoin)
  const maint = useTyreDocuments({ kind: 'MAINTENANCE', from: p.dateFrom || undefined, to: p.dateTo || undefined }, needJoin)
  const docNo = p.documentNo.trim().toUpperCase()
  const rows = useMemo(
    () => withDocuments(events.data ?? [], [...(changes.data ?? []), ...(maint.data ?? [])]).filter((r) => !docNo || (r.documentNo ?? r.doc?.documentNo ?? '').toUpperCase().includes(docNo)),
    [events.data, changes.data, maint.data, docNo],
  )
  const href = (r: Row) => `/fleet/tires/${r.doc?.documentKind === 'MAINTENANCE' || r.eventType === 'INSPECTION' || r.eventType === 'REPAIR' || r.eventType === 'RETREAD' || r.eventType === 'RECEIVE_RECAP' ? 'maintenance' : 'changes'}/${r.tyreDocumentId}`
  const columns = [
    col.display({ id: 'no', header: 'Transaction No / Date', cell: ({ row: { original: r } }) => <div className="flex flex-col gap-0.5">{r.tyreDocumentId && (r.documentNo ?? r.doc?.documentNo) ? <Link href={href(r)} className="text-blue-600 hover:underline font-mono text-sm">{r.documentNo ?? r.doc?.documentNo}</Link> : <span className="text-sm text-gray-400">—</span>}<span className="text-xs text-gray-400">{fmtDate(r.eventAt)}</span></div> }),
    col.display({ id: 'eq', header: 'Equipment', cell: ({ row: { original: r } }) => <span className="text-sm font-mono">{r.assetCode ?? r.doc?.assetCode ?? asset?.code ?? '—'}</span> }),
    col.display({ id: 'type', header: () => t('common.type'), cell: ({ row: { original: r } }) => <div className="flex flex-col gap-0.5"><span className="text-xs font-medium">{r.eventType}</span><Link href={`/fleet/tires/profiles/${r.tyreId}`} className="text-sm font-mono text-blue-600 hover:underline">{r.serialNo}</Link></div> }),
    col.display({ id: 'pos', header: t('tyre.position'), cell: ({ row: { original: r } }) => <span className="font-mono text-xs">{[r.fromPosition, r.toPosition].filter(Boolean).join(' → ') || '—'}</span> }),
    col.display({ id: 'meter', header: 'Meter Read', cell: ({ row: { original: r } }) => <div className="flex flex-col gap-0.5 text-right"><span className="text-sm tabular-nums">{r.meterKm === null ? '—' : `${num(r.meterKm).toLocaleString('en-US')} km`}</span><span className="text-xs text-gray-400">{r.treadMm === null ? '' : `${num(r.treadMm)} mm`}{num(r.cost) ? ` · ${money(r.cost)}` : ''}</span></div> }),
    col.display({ id: 'why', header: () => t('docs.reason'), cell: ({ row: { original: r } }) => <span className="text-xs">{r.reasonCode ?? ''}{r.destination ? ` → ${r.destination}` : ''}</span> }),
  ]
  const loading = waitAsset || events.isLoading
  return (
    <ListPage
      title={t('nav.inquiryTireChanges')}
      subtitle={`${rows.length} record${rows.length !== 1 ? 's' : ''} found`}
      filters={<TireChangeInquiryFilters documentNo={p.documentNo} equipmentCode={p.equipmentCode} dateFrom={p.dateFrom} dateTo={p.dateTo} />}
    >
      {code && !waitAsset && !asset ? <p className="m-4 text-sm text-gray-500">{t('tyre.unknownAsset')}</p>
        : loading ? <Loading /> : events.error ? <div className="m-4"><Alert>{errorText(events.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={20} />}
    </ListPage>
  )
}
