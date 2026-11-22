'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UseFormReturn } from 'react-hook-form'
import { useT } from '@/i18n/I18nContext'
import { AssetCodeInput, DriverCodeInput } from '@/components/meters/MeterBits'
import { PartyCodeInput, SupplierCodeInput } from '@/components/shared/PartyInputs'
import { viewWoStatus, woTotals, WO_PRIORITIES, WO_TYPES, type WoFormValues, type WorkOrderDto } from '@/lib/api/fleet/workOrders'

interface Props {
  form: UseFormReturn<WoFormValues>
  isNew: boolean
  current?: WorkOrderDto
  editable: boolean
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  const { t } = useT()
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{t(error)}</p>}
    </div>
  )
}

function ic(ro?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${ro ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'}`
}
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
const baht = (v: number) => `฿${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Same fields as before. Number, request, start, status, approval and totals are the API's (read-only). */
export function WOGeneralSection({ form, isNew, current, editable }: Props) {
  const { t } = useT()
  const { register, watch, setValue, formState: { errors } } = form
  const [vendorName, setVendorName] = useState<string | null>(null)
  const status = current ? viewWoStatus(current) : { status: 'DRAFT', onHold: false, closed: false }
  const totals = woTotals(current)
  const ro = !editable
  const woType = watch('serviceTypeCategory')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={t('form.woNo')}>
          <input {...register('documentNo')} readOnly className={ic(true)} placeholder="Auto-generated" />
        </Field>
        <Field label="WR Reference">
          {current?.workRequestId
            ? <Link href={`/fleet/work-requests/${current.workRequestId}`} className={`${ic(true)} text-blue-600 hover:underline`}>{t('wo.openRequest')}</Link>
            : <input readOnly value="" className={ic(true)} />}
        </Field>
        <Field label={t('form.orderDate')} error={errors.orderDate?.message}>
          <input type="date" {...register('orderDate')} disabled={ro} className={ic(ro)} />
        </Field>
        <Field label="Start Date">
          <input readOnly value={fmtDate(current?.startedAt)} className={ic(true)} placeholder={t('wo.setByStart')} />
        </Field>
        <Field label={t('form.status')}>
          <div className="flex items-center gap-2">
            <input readOnly value={status.status} className={ic(true)} />
            {status.onHold && <span title={current?.holdReasonCode ?? undefined} className="text-xs text-amber-700 whitespace-nowrap">{t('wo.onHold')}</span>}
            {status.closed && <span className="text-xs text-gray-500 whitespace-nowrap">{t('wo.closed')}</span>}
          </div>
        </Field>
        <Field label={t('form.priority')} error={errors.priority?.message}>
          <select {...register('priority')} disabled={ro} className={ic(ro)}>
            {WO_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label={t('form.equipmentCode')} error={errors.equipmentCode?.message ?? errors.assetProfileId?.message}>
          {isNew ? (
            <AssetCodeInput id="wo-assets" value={watch('equipmentCode') ?? ''} onChange={(v) => setValue('equipmentCode', v, { shouldDirty: true })}
              onResolve={(a) => setValue('assetProfileId', a?.id ?? '', { shouldDirty: true })} className={ic()} />
          ) : (
            <input readOnly value={watch('equipmentCode') ?? ''} className={ic(true)} title={t('wo.assetFixed')} />
          )}
        </Field>
        <Field label={t('form.driver')} error={errors.driverName?.message}>
          <DriverCodeInput id="wo-drivers" value={watch('driverName') ?? ''} onChange={(v) => setValue('driverName', v, { shouldDirty: true })}
            onResolve={(d) => setValue('driverId', d?.id ?? '', { shouldDirty: true })} className={ic(ro)} />
        </Field>
        <Field label={t('form.category')} error={errors.serviceTypeCategory?.message}>
          <select {...register('serviceTypeCategory')} disabled={ro} className={ic(ro)}>
            {WO_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Billing Customer" error={errors.billingCustomer?.message}>
          <PartyCodeInput id="wo-parties" value={watch('billingCustomer') ?? ''} onChange={(v) => setValue('billingCustomer', v, { shouldDirty: true })}
            disabled={ro} className={ic(ro)} />
        </Field>
        <Field label={t('form.vendor')}>
          <input readOnly value={vendorName ?? ''} className={ic(true)} />
        </Field>
        <Field label="Vendor Code" error={errors.vendorCode?.message}>
          <SupplierCodeInput id="wo-suppliers" value={watch('vendorCode') ?? ''} onChange={(v) => setValue('vendorCode', v, { shouldDirty: true })}
            onName={setVendorName} disabled={ro} className={ic(ro)} />
        </Field>
        <Field label={t('form.invoiceNo')} error={errors.vendorInvoiceNo?.message}>
          <input {...register('vendorInvoiceNo')} disabled={ro || !watch('vendorCode')} className={ic(ro || !watch('vendorCode'))} />
        </Field>
        <Field label="WO Invoice No.">
          <input readOnly value="" title={t('equipment.laterPhase')} className={ic(true)} />
        </Field>
        <Field label={t('form.claimNo')}>
          <input readOnly value="" title={t('equipment.laterPhase')} className={ic(true)} />
        </Field>
        <Field label={t('form.meterReading')} error={errors.meterRead?.message}>
          <input type="number" {...register('meterRead')} disabled={ro} className={ic(ro)} />
        </Field>
        <Field label={t('wo.meterOut')} error={errors.meterOutKm?.message}>
          <input type="number" {...register('meterOutKm')} disabled={ro} className={ic(ro)} placeholder={t('wo.meterOutHint')} />
        </Field>
        <Field label="VAT (%)" error={errors.vat?.message}>
          <input type="number" step="0.1" {...register('vat')} disabled={ro} className={ic(ro)} />
        </Field>

        <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={current?.approvalStatus === 'APPROVED'} readOnly disabled className="w-4 h-4 rounded border-gray-300" />
            Approved{current?.approvalStatus === 'PENDING' && <span className="text-xs text-amber-700">({t('wo.approvalPending')})</span>}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            {/* The tyre checkbox = work-order type TYRE. */}
            <input type="checkbox" checked={woType === 'TYRE'} disabled={ro}
              onChange={(e) => setValue('serviceTypeCategory', e.target.checked ? 'TYRE' : 'CORRECTIVE', { shouldDirty: true })} className="w-4 h-4 rounded border-gray-300" />
            Tire Maintenance
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={current?.status === 'CANCELLED'} readOnly disabled className="w-4 h-4 rounded border-gray-300" />
            Cancelled
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('takesAssetOos')} disabled={ro} className="w-4 h-4 rounded border-gray-300" />
            {t('wo.takesAssetOos')}
          </label>
        </div>
        {current?.approvedAt && (
          <Field label="Approved On"><input readOnly value={fmtDate(current.approvedAt)} className={ic(true)} /></Field>
        )}
        <Field label={t('common.remarks')} className="sm:col-span-2 lg:col-span-3">
          <textarea {...register('remarks')} disabled={ro} rows={3} className={`${ic(ro)} resize-none`} />
        </Field>
      </div>

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm">
          {[
            ['Parts', totals.parts], ['Labor', totals.labor], ['Discount', totals.discount], ['VAT', totals.tax], ['Grand Total', totals.grand], [t('wo.cost'), totals.cost],
          ].map(([label, value]) => (
            <div key={label as string} className="flex flex-col">
              <span className="text-xs text-gray-500">{label}</span>
              <span className={`font-medium ${label === 'Grand Total' ? 'text-gray-900' : 'text-gray-700'}`}>{baht(value as number)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
