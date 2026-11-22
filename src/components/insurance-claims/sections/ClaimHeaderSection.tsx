'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { UseFormReturn } from 'react-hook-form'
import { claimTotals, type ClaimFormValues, type InsuranceClaimDto } from '@/lib/api/fleet/insuranceClaims'
import { useAccidents } from '@/lib/api/fleet/accidents'
import { fmtDate } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<ClaimFormValues>
  isNew: boolean
  editable: boolean
  current?: InsuranceClaimDto
}

function Field({ label, error, children, fullWidth }: { label: string; error?: string; children: React.ReactNode; fullWidth?: boolean }) {
  const { t } = useT()
  return (
    <div className={`flex flex-col gap-1${fullWidth ? ' sm:col-span-2 lg:col-span-3' : ''}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{t(error)}</p>}
    </div>
  )
}

function ic(ro?: boolean, err?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${err ? 'border-red-400' : ''} ${
    ro ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
  }`
}

function ReadonlyAmount({ label, value }: { label: string; value?: number | string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 border-gray-200 font-mono text-right">
        {value === null || value === undefined ? '—' : `฿${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
      </div>
    </div>
  )
}

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

/** The accident no (on a new claim) with suggestions from GET /accidents?search=; resolves to accidentId. */
function AccidentNoInput({ form }: { form: UseFormReturn<ClaimFormValues> }) {
  const value = form.watch('accidentRefNo') ?? ''
  const search = useDebounced(value.trim())
  const list = useAccidents({ search: search || undefined })
  const rows = list.data
  useEffect(() => {
    if (!rows) return
    const hit = rows.find((a) => a.documentNo.toUpperCase() === value.trim().toUpperCase())
    form.setValue('accidentId', hit?.accidentId ?? '', { shouldDirty: true })
    if (hit?.insurancePolicyNo && !form.getValues('policyNo')) form.setValue('policyNo', hit.insurancePolicyNo, { shouldDirty: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, value])
  return (
    <>
      <input value={value} onChange={(e) => form.setValue('accidentRefNo', e.target.value, { shouldDirty: true })} list="claim-accidents"
        className={ic(false, !!form.formState.errors.accidentRefNo)} placeholder="e.g. ACC-2024-001" autoComplete="off" />
      <datalist id="claim-accidents">
        {rows?.slice(0, 50).map((a) => <option key={a.accidentId} value={a.documentNo}>{a.assetCode} · {fmtDate(a.occurredAt)}</option>)}
      </datalist>
    </>
  )
}

/**
 * Same header. Accident fixed after create; equipment / driver read-only from the accident; insurer = "Vendor";
 * discount + VAT % keyed; the summary is the API's (previewed from the lines while editing).
 */
export function ClaimHeaderSection({ form, isNew, editable, current }: Props) {
  const { t } = useT()
  const { register, watch, formState: { errors } } = form
  const ro = !editable
  const totals = claimTotals({ lines: watch('lines'), discountAmount: watch('discountAmount'), vat: watch('vat') })
  const dirty = form.formState.isDirty
  const vat = watch('vat') ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={t('form.documentNo')}>
          <input {...register('documentNo')} disabled className={ic(true)} placeholder="Auto-generated" />
        </Field>

        <Field label={`${t('form.date')} *`} error={errors.documentDate?.message}>
          <input type="date" {...register('documentDate')} disabled={ro} className={ic(ro)} />
        </Field>

        <Field label={`${t('form.accidentNo')} *`} error={errors.accidentRefNo?.message ?? errors.accidentId?.message}>
          {isNew && editable ? <AccidentNoInput form={form} /> : (
            <div className="flex items-center gap-2">
              <input value={watch('accidentRefNo') ?? ''} disabled className={ic(true)} />
              {current && <Link href={`/fleet/accidents/${current.accidentId}`} className="text-xs text-blue-600 hover:underline">{t('common.open')}</Link>}
            </div>
          )}
        </Field>

        <Field label={t('form.claimNo')} error={errors.claimRefNo?.message}>
          <input {...register('claimRefNo')} disabled={ro} className={ic(ro)} placeholder="Insurer claim reference" />
        </Field>

        <Field label={t('form.equipmentCode')}>
          <input value={current?.assetCode ?? ''} disabled className={ic(true)} placeholder={t('claim.fromAccident')} />
        </Field>

        <Field label={t('claim.policyNo')} error={errors.policyNo?.message}>
          <input {...register('policyNo')} disabled={ro} className={ic(ro)} />
        </Field>

        <Field label={t('form.driverName')}>
          <input value={current?.driverName ?? ''} disabled className={ic(true)} placeholder={t('claim.fromAccident')} />
        </Field>

        <Field label="Driver ID">
          <input value={current?.driverCode ?? ''} disabled className={ic(true)} placeholder={t('claim.fromAccident')} />
        </Field>

        <Field label={`${t('form.vendor')} (${t('claim.insurer')})`} error={errors.vendorName?.message}>
          <input {...register('vendorName')} disabled={ro} className={ic(ro, !!errors.vendorName)} placeholder="Insurance company" />
        </Field>

        <Field label={t('form.contactPerson')} error={errors.contactPerson?.message}>
          <input {...register('contactPerson')} disabled={ro} className={ic(ro)} placeholder="Insurer contact name" />
        </Field>

        <Field label="Claim By" error={errors.claimBy?.message}>
          <input {...register('claimBy')} disabled={ro} className={ic(ro)} placeholder="e.g. Fleet Manager" />
        </Field>

        <Field label="Revised From">
          <div className="flex items-center gap-2">
            <input value={current?.revisedFromNo ?? ''} disabled className={ic(true)} placeholder="—" />
            {current?.revisedFromClaimId && (
              <Link href={`/fleet/insurance-claims/${current.revisedFromClaimId}`} className="text-xs text-blue-600 hover:underline">{t('common.open')}</Link>
            )}
          </div>
        </Field>

        <Field label="Discount" error={errors.discountAmount?.message}>
          <input type="number" step="0.01" min="0" {...register('discountAmount')} disabled={ro} className={ic(ro)} />
        </Field>

        <Field label="VAT %" error={errors.vat?.message}>
          <input type="number" step="0.01" {...register('vat')} disabled={ro} className={ic(ro)} placeholder="7" />
        </Field>

        <Field label={t('common.remarks')} fullWidth error={errors.remarks?.message}>
          <textarea {...register('remarks')} rows={2} disabled={ro} className={`${ic(ro)} resize-none`} placeholder="Additional remarks…" />
        </Field>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Financial Summary (read-only){dirty && editable ? ` · ${t('claim.previewHint')}` : ''}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <ReadonlyAmount label="Total Amount" value={dirty || !current ? totals.subtotal : current.subtotalAmount} />
          <ReadonlyAmount label="Discount" value={dirty || !current ? totals.discount : current.discountAmount} />
          <ReadonlyAmount label={`VAT (${vat}%)`} value={dirty || !current ? totals.tax : current.taxAmount} />
          <ReadonlyAmount label="Nett Amount" value={dirty || !current ? totals.total : current.totalAmount} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Line Items</label>
            <div className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 border-gray-200 text-right font-mono">
              {watch('lines').length} line{watch('lines').length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        {current && (current.approvedAmount != null || current.settledAmount != null) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
            <ReadonlyAmount label={t('claim.approvedAmount')} value={current.approvedAmount} />
            <ReadonlyAmount label={t('claim.deductible')} value={current.deductibleAmount} />
            <ReadonlyAmount label={t('claim.settledAmount')} value={current.settledAmount} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">{t('claim.settledAt')}</label>
              <div className="px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 border-gray-200">{fmtDate(current.settledAt)}{current.settlementRef ? ` · ${current.settlementRef}` : ''}</div>
            </div>
            {current.erpRef && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">ERP ref</label>
                <div className="px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 border-gray-200 font-mono">{current.erpRef}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
