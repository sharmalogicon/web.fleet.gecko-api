'use client'

import { useState } from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { IssueFromStockDialog } from '@/components/work-orders/IssueFromStockDialog'
import { ReserveStockDialog } from '@/components/docs/ReserveStockDialog'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { useT } from '@/i18n/I18nContext'
import { useServiceTypes } from '@/lib/api/fleet/serviceTasks'
import { useItems } from '@/lib/api/fleet/items'
import { useTechnicians } from '@/lib/api/fleet/technicians'
import { FLEET_TRADE, useCodeList } from '@/lib/api/fleet/setup'
import { TASK_STATUSES, type WoFormValues, type WorkOrderDto } from '@/lib/api/fleet/workOrders'

const cell = 'w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500'
const baht = (v: number | undefined) => (v == null ? '—' : `฿${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)

interface Props {
  form: UseFormReturn<WoFormValues>
  current?: WorkOrderDto
  editable: boolean
}

/** "Task" select for parts / labour lines: the task's 1-based position in the Services grid. */
function TaskSelect({ form, name, editable }: { form: UseFormReturn<WoFormValues>; name: `parts.${number}.taskSeqNo` | `labor.${number}.taskSeqNo`; editable: boolean }) {
  const tasks = form.watch('tasks')
  return (
    <select {...form.register(name)} disabled={!editable} className={cell}>
      <option value="">—</option>
      {tasks.map((t, i) => <option key={i} value={i + 1}>{i + 1}. {t.description || '…'}</option>)}
    </select>
  )
}

/** Services grid → `tasks` (code, description, parts / labour / discount from the API, remarks, task status). */
export function WOServicesGrid({ form, current, editable }: Props) {
  const { t } = useT()
  const { register, control, setValue, watch, formState: { errors } } = form
  const rows = useFieldArray({ control, name: 'tasks' })
  const services = useServiceTypes({})
  const amounts = (id?: string) => current?.tasks.find((x) => x.woTaskId === id)
  return (
    <LineItemsEditor
      items={rows.fields}
      getKey={(f) => f.id}
      readOnly={!editable}
      columns={[
        {
          id: 'code', header: 'Code', className: 'w-44',
          cell: (_f, i) => (
            <select {...register(`tasks.${i}.serviceTaskId`, {
              onChange: (e) => {
                const s = services.data?.find((x) => x.id === e.target.value)
                if (s && !watch(`tasks.${i}.description`)) setValue(`tasks.${i}.description`, s.description, { shouldDirty: true })
              },
            })} disabled={!editable} aria-label={`Code ${i + 1}`} className={cell}>
              <option value="">—</option>
              {services.data?.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
            </select>
          ),
        },
        { id: 'description', header: 'Description', cell: (_f, i) => <input {...register(`tasks.${i}.description`)} disabled={!editable} aria-label={`Description ${i + 1}`} className={cell} /> },
        { id: 'parts', header: 'Parts', className: 'w-24 text-right', cell: (f) => <span className="text-sm">{baht(Number(amounts(f.id)?.partsPrice ?? 0))}</span> },
        { id: 'labor', header: 'Labor', className: 'w-24 text-right', cell: (f) => <span className="text-sm">{baht(Number(amounts(f.id)?.laborPrice ?? 0))}</span> },
        { id: 'discount', header: 'Discount', className: 'w-24 text-right', cell: (f) => <span className="text-sm">{baht(Number(amounts(f.id)?.discountAmount ?? 0))}</span> },
        {
          id: 'status', header: t('common.status'), className: 'w-28',
          cell: (_f, i) => (
            <select {...register(`tasks.${i}.status`)} disabled={!editable} aria-label={`Status ${i + 1}`} className={cell}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ),
        },
        { id: 'remarks', header: 'Remarks', cell: (_f, i) => <input {...register(`tasks.${i}.remarks`)} disabled={!editable} aria-label={`Remarks ${i + 1}`} className={cell} /> },
      ]}
      onAdd={() => rows.append({ description: '', status: 'OPEN', remarks: '' })}
      onRemove={rows.remove}
      addLabel={t('wo.addService')}
      removeLabel={t('wo.removeLine')}
      emptyText="No service lines"
      rowError={(i) => { const m = errors.tasks?.[i]?.description?.message; return m ? t(m) : undefined }}
      error={errors.tasks?.message ? t(errors.tasks.message) : undefined}
    />
  )
}

/** Parts grid → `parts`: stock code → item (STOCK) or free text (DIRECT_PO); the screen's unit price = unit cost (and price when billable). */
export function WOPartsGrid({ form, current, editable }: Props) {
  const { t } = useT()
  const { canAt } = useFleetAccess()
  const [issuing, setIssuing] = useState(false)
  const [reserving, setReserving] = useState(false)
  const canIssue = !!current && !form.formState.isDirty && !['CLOSED', 'CANCELLED', 'COMPLETED'].includes(current.status) && canAt('fleet.stock.issue', current.branchId) && current.parts.some((p) => p.source === 'STOCK')
  const { register, control, setValue, watch, formState: { errors } } = form
  const rows = useFieldArray({ control, name: 'parts' })
  const items = useItems({ active: true })
  const total = (i: number) => {
    const qty = Number(watch(`parts.${i}.qty`) ?? 0)
    const price = Number(watch(`parts.${i}.unitPrice`) ?? 0)
    const disc = Number(watch(`parts.${i}.discount`) ?? 0)
    return qty * price - disc
  }
  return (
    <>
      {canIssue && (
        <div className="mb-3 flex justify-end gap-2">
          <ToolbarButton onClick={() => setReserving(true)}>{t('reserve.button')}</ToolbarButton>
          <ToolbarButton onClick={() => setIssuing(true)}>{t('docs.action.issueFromStock')}</ToolbarButton>
        </div>
      )}
      {issuing && current && <IssueFromStockDialog wo={current} onClose={() => setIssuing(false)} />}
      {reserving && current && (
        <ReserveStockDialog
          title={`${t('reserve.button')} · ${current.documentNo}`}
          branchId={current.branchId}
          workOrderId={current.workOrderId}
          lines={current.parts.filter((p) => p.source === 'STOCK').map((p) => ({
            kind: 'WO_PART' as const, lineId: p.woPartId, itemCode: p.itemCode ?? '', description: p.description, qty: Number(p.qty), uomCode: p.uomCode,
          }))}
          onClose={() => setReserving(false)}
        />
      )}
      <datalist id="wo-items">{items.data?.map((x) => <option key={x.itemId} value={x.itemCode}>{x.descriptionEn}</option>)}</datalist>
      <LineItemsEditor
        items={rows.fields}
        getKey={(f) => f.id}
        readOnly={!editable}
        columns={[
          { id: 'task', header: t('wo.task'), className: 'w-36', cell: (_f, i) => <TaskSelect form={form} name={`parts.${i}.taskSeqNo`} editable={editable} /> },
          {
            id: 'code', header: 'Stock Code', className: 'w-36',
            cell: (_f, i) => (
              <input {...register(`parts.${i}.stockCode`, {
                onChange: (e) => {
                  const item = items.data?.find((x) => x.itemCode.toUpperCase() === String(e.target.value).trim().toUpperCase())
                  setValue(`parts.${i}.itemId`, item?.itemId ?? '', { shouldDirty: true })
                  if (item) {
                    setValue(`parts.${i}.description`, item.descriptionEn, { shouldDirty: true })
                    setValue(`parts.${i}.uom`, item.baseUomCode, { shouldDirty: true })
                  }
                },
              })} list="wo-items" disabled={!editable} aria-label={`Stock Code ${i + 1}`} className={`${cell} font-mono`} placeholder={t('wo.freeText')} />
            ),
          },
          { id: 'description', header: 'Description', cell: (_f, i) => <input {...register(`parts.${i}.description`)} disabled={!editable} aria-label={`Description ${i + 1}`} className={cell} /> },
          { id: 'uom', header: 'UOM', className: 'w-20', cell: (_f, i) => <input {...register(`parts.${i}.uom`)} disabled={!editable} aria-label={`UOM ${i + 1}`} className={`${cell} uppercase`} /> },
          { id: 'qty', header: 'Qty', className: 'w-20', cell: (_f, i) => <input type="number" step="any" {...register(`parts.${i}.qty`)} disabled={!editable} aria-label={`Qty ${i + 1}`} className={cell} /> },
          { id: 'price', header: 'Unit Price', className: 'w-28', cell: (_f, i) => <input type="number" step="0.01" {...register(`parts.${i}.unitPrice`)} disabled={!editable} aria-label={`Unit Price ${i + 1}`} className={cell} /> },
          { id: 'discount', header: 'Discount', className: 'w-24', cell: (_f, i) => <input type="number" step="0.01" {...register(`parts.${i}.discount`)} disabled={!editable} aria-label={`Discount ${i + 1}`} className={cell} /> },
          { id: 'total', header: 'Total', className: 'w-24 text-right', cell: (_f, i) => <span className="text-sm font-medium">{baht(total(i))}</span> },
        ]}
        onAdd={() => rows.append({ description: '', qty: 1, unitPrice: undefined, discount: undefined, stockCode: '', uom: '' })}
        onRemove={rows.remove}
        addLabel={t('wo.addPart')}
        removeLabel={t('wo.removeLine')}
        emptyText="No parts"
        rowError={(i) => { const e = errors.parts?.[i]; const m = e?.description?.message ?? e?.qty?.message; return m ? t(m) : undefined }}
        error={errors.parts?.message ? t(errors.parts.message) : undefined}
      />
    </>
  )
}

/** Labour grid → `labor`: technician (or trade), start / end, std / actual hours; cost rate and amount come back from the API. */
export function WOLaborGrid({ form, current, editable }: Props) {
  const { t, lang } = useT()
  const { register, control, formState: { errors } } = form
  const rows = useFieldArray({ control, name: 'labor' })
  const techs = useTechnicians({ status: 'ACTIVE' })
  const trades = useCodeList(FLEET_TRADE)
  const read = (id?: string) => current?.labor.find((x) => x.woLaborId === id)
  return (
    <LineItemsEditor
      items={rows.fields}
      getKey={(f) => f.id}
      readOnly={!editable}
      columns={[
        { id: 'task', header: t('wo.task'), className: 'w-32', cell: (_f, i) => <TaskSelect form={form} name={`labor.${i}.taskSeqNo`} editable={editable} /> },
        { id: 'charge', header: 'Charge Code', className: 'w-28', cell: (_f, i) => <input {...register(`labor.${i}.chargeCode`)} disabled={!editable} aria-label={`Charge Code ${i + 1}`} className={`${cell} uppercase`} /> },
        {
          id: 'tech', header: t('wo.technician'), className: 'w-44',
          cell: (_f, i) => (
            <div className="flex flex-col gap-1">
              <select {...register(`labor.${i}.technicianId`)} disabled={!editable} aria-label={`Technician ${i + 1}`} className={cell}>
                <option value="">—</option>
                {techs.data?.rows.map((x) => <option key={x.id} value={x.id}>{x.technicianCode} · {x.fullName}</option>)}
              </select>
              {!form.watch(`labor.${i}.technicianId`) && (
                <select {...register(`labor.${i}.tradeCode`)} disabled={!editable} aria-label={`Trade ${i + 1}`} className={cell}>
                  <option value="">{t('wo.orTrade')}</option>
                  {trades.data?.map((x) => <option key={x.code} value={x.code}>{lang === 'th' && x.descriptionLocal ? x.descriptionLocal : x.descriptionEn}</option>)}
                </select>
              )}
            </div>
          ),
        },
        { id: 'description', header: 'Description', cell: (_f, i) => <input {...register(`labor.${i}.description`)} disabled={!editable} aria-label={`Description ${i + 1}`} className={cell} /> },
        { id: 'start', header: 'Start', className: 'w-44', cell: (_f, i) => <input type="datetime-local" {...register(`labor.${i}.startTime`)} disabled={!editable} aria-label={`Start ${i + 1}`} className={cell} /> },
        { id: 'end', header: 'End', className: 'w-44', cell: (_f, i) => <input type="datetime-local" {...register(`labor.${i}.endTime`)} disabled={!editable} aria-label={`End ${i + 1}`} className={cell} /> },
        { id: 'std', header: 'Std Hrs', className: 'w-20', cell: (_f, i) => <input type="number" step="0.25" {...register(`labor.${i}.standardHours`)} disabled={!editable} aria-label={`Std Hrs ${i + 1}`} className={cell} /> },
        { id: 'actual', header: 'Actual Hrs', className: 'w-20', cell: (_f, i) => <input type="number" step="0.25" {...register(`labor.${i}.actualHours`)} disabled={!editable} aria-label={`Actual Hrs ${i + 1}`} className={cell} /> },
        { id: 'rate', header: 'Rate', className: 'w-20 text-right', cell: (f) => <span className="text-sm" title={read(f.id)?.costRateSource ?? undefined}>{read(f.id) ? baht(Number(read(f.id)!.costRate)) : '—'}</span> },
        { id: 'discount', header: 'Discount', className: 'w-24', cell: (_f, i) => <input type="number" step="0.01" {...register(`labor.${i}.discount`)} disabled={!editable} aria-label={`Discount ${i + 1}`} className={cell} /> },
        { id: 'total', header: 'Total', className: 'w-24 text-right', cell: (f) => <span className="text-sm font-medium">{read(f.id) ? baht(Number(read(f.id)!.costAmount)) : '—'}</span> },
      ]}
      onAdd={() => rows.append({ description: '', chargeCode: '' })}
      onRemove={rows.remove}
      addLabel={t('wo.addLabor')}
      removeLabel={t('wo.removeLine')}
      emptyText="No labor lines"
      rowError={(i) => { const m = errors.labor?.[i]?.technicianId?.message; return m ? t(m) : undefined }}
      error={errors.labor?.message ? t(errors.labor.message) : undefined}
    />
  )
}
