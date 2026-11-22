'use client'
import { useState } from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { LineItemsEditor, type LineColumn } from '@/components/shared/LineItemsEditor'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { Alert, Loading, cellInput, fmtDate, money } from '@/components/docs/DocBits'
import {
  NEW_MANUAL_LINE, lineFromUnbilled, useUnbilled, type InvoiceFormValues, type InvoiceLineValues,
} from '@/lib/api/fleet/vendorInvoices'
import { errorText } from '@/lib/api/errorText'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<InvoiceFormValues>
  editable: boolean
}

/**
 * The invoice lines (same columns; VAT is on the header, so "VAT / Net" show expected / variance — red on EXCEPTION).
 * Editable on a draft: qty empty = all billable, price empty = the expected price; "Add lines" picks unbilled lines of
 * the supplier and branch; "Other charge" = a MANUAL line (always needs approval).
 */
export function InvoiceLinesSection({ form, editable }: Props) {
  const { t } = useT()
  const { control, register, watch, formState: { errors } } = form
  const lines = useFieldArray({ control, name: 'lines' })
  const values = watch('lines')
  const [picking, setPicking] = useState(false)
  const manual = (i: number) => values[i]?.source === 'MANUAL'
  const err = (i: number) => {
    const e = errors.lines?.[i]
    const m = e?.description?.message ?? e?.qty?.message ?? e?.unitPrice?.message
    return m ? t(m) : undefined
  }
  const amount = (l?: InvoiceLineValues) => (l ? (l.qty ?? l.billableQty ?? 0) * (l.unitPrice ?? l.expectedUnitPrice ?? 0) : 0)

  const columns: LineColumn<InvoiceLineValues & { id: string }>[] = [
    { id: 'stockCode', header: 'Stock Code', cell: (_, i) => <span className="text-sm font-mono text-gray-700">{values[i]?.itemCode || '—'}</span> },
    {
      id: 'stockType', header: 'Type',
      cell: (_, i) => <span className="inline-flex px-1.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 whitespace-nowrap">{t(`vinv.source.${values[i]?.source}`)}</span>,
    },
    {
      id: 'description', header: 'Description',
      cell: (_, i) => manual(i) && editable
        ? <input {...register(`lines.${i}.description`)} className={`${cellInput} min-w-[200px]`} placeholder="Description" />
        : <span className="text-sm text-gray-800">{values[i]?.description || '—'}</span>,
    },
    {
      id: 'quantity', header: 'Qty', className: 'w-24',
      cell: (_, i) => editable
        ? <input type="number" step="0.01" min="0" {...register(`lines.${i}.qty`)} className={`${cellInput} text-right`} placeholder={values[i]?.billableQty != null ? String(values[i]?.billableQty) : ''} />
        : <span className="text-sm block text-right">{values[i]?.qty ?? '—'} {values[i]?.uomCode ?? ''}</span>,
    },
    {
      id: 'unitPrice', header: 'Unit Price', className: 'w-28',
      cell: (_, i) => editable
        ? <input type="number" step="0.01" min="0" {...register(`lines.${i}.unitPrice`)} className={`${cellInput} text-right`} placeholder={values[i]?.expectedUnitPrice != null ? String(values[i]?.expectedUnitPrice) : ''} />
        : <span className="text-sm block text-right font-mono">{money(values[i]?.unitPrice)}</span>,
    },
    {
      id: 'totalAmount', header: 'Total', className: 'w-28 text-right',
      cell: (_, i) => <span className="text-sm font-medium font-mono">{money(values[i]?.lineAmount ?? amount(values[i]))}</span>,
    },
    { id: 'vendorInvoiceRef', header: 'Vendor Invoice Ref', cell: (_, i) => <span className="text-xs font-mono text-gray-600">{values[i]?.sourceDocNo || '—'}</span> },
    { id: 'vat', header: t('vinv.expected'), className: 'text-right', cell: (_, i) => <span className="text-xs font-mono">{money(values[i]?.expectedAmount)}</span> },
    {
      id: 'netAmount', header: t('vinv.variance'), className: 'text-right',
      cell: (_, i) => {
        const l = values[i]
        const bad = l?.matchStatus === 'EXCEPTION' || l?.matchStatus === 'UNMATCHED'
        return (
          <div className={`flex flex-col items-end text-xs ${bad ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            <span className="font-mono">{money(l?.varianceAmount)}</span>
            {l?.matchStatus && <span className="text-[10px]">{l.matchStatus}</span>}
          </div>
        )
      },
    },
    {
      id: 'registrationNo', header: 'Reg No',
      cell: (_, i) => <span className="text-xs text-gray-600">{values[i]?.registrationNo || values[i]?.assetCode || '—'}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      {editable && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setPicking(true)} disabled={!watch('customerCode') || !watch('branchId')}
            className="px-3 py-1.5 text-sm rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50">
            {t('vinv.addLines')}
          </button>
          <button type="button" onClick={() => lines.append({ ...NEW_MANUAL_LINE })}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
            {t('vinv.otherCharge')}
          </button>
        </div>
      )}
      <LineItemsEditor
        items={lines.fields}
        columns={columns}
        getKey={(f) => f.id}
        onRemove={editable ? (i) => lines.remove(i) : undefined}
        addLabel={t('vinv.addLines')}
        removeLabel={t('claim.removeLine')}
        emptyText={t('vinv.noLines')}
        readOnly={!editable}
        rowError={err}
        error={errors.lines?.message ? t(errors.lines.message) : errors.lines?.root?.message}
      />
      {picking && (
        <UnbilledPicker
          supplier={watch('customerCode')}
          branchId={watch('branchId')}
          taken={new Set(values.filter((l) => l.source !== 'MANUAL').map((l) => `${l.source}:${l.sourceLineId}`))}
          onPick={(picked) => { picked.forEach((l) => lines.append(l)); setPicking(false) }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}

function UnbilledPicker({ supplier, branchId, taken, onPick, onClose }: {
  supplier: string
  branchId: string
  taken: Set<string>
  onPick: (lines: InvoiceLineValues[]) => void
  onClose: () => void
}) {
  const { t } = useT()
  const list = useUnbilled({ supplierPartyCode: supplier.trim().toUpperCase(), branchId })
  const rows = (list.data ?? []).filter((l) => !taken.has(`${l.source}:${l.sourceLineId}`))
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <Panel
      open
      variant="modal"
      title={`${t('vinv.addLines')} · ${supplier}`}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" disabled={!picked.size} onClick={() => onPick(rows.filter((l) => picked.has(l.sourceLineId)).map(lineFromUnbilled))}>
            {t('vinv.addLines')} ({picked.size})
          </Button>
        </>
      )}
    >
      {list.isLoading ? <Loading /> : list.error ? <Alert>{errorText(list.error, t)}</Alert> : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">{t('vinv.noUnbilled')}</p>
      ) : (
        <div className="overflow-x-auto max-h-[55vh]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1 pr-2">
                  <input type="checkbox" checked={picked.size === rows.length} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.sourceLineId)) : new Set())} />
                </th>
                <th className="py-1 pr-3">Document</th><th className="py-1 pr-3">Item</th><th className="py-1 pr-3 text-right">Qty</th>
                <th className="py-1 pr-3 text-right">Price</th><th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.sourceLineId} className="border-t border-gray-100">
                  <td className="py-1 pr-2"><input type="checkbox" checked={picked.has(l.sourceLineId)} onChange={() => toggle(l.sourceLineId)} /></td>
                  <td className="py-1 pr-3 font-mono">{l.sourceDocNo}<div className="text-gray-400">{t(`vinv.source.${l.source}`)} · {fmtDate(l.documentDate)}</div></td>
                  <td className="py-1 pr-3">{l.itemCode ?? ''} {l.description}<div className="text-gray-400">{l.assetCode ?? l.workOrderNo ?? ''}</div></td>
                  <td className="py-1 pr-3 text-right">{Number(l.billableQty).toLocaleString()} {l.uomCode}</td>
                  <td className="py-1 pr-3 text-right">{money(l.unitPrice)}</td>
                  <td className="py-1 text-right">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
