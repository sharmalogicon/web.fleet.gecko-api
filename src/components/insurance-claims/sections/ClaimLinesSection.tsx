'use client'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { LineItemsEditor, type LineColumn } from '@/components/shared/LineItemsEditor'
import { cellInput, money } from '@/components/docs/DocBits'
import { LINE_KINDS, NEW_LINE, type ClaimFormValues, type ClaimLineValues } from '@/lib/api/fleet/insuranceClaims'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<ClaimFormValues>
  editable: boolean
}

/**
 * The claim lines (Activity / Stock / Qty / Unit price / Total), editable on a DRAFT. Lines copied from the
 * accident's WOs show their WO no and keep source + sourceLineId; their kind / description / qty are the WO's.
 */
export function ClaimLinesSection({ form, editable }: Props) {
  const { t } = useT()
  const { control, register, watch, formState: { errors } } = form
  const lines = useFieldArray({ control, name: 'lines' })
  const values = watch('lines')
  const fromWo = (i: number) => values[i]?.source !== 'MANUAL' && !!values[i]?.sourceLineId
  const err = (i: number) => {
    const e = errors.lines?.[i]
    const m = e?.description?.message ?? e?.qty?.message ?? e?.unitPrice?.message
    return m ? t(m) : undefined
  }

  const columns: LineColumn<ClaimLineValues & { id: string }>[] = [
    {
      id: 'activity',
      header: 'Activity',
      cell: (_, i) => (
        <div className="flex flex-col gap-1 min-w-[220px]">
          <select {...register(`lines.${i}.lineKind`)} disabled={!editable || fromWo(i)} className={cellInput}>
            {LINE_KINDS.map((k) => <option key={k} value={k}>{t(`claim.kind.${k}`)}</option>)}
          </select>
          <input {...register(`lines.${i}.description`)} disabled={!editable || fromWo(i)} className={cellInput} placeholder="Description" />
          {fromWo(i) && <span className="text-[10px] text-gray-500">{t('claim.fromWo')} {values[i]?.workOrderNo} · {values[i]?.source}</span>}
        </div>
      ),
    },
    {
      id: 'stockCode',
      header: 'Stock Code',
      cell: (_, i) => <span className="text-sm font-mono text-gray-700">{values[i]?.itemCode || '—'}</span>,
    },
    {
      id: 'quantity',
      header: 'Qty',
      className: 'w-24',
      cell: (_, i) => <input type="number" step="0.01" min="0" {...register(`lines.${i}.qty`)} disabled={!editable || fromWo(i)} className={`${cellInput} text-right`} />,
    },
    {
      id: 'unitPrice',
      header: 'Unit Price',
      className: 'w-32',
      cell: (_, i) => <input type="number" step="0.01" min="0" {...register(`lines.${i}.unitPrice`)} disabled={!editable} className={`${cellInput} text-right`} />,
    },
    {
      id: 'totalAmount',
      header: 'Total',
      className: 'w-32 text-right',
      cell: (_, i) => (
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium font-mono">{money(Number(values[i]?.qty || 0) * Number(values[i]?.unitPrice || 0))}</span>
          {values[i]?.approvedAmount !== undefined && <span className="text-[10px] text-green-700">{t('claim.approved')} {money(values[i]?.approvedAmount)}</span>}
        </div>
      ),
    },
  ]

  return (
    <LineItemsEditor
      items={lines.fields}
      columns={columns}
      getKey={(f) => f.id}
      onAdd={editable ? () => lines.append({ ...NEW_LINE }) : undefined}
      onRemove={editable ? (i) => lines.remove(i) : undefined}
      addLabel={t('claim.addLine')}
      removeLabel={t('claim.removeLine')}
      emptyText="No line items for this claim."
      readOnly={!editable}
      rowError={err}
      error={errors.lines?.message ? t(errors.lines.message) : undefined}
    />
  )
}
