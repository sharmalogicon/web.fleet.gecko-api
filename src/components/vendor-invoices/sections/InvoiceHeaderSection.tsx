'use client'
import type { UseFormReturn } from 'react-hook-form'
import { SupplierCodeInput } from '@/components/shared/PartyInputs'
import { invoiceTotals, type InvoiceFormValues, type VendorInvoiceDto } from '@/lib/api/fleet/vendorInvoices'
import { useBranchContext } from '@/lib/api/platform/branches'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<InvoiceFormValues>
  isNew: boolean
  editable: boolean
  current?: VendorInvoiceDto
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

function formatCurrency(v?: number | string | null): string {
  if (v === undefined || v === null || v === '') return '—'
  return '฿' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Same header ("Customer" = the supplier). Supplier + branch fixed after create; the supplier's invoice no + date
 * are required. Totals are the API's (previewed while editing); WHT tick = 3 % on service lines.
 */
export function InvoiceHeaderSection({ form, isNew, editable, current }: Props) {
  const { t } = useT()
  const { branches } = useBranchContext()
  const { register, watch, setValue, formState: { errors, isDirty } } = form
  const ro = !editable
  const discountType = watch('discountType')
  const preview = invoiceTotals({
    lines: watch('lines'), discountType, discount: watch('discount'), vat: watch('vat'), isWithholdingTax: watch('isWithholdingTax'),
  })
  const live = isDirty || !current
  const fig = {
    subtotal: live ? preview.subtotal : current.subtotalAmount,
    discount: live ? preview.discount : current.discountAmount,
    tax: live ? preview.tax : current.taxAmount,
    total: live ? preview.total : current.totalAmount,
    whtBase: live ? preview.whtBase : current.whtBaseAmount,
    wht: live ? preview.wht : current.whtAmount,
    net: live ? preview.netPayable : current.netPayable,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={t('form.documentNo')}>
          <input {...register('documentNo')} disabled className={ic(true)} placeholder="Auto-generated" />
        </Field>

        <Field label={`${t('form.date')} *`} error={errors.documentDate?.message}>
          <input type="date" {...register('documentDate')} disabled={ro} className={ic(ro)} />
        </Field>

        <Field label={`${t('form.invoiceNo')} *`} error={errors.vendorInvoiceNo?.message}>
          <input {...register('vendorInvoiceNo')} disabled={ro} className={ic(ro, !!errors.vendorInvoiceNo)} placeholder="Supplier's invoice no" />
        </Field>

        <Field label={t('form.customer')}>
          <input value={watch('customerName') || current?.supplierName || ''} disabled className={ic(true)} placeholder={t('vinv.supplierName')} />
        </Field>

        <Field label="Customer Code *" error={errors.customerCode?.message}>
          {isNew && editable ? (
            <SupplierCodeInput id="vinv-suppliers" value={watch('customerCode') ?? ''}
              onChange={(v) => { setValue('customerCode', v, { shouldDirty: true }); setValue('lines', [], { shouldDirty: true }) }}
              onName={(n) => setValue('customerName', n ?? '')} className={ic(false, !!errors.customerCode)} placeholder="Supplier code" />
          ) : (
            <input value={watch('customerCode') ?? ''} disabled className={ic(true)} />
          )}
        </Field>

        <Field label="Credit Term" error={errors.creditTerm?.message}>
          <input {...register('creditTerm')} disabled={ro} className={ic(ro)} placeholder="Payment term code" />
        </Field>

        <Field label={`${t('vinv.invoiceDate')} *`} error={errors.invoiceDate?.message}>
          <input type="date" {...register('invoiceDate')} disabled={ro} className={ic(ro, !!errors.invoiceDate)} />
        </Field>

        <Field label={t('vinv.dueDate')} error={errors.dueDate?.message}>
          <input type="date" {...register('dueDate')} disabled={ro} className={ic(ro)} />
        </Field>

        <Field label={`${t('vinv.branch')} *`} error={errors.branchId?.message}>
          <select {...register('branchId')} disabled={!isNew || ro} className={ic(!isNew || ro)}>
            {branches.map((b) => <option key={b.branchId} value={b.branchId}>{b.branchCode} · {b.displayName}</option>)}
            {current && !branches.some((b) => b.branchId === current.branchId) && <option value={current.branchId}>{current.branchId}</option>}
          </select>
        </Field>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={t('form.address')}>
            <textarea value={current?.supplierAddress ?? ''} disabled rows={2} className={`${ic(true)} resize-none`} placeholder={t('vinv.addressHint')} />
          </Field>
        </div>

        <Field label="Discount Type">
          <select {...register('discountType')} disabled={ro} className={ic(ro)}>
            <option value="AMOUNT">Amount (฿)</option>
            <option value="PERCENT">Percent (%)</option>
          </select>
        </Field>

        <Field label={discountType === 'PERCENT' ? 'Discount (%)' : 'Discount Amount (฿)'} error={errors.discount?.message}>
          <input type="number" step="0.01" min="0" {...register('discount')} disabled={ro} className={ic(ro)} />
        </Field>

        <Field label="VAT (%)" error={errors.vat?.message}>
          <input type="number" step="0.01" min="0" {...register('vat')} disabled={ro} className={ic(ro)} placeholder="e.g. 7" />
        </Field>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Withholding Tax</label>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" {...register('isWithholdingTax')} disabled={ro} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Apply Withholding Tax (3% on services)</span>
          </label>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={t('common.remarks')} error={errors.remarks?.message}>
            <textarea {...register('remarks')} rows={3} disabled={ro} className={`${ic(ro)} resize-none`} placeholder="Optional notes…" />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Financial Summary{live && editable ? ` · ${t('claim.previewHint')}` : ''}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Subtotal', fig.subtotal], ['Discount Amount', fig.discount], ['VAT Amount', fig.tax], ['Total Amount', fig.total],
            [t('vinv.whtBase'), fig.whtBase], [t('vinv.wht'), fig.wht],
          ].map(([label, v]) => (
            <div key={label as string} className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-800">{formatCurrency(v as number)}</span>
            </div>
          ))}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Nett Amount ({t('vinv.netPayable')})</span>
            <span className="text-base font-bold text-gray-900">{formatCurrency(fig.net)}</span>
          </div>
        </div>
        {current && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-gray-200">
            {[
              [t('vinv.expected'), current.expectedAmount], [t('vinv.variance'), current.varianceAmount],
              [t('vinv.credited'), current.creditedAmount], [t('vinv.paid'), current.paidAmount],
              ...(Number(current.pendingPaymentAmount ?? 0) !== 0 ? [[t('vinv.pendingPayment'), current.pendingPaymentAmount]] : []),
            ].map(([label, v]) => (
              <div key={label as string} className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-800">{formatCurrency(v as number)}</span>
              </div>
            ))}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500">{t('vinv.outstanding')}</span>
              <span className="text-base font-bold text-gray-900">{formatCurrency(current.outstandingAmount)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
