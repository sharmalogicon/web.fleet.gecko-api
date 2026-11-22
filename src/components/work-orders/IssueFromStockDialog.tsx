'use client'

import { useState } from 'react'
import { Panel } from '@/components/fleet-setup/ui'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { Alert, Loading, cellInput, num, useSaveFailure } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import type { components } from '@/lib/api/fleet.schema'
import { useDocList, useDocMutations } from '@/lib/api/fleet/documents'
import { useWarehouses } from '@/lib/api/fleet/warehouses'
import { useToastStore } from '@/lib/stores/useToastStore'
import type { WorkOrderDto } from '@/lib/api/fleet/workOrders'

type Issue = components['schemas']['StockIssueDto']

/** Net qty issued per WO part line from the WO's posted issues (ISSUE adds, RETURN takes off). */
export function issuedByPart(issues: Pick<Issue, 'status' | 'issueKind' | 'lines'>[]) {
  const out: Record<string, number> = {}
  for (const d of issues) {
    if (d.status !== 'POSTED') continue
    const sign = d.issueKind === 'RETURN' ? -1 : 1
    for (const l of d.lines) if (l.woPartId) out[l.woPartId] = (out[l.woPartId] ?? 0) + sign * num(l.baseQty)
  }
  return out
}

/**
 * "Issue from stock" on the WO Parts tab (prompt 11 §I): POST /stock-issues { issueTo: WORK_ORDER, post: true } for the
 * selected STOCK part lines; RETURN brings parts back at that line's cost.
 */
export function IssueFromStockDialog({ wo, onClose }: { wo: WorkOrderDto; onClose: () => void }) {
  const { t } = useT()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { save } = useDocMutations<Issue>('stockIssues')
  const stores = useWarehouses({ branchId: wo.branchId, active: true })
  const issues = useDocList<Issue>('stockIssues', { workOrderId: wo.workOrderId })
  const [kind, setKind] = useState<'ISSUE' | 'RETURN'>('ISSUE')
  const [warehouseId, setWarehouseId] = useState('')
  const [qty, setQty] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  // `issuedBaseQty` on the WO part (owner answer 11 Q3) wins; until the API sends it, add up the WO's posted issues.
  const counted = issuedByPart(issues.data ?? [])
  const parts = wo.parts.filter((p) => p.source === 'STOCK' && p.itemId)
  const issued: Record<string, number> = Object.fromEntries(parts.map((p) => {
    const own = (p as typeof p & { issuedBaseQty?: number | string | null }).issuedBaseQty
    return [p.woPartId, own === undefined || own === null ? counted[p.woPartId] ?? 0 : num(own)]
  }))
  const max = (p: (typeof parts)[number]) => (kind === 'ISSUE' ? Math.max(0, num(p.qty) - (issued[p.woPartId] ?? 0)) : issued[p.woPartId] ?? 0)
  const chosen = parts.filter((p) => num(qty[p.woPartId]) > 0)

  const submit = async () => {
    setBanner(null)
    if (!warehouseId) { setBanner(t('docs.rule.store')); return }
    if (!chosen.length) { setBanner(t('docs.rule.positiveQty')); return }
    const over = chosen.find((p) => num(qty[p.woPartId]) > max(p))
    if (over) { setBanner(`${over.itemCode}: ${t('docs.rule.overIssue')} (${max(over)})`); return }
    try {
      const saved = await save.mutateAsync({
        body: {
          warehouseId, issueTo: 'WORK_ORDER', issueKind: kind, workOrderId: wo.workOrderId, assetProfileId: wo.assetProfileId ?? null, post: true,
          lines: chosen.map((p) => ({ itemId: p.itemId, qty: num(qty[p.woPartId]), uomCode: null, woPartId: p.woPartId })),
        },
      })
      toast.success(t('docs.done'), saved.documentNo)
      onClose()
    } catch (e) {
      setBanner(failure(e))
    }
  }

  return (
    <Panel
      open
      variant="modal"
      title={`${t('docs.action.issueFromStock')} · ${wo.documentNo}`}
      onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <ToolbarButton onClick={onClose}>{t('common.cancel')}</ToolbarButton>
          <ToolbarButton tone="primary" disabled={save.isPending || !chosen.length} onClick={submit}>{kind === 'ISSUE' ? t('docs.action.issue') : t('docs.action.returnParts')}</ToolbarButton>
        </div>
      )}
    >
      <div className="flex flex-col gap-3">
        {banner && <Alert>{banner}</Alert>}
        <div className="flex gap-3">
          <select value={kind} onChange={(e) => { setKind(e.target.value as 'ISSUE' | 'RETURN'); setQty({}) }} aria-label="kind" className={cellInput}>
            <option value="ISSUE">{t('docs.action.issue')}</option>
            <option value="RETURN">{t('docs.action.returnParts')}</option>
          </select>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} aria-label={t('docs.store')} className={cellInput}>
            <option value="">{t('docs.store')} —</option>
            {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
          </select>
        </div>
        {issues.isLoading ? <Loading /> : !parts.length ? <p className="text-sm text-gray-500">{t('docs.noStockParts')}</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="py-2">Stock Code</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">{t('docs.issued')}</th><th className="w-24">{kind === 'ISSUE' ? t('docs.action.issue') : t('docs.action.returnParts')}</th></tr></thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.woPartId} className="border-b last:border-0">
                  <td className="py-1.5 font-mono">{p.itemCode}</td><td>{p.description}</td>
                  <td className="text-right tabular-nums">{num(p.qty)} {p.uomCode}</td><td className="text-right tabular-nums">{issued[p.woPartId] ?? 0}</td>
                  <td><input type="number" step="any" min={0} max={max(p)} value={qty[p.woPartId] ?? ''} placeholder={String(max(p))} disabled={max(p) <= 0} aria-label={`Qty ${p.itemCode}`} className={cellInput} onChange={(e) => setQty((s) => ({ ...s, [p.woPartId]: e.target.value }))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  )
}
