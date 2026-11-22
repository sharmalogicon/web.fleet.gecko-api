'use client'

import { Alert, Loading, fmtDate, money } from '@/components/docs/DocBits'
import { useCostAdjustments } from '@/lib/api/fleet/costAdjustments'
import { errorText } from '@/lib/api/errorText'
import { useT } from '@/i18n/I18nContext'

/**
 * "Stock cost corrections" (prompt 20 §B): read-only grid for one vendor invoice or one item.
 * Hidden when there are none (`hideEmpty`); reversals greyed with a "Reversed" tag.
 */
export function CostCorrections({ vendorInvoiceId, itemId, hideEmpty }: { vendorInvoiceId?: string; itemId?: string; hideEmpty?: boolean }) {
  const { t } = useT()
  const list = useCostAdjustments({ vendorInvoiceId, itemId }, !!vendorInvoiceId || !!itemId)
  if (list.isLoading) return hideEmpty ? null : <Loading />
  if (list.error) return <Alert>{errorText(list.error, t)}</Alert>
  const rows = list.data ?? []
  if (!rows.length && hideEmpty) return null
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('costAdj.title')}</p>
      {rows.length === 0 ? <p className="text-sm text-gray-400">{t('costAdj.none')}</p> : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr className="text-left">
                <th className="py-1.5 px-3">{t('common.date')}</th>
                <th className="py-1.5 px-3">{vendorInvoiceId ? 'Item' : t('costAdj.invoice')}</th>
                <th className="py-1.5 px-3">{t('docs.store')}</th>
                <th className="py-1.5 px-3 text-right">{t('costAdj.delta')}</th>
                <th className="py-1.5 px-3 text-right">{t('costAdj.avg')}</th>
                <th className="py-1.5 px-3 text-right">{t('costAdj.revalued')}</th>
                <th className="py-1.5 px-3 text-right">{t('costAdj.expensed')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t border-gray-100 ${r.isReversal || r.isReversed ? 'text-gray-400' : 'text-gray-700'}`}>
                  <td className="py-1.5 px-3">{fmtDate(r.postedAt)}</td>
                  <td className="py-1.5 px-3 font-mono">
                    {vendorInvoiceId ? r.itemCode : r.sourceDocNo}
                    {(r.isReversal || r.isReversed) && (
                      <span className="ml-1.5 font-sans px-1 rounded bg-gray-100 text-gray-500">{r.isReversal ? t('costAdj.reversal') : t('costAdj.reversed')}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 font-mono">{r.warehouseCode}</td>
                  <td className={`py-1.5 px-3 text-right ${r.isReversal || r.isReversed ? '' : r.valueDelta < 0 ? 'text-green-700' : 'text-red-600'}`}>{money(r.valueDelta)}</td>
                  <td className="py-1.5 px-3 text-right whitespace-nowrap">{money(r.avgCostBefore)} → {money(r.avgCostAfter)}</td>
                  <td className="py-1.5 px-3 text-right">{money(r.revaluedAmount)}</td>
                  <td className="py-1.5 px-3 text-right">{money(r.expensedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
