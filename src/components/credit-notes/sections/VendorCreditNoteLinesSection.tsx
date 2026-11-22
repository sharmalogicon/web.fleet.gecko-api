'use client'
import { useState } from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { LineItemsEditor, type LineColumn } from '@/components/shared/LineItemsEditor'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { Alert, Loading, cellInput, money } from '@/components/docs/DocBits'
import { NEW_CN_MANUAL_LINE, lineFromReturn, usePostedReturns, type CnFormValues, type CnLineValues } from '@/lib/api/fleet/vendorCreditNotes'
import { useVendorInvoice } from '@/lib/api/fleet/vendorInvoices'
import { errorText } from '@/lib/api/errorText'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<CnFormValues>
  editable: boolean
}

type Picker = 'return' | 'invoice' | null

/**
 * Same columns (Transaction No · Equipment · GL Code · Code · Description) + qty / price / amount.
 * Add from a posted return (RTV_LINE), a price correction on the linked invoice's line (INVOICE_LINE), or a MANUAL line.
 */
export function VendorCreditNoteLinesSection({ form, editable }: Props) {
  const { t } = useT()
  const { control, register, watch, formState: { errors } } = form
  const lines = useFieldArray({ control, name: 'lines' })
  const values = watch('lines')
  const [picker, setPicker] = useState<Picker>(null)
  const manual = (i: number) => values[i]?.source === 'MANUAL'
  const err = (i: number) => {
    const e = errors.lines?.[i]
    const m = e?.description?.message ?? e?.qty?.message ?? e?.unitPrice?.message
    return m ? t(m) : undefined
  }
  const taken = new Set(values.filter((l) => l.source !== 'MANUAL').map((l) => l.sourceLineId))

  const columns: LineColumn<CnLineValues & { id: string }>[] = [
    {
      id: 'transactionNo', header: 'Transaction No',
      cell: (_, i) => (
        <div className="flex flex-col">
          <span className="text-sm font-mono">{values[i]?.transactionNo || '—'}</span>
          <span className="text-[10px] text-gray-500">{t(`vcn.source.${values[i]?.source}`)}</span>
        </div>
      ),
    },
    { id: 'equipment', header: 'Equipment', cell: (_, i) => <span className="text-sm">{values[i]?.equipmentCode || '—'}</span> },
    {
      id: 'glCode', header: 'GL Code', className: 'w-28',
      cell: (_, i) => editable ? <input {...register(`lines.${i}.glCode`)} className={cellInput} /> : <span className="text-sm font-mono">{values[i]?.glCode || '—'}</span>,
    },
    { id: 'code', header: 'Code', cell: (_, i) => <span className="text-sm font-mono">{values[i]?.code || '—'}</span> },
    {
      id: 'description', header: 'Description',
      cell: (_, i) => manual(i) && editable
        ? <input {...register(`lines.${i}.description`)} className={`${cellInput} min-w-[180px]`} />
        : <span className="text-sm">{values[i]?.description || '—'}</span>,
    },
    {
      id: 'qty', header: 'Qty', className: 'w-24',
      cell: (_, i) => editable ? <input type="number" step="0.01" min="0" {...register(`lines.${i}.qty`)} className={`${cellInput} text-right`} placeholder={manual(i) ? '' : t('vcn.default')} />
        : <span className="text-sm block text-right">{values[i]?.qty ?? '—'}</span>,
    },
    {
      id: 'unitPrice', header: 'Unit Price', className: 'w-28',
      cell: (_, i) => editable ? <input type="number" step="0.01" min="0" {...register(`lines.${i}.unitPrice`)} className={`${cellInput} text-right`} placeholder={manual(i) ? '' : t('vcn.default')} />
        : <span className="text-sm block text-right font-mono">{money(values[i]?.unitPrice)}</span>,
    },
    {
      id: 'amount', header: 'Amount', className: 'w-28 text-right',
      cell: (_, i) => {
        const l = values[i]
        const v = l?.qty !== undefined && l?.unitPrice !== undefined ? Number(l.qty) * Number(l.unitPrice) : l?.lineAmount
        return <span className="text-sm font-mono">{money(v)}</span>
      },
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      {editable && (
        <div className="flex gap-2 flex-wrap">
          <button type="button" disabled={!watch('vendorCode')} onClick={() => setPicker('return')}
            className="px-3 py-1.5 text-sm rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50">{t('vcn.addReturn')}</button>
          <button type="button" disabled={!watch('vendorInvoiceId')} onClick={() => setPicker('invoice')} title={watch('vendorInvoiceId') ? undefined : t('vcn.pickInvoiceFirst')}
            className="px-3 py-1.5 text-sm rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50">{t('vcn.addInvoiceLine')}</button>
          <button type="button" onClick={() => lines.append({ ...NEW_CN_MANUAL_LINE })}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">{t('vinv.otherCharge')}</button>
        </div>
      )}
      <LineItemsEditor
        items={lines.fields}
        columns={columns}
        getKey={(f) => f.id}
        onRemove={editable ? (i) => lines.remove(i) : undefined}
        addLabel={t('claim.addLine')}
        removeLabel={t('claim.removeLine')}
        emptyText={t('vinv.noLines')}
        readOnly={!editable}
        rowError={err}
        error={errors.lines?.message ? t(errors.lines.message) : errors.lines?.root?.message}
      />
      {picker === 'return' && (
        <ReturnPicker supplier={(watch('vendorCode') ?? '').trim().toUpperCase()} taken={taken}
          onPick={(ls) => { ls.forEach((l) => lines.append(l)); setPicker(null) }} onClose={() => setPicker(null)} />
      )}
      {picker === 'invoice' && (
        <InvoiceLinePicker invoiceId={watch('vendorInvoiceId') ?? ''} taken={taken}
          onPick={(ls) => { ls.forEach((l) => lines.append(l)); setPicker(null) }} onClose={() => setPicker(null)} />
      )}
    </div>
  )
}

function PickTable({ rows, picked, toggle, empty }: {
  rows: { id: string; doc: string; item: string; qty: string; amount: string }[]
  picked: Set<string>
  toggle: (id: string) => void
  empty: string
}) {
  if (!rows.length) return <p className="text-sm text-gray-400 py-6 text-center">{empty}</p>
  return (
    <div className="overflow-x-auto max-h-[55vh]">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500"><th className="py-1 pr-2" /><th className="py-1 pr-3">Document</th><th className="py-1 pr-3">Item</th><th className="py-1 pr-3 text-right">Qty</th><th className="py-1 text-right">Amount</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-100">
              <td className="py-1 pr-2"><input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} /></td>
              <td className="py-1 pr-3 font-mono">{r.doc}</td><td className="py-1 pr-3">{r.item}</td>
              <td className="py-1 pr-3 text-right">{r.qty}</td><td className="py-1 text-right">{r.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function usePicked() {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return { picked, toggle }
}

function ReturnPicker({ supplier, taken, onPick, onClose }: { supplier: string; taken: Set<string | undefined>; onPick: (l: CnLineValues[]) => void; onClose: () => void }) {
  const { t } = useT()
  const returns = usePostedReturns(supplier, true)
  const { picked, toggle } = usePicked()
  const all = (returns.data ?? []).flatMap((r) => r.lines.filter((l) => !taken.has(l.vendorReturnLineId)).map((l) => ({ r, l })))
  return (
    <Panel open variant="modal" title={`${t('vcn.addReturn')} · ${supplier}`} onClose={onClose}
      footer={(<>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={!picked.size} onClick={() => onPick(all.filter((x) => picked.has(x.l.vendorReturnLineId)).map((x) => lineFromReturn(x.r, x.l)))}>
          {t('claim.addLine')} ({picked.size})
        </Button>
      </>)}>
      {returns.isLoading ? <Loading /> : returns.error ? <Alert>{errorText(returns.error, t)}</Alert> : (
        <PickTable picked={picked} toggle={toggle} empty={t('vcn.noReturns')}
          rows={all.map(({ r, l }) => ({ id: l.vendorReturnLineId, doc: r.documentNo, item: `${l.itemCode ?? ''} ${l.description}`, qty: String(l.baseQty), amount: money(l.creditAmount) }))} />
      )}
    </Panel>
  )
}

function InvoiceLinePicker({ invoiceId, taken, onPick, onClose }: { invoiceId: string; taken: Set<string | undefined>; onPick: (l: CnLineValues[]) => void; onClose: () => void }) {
  const { t } = useT()
  const inv = useVendorInvoice(invoiceId)
  const { picked, toggle } = usePicked()
  const lines = (inv.data?.lines ?? []).filter((l) => !taken.has(l.vendorInvoiceLineId))
  return (
    <Panel open variant="modal" title={`${t('vcn.addInvoiceLine')} · ${inv.data?.documentNo ?? ''}`} onClose={onClose}
      footer={(<>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={!picked.size} onClick={() => onPick(lines.filter((l) => picked.has(l.vendorInvoiceLineId)).map((l) => ({
          source: 'INVOICE_LINE' as const, sourceLineId: l.vendorInvoiceLineId, transactionNo: inv.data?.documentNo, equipmentCode: l.assetCode ?? undefined,
          code: l.itemCode ?? undefined, description: l.description, qty: Number(l.qty), unitPrice: undefined, lineAmount: undefined,
        })))}>
          {t('claim.addLine')} ({picked.size})
        </Button>
      </>)}>
      <p className="text-xs text-gray-500">{t('vcn.invoiceLineHint')}</p>
      {inv.isLoading ? <Loading /> : inv.error ? <Alert>{errorText(inv.error, t)}</Alert> : (
        <PickTable picked={picked} toggle={toggle} empty={t('vinv.noLines')}
          rows={lines.map((l) => ({ id: l.vendorInvoiceLineId, doc: l.sourceDocNo ?? '', item: `${l.itemCode ?? ''} ${l.description}`, qty: String(l.qty), amount: money(l.lineAmount) }))} />
      )}
    </Panel>
  )
}
