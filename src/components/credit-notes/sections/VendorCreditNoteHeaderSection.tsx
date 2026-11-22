'use client'
import Link from 'next/link'
import type { UseFormReturn } from 'react-hook-form'
import { SupplierCodeInput } from '@/components/shared/PartyInputs'
import { CN_REASONS, cnTotals, type CnFormValues, type VendorCreditNoteDto } from '@/lib/api/fleet/vendorCreditNotes'
import { useVendorInvoices } from '@/lib/api/fleet/vendorInvoices'
import { usePostedReturns } from '@/lib/api/fleet/vendorCreditNotes'
import { useBranchContext } from '@/lib/api/platform/branches'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<CnFormValues>
  isNew: boolean
  editable: boolean
  current?: VendorCreditNoteDto
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-1">
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

const cur = (v?: number | string | null) =>
  v === undefined || v === null || v === '' ? '—' : '฿' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Same header. Supplier + branch fixed after create; optional links to an approved invoice / a posted return. */
export function VendorCreditNoteHeaderSection({ form, isNew, editable, current }: Props) {
  const { t } = useT()
  const { branches } = useBranchContext()
  const { register, watch, setValue, formState: { errors, isDirty } } = form
  const ro = !editable
  const supplier = (watch('vendorCode') ?? '').trim().toUpperCase()
  const invoices = useVendorInvoices({ supplierPartyCode: supplier || undefined }, editable && !!supplier)
  const returns = usePostedReturns(supplier, editable)
  const linkable = (invoices.data ?? []).filter((i) => ['APPROVED', 'EXPORTED', 'PAID'].includes(i.status))
  const preview = cnTotals({ lines: watch('lines'), discountType: watch('discountType'), discount: watch('discount'), vat: watch('vat'), taxType: watch('taxType') })
  const live = isDirty || !current
  const discountType = watch('discountType')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={t('form.documentNo')}>
          <input value={watch('documentNo') ?? ''} disabled className={ic(true)} placeholder="Auto-generated" />
        </Field>

        <Field label={`${t('form.date')} *`} error={errors.creditNoteDate?.message}>
          <input type="date" {...register('creditNoteDate')} disabled={ro} className={ic(ro, !!errors.creditNoteDate)} />
        </Field>

        <Field label={t('vcn.supplierNo')} error={errors.creditNoteNo?.message}>
          <input {...register('creditNoteNo')} disabled={ro} className={ic(ro)} placeholder="Supplier's credit note no" />
        </Field>

        <Field label={t('form.vendor')}>
          <input value={watch('vendorName') || current?.supplierName || ''} disabled className={ic(true)} />
        </Field>

        <Field label="Vendor Code *" error={errors.vendorCode?.message}>
          {isNew && editable ? (
            <SupplierCodeInput id="vcn-suppliers" value={watch('vendorCode') ?? ''}
              onChange={(v) => { setValue('vendorCode', v, { shouldDirty: true }); setValue('lines', [], { shouldDirty: true }) }}
              onName={(n) => setValue('vendorName', n ?? '')} className={ic(false, !!errors.vendorCode)} placeholder="Supplier code" />
          ) : (
            <input value={watch('vendorCode') ?? ''} disabled className={ic(true)} />
          )}
        </Field>

        <Field label="Credit Term">
          <input {...register('creditTerm')} disabled={ro} className={ic(ro)} />
        </Field>

        <Field label={`${t('vinv.branch')} *`} error={errors.branchId?.message}>
          <select {...register('branchId')} disabled={!isNew || ro} className={ic(!isNew || ro)}>
            {branches.map((b) => <option key={b.branchId} value={b.branchId}>{b.branchCode} · {b.displayName}</option>)}
            {current && !branches.some((b) => b.branchId === current.branchId) && <option value={current.branchId}>{current.branchId}</option>}
          </select>
        </Field>

        <Field label={t('vcn.invoice')} error={errors.vendorInvoiceNo?.message}>
          {editable ? (
            <select value={watch('vendorInvoiceId') ?? ''} className={ic()}
              onChange={(e) => {
                const inv = linkable.find((i) => i.vendorInvoiceId === e.target.value)
                setValue('vendorInvoiceId', e.target.value, { shouldDirty: true })
                setValue('vendorInvoiceNo', inv?.documentNo ?? '', { shouldDirty: true })
              }}>
              <option value="">—</option>
              {linkable.map((i) => <option key={i.vendorInvoiceId} value={i.vendorInvoiceId}>{i.documentNo} · {i.vendorInvoiceNo} · {cur(i.outstandingAmount)}</option>)}
              {watch('vendorInvoiceId') && !linkable.some((i) => i.vendorInvoiceId === watch('vendorInvoiceId')) && (
                <option value={watch('vendorInvoiceId')}>{watch('vendorInvoiceNo')}</option>
              )}
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <input value={current?.vendorInvoiceNo ?? ''} disabled className={ic(true)} placeholder="—" />
              {current?.vendorInvoiceId && <Link href={`/invoice/vendor/${current.vendorInvoiceId}`} className="text-xs text-blue-600 hover:underline">{t('common.open')}</Link>}
            </div>
          )}
        </Field>

        <Field label={t('vcn.return')} error={errors.vendorReturnNo?.message}>
          {editable ? (
            <select value={watch('vendorReturnId') ?? ''} className={ic()}
              onChange={(e) => {
                const r = returns.data?.find((x) => x.vendorReturnId === e.target.value)
                setValue('vendorReturnId', e.target.value, { shouldDirty: true })
                setValue('vendorReturnNo', r?.documentNo ?? '', { shouldDirty: true })
              }}>
              <option value="">—</option>
              {(returns.data ?? []).map((r) => <option key={r.vendorReturnId} value={r.vendorReturnId}>{r.documentNo} · {cur(r.expectedCreditAmount ?? r.totalCost)}</option>)}
              {watch('vendorReturnId') && !returns.data?.some((r) => r.vendorReturnId === watch('vendorReturnId')) && (
                <option value={watch('vendorReturnId')}>{watch('vendorReturnNo')}</option>
              )}
            </select>
          ) : (
            <input value={current?.vendorReturnNo ?? ''} disabled className={ic(true)} placeholder="—" />
          )}
        </Field>

        <Field label={t('vcn.reason')}>
          <select {...register('reasonCode')} disabled={ro} className={ic(ro)}>
            <option value="">—</option>
            {CN_REASONS.map((r) => <option key={r} value={r}>{t(`vcn.reasonOpt.${r}`)}</option>)}
          </select>
        </Field>

        <Field label="Discount Type">
          <select {...register('discountType')} disabled={ro} className={ic(ro)}>
            <option value="AMOUNT">Amount (฿)</option>
            <option value="PERCENT">Percent (%)</option>
          </select>
        </Field>

        <Field label={discountType === 'PERCENT' ? 'Discount (%)' : 'Discount'} error={errors.discount?.message}>
          <input type="number" step="0.01" min="0" {...register('discount')} disabled={ro} className={ic(ro)} />
        </Field>

        <Field label="Tax Type">
          <select {...register('taxType')} disabled={ro} className={ic(ro)}>
            <option value="VAT">VAT</option>
            <option value="NONE">None</option>
          </select>
        </Field>

        <Field label="VAT (%)" error={errors.vat?.message}>
          <input type="number" step="0.01" min="0" {...register('vat')} disabled={ro || watch('taxType') === 'NONE'} className={ic(ro || watch('taxType') === 'NONE')} />
        </Field>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={t('form.address')}>
            <textarea value={current?.supplierAddress ?? ''} disabled rows={2} className={`${ic(true)} resize-none`} placeholder={t('vinv.addressHint')} />
          </Field>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={t('common.remarks')} error={errors.remarks?.message}>
            <textarea {...register('remarks')} rows={3} disabled={ro} className={`${ic(ro)} resize-none`} />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financial Summary{live && editable ? ` · ${t('claim.previewHint')}` : ''}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Discount Amount', live ? preview.discount : current.discountAmount],
            ['VAT Amount', live ? preview.tax : current.taxAmount],
            ['Total Amount', live ? preview.subtotal : current.subtotalAmount],
          ].map(([label, v]) => (
            <div key={label as string} className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-800">{cur(v as number)}</span>
            </div>
          ))}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Nett Amount</span>
            <span className="text-base font-bold text-gray-900">{cur(live ? preview.total : current.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
