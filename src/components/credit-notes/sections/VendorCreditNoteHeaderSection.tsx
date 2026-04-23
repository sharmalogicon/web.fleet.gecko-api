'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { VendorCreditNoteFormValues } from '@/types/vendor-credit-note'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<VendorCreditNoteFormValues>
  isNew: boolean
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function ic(ro?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${
    ro
      ? 'bg-gray-50 text-gray-500 border-gray-200'
      : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
  }`
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

export function VendorCreditNoteHeaderSection({ form, isNew }: Props) {
  const { t } = useT()
  const {
    register,
    watch,
    formState: { errors },
  } = form

  const discountAmount = watch('discountAmount')
  const vatAmount = watch('vatAmount')
  const totalAmount = watch('totalAmount')
  const nettAmount = watch('nettAmount')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={`${t('form.documentNo')} *`} error={errors.creditNoteNo?.message}>
          <input
            {...register('creditNoteNo')}
            disabled
            className={ic(true)}
            placeholder="e.g. CN-VD-2024-001"
          />
        </Field>

        <Field label={`${t('form.date')} *`} error={errors.creditNoteDate?.message}>
          <input type="date" {...register('creditNoteDate')} className={ic()} />
        </Field>

        <Field label={t('form.vendor')}>
          <input
            {...register('vendorName')}
            className={ic()}
            placeholder="e.g. Auto Parts Supplier Co."
          />
        </Field>

        <Field label="Vendor Code">
          <input
            {...register('vendorCode')}
            className={ic()}
            placeholder="e.g. VND-001"
          />
        </Field>

        <Field label="Credit Term">
          <input
            {...register('creditTerm')}
            className={ic()}
            placeholder="e.g. Net 30"
          />
        </Field>

        <Field label="Discount Type">
          <select {...register('discountType')} className={ic()}>
            <option value="">— None —</option>
            <option value="PERCENT">Percent (%)</option>
            <option value="AMOUNT">Amount (฿)</option>
          </select>
        </Field>

        <Field label="Discount">
          <input
            type="number"
            step="0.01"
            {...register('discount')}
            className={ic()}
            placeholder="0"
          />
        </Field>

        <Field label="Tax Type">
          <select {...register('taxType')} className={ic()}>
            <option value="VAT">VAT</option>
            <option value="NONE">None</option>
          </select>
        </Field>

        <Field label="VAT (%)">
          <input
            type="number"
            step="0.01"
            {...register('vat')}
            className={ic()}
            placeholder="e.g. 7"
          />
        </Field>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={t('form.address')}>
            <input
              {...register('address')}
              className={ic()}
              placeholder="Vendor address"
            />
          </Field>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={t('common.remarks')}>
            <textarea
              {...register('remarks')}
              rows={3}
              className={`${ic()} resize-none`}
              placeholder="Optional notes…"
            />
          </Field>
        </div>
      </div>

      {/* Financial summary */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Financial Summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Discount Amount</span>
            <span className="text-sm font-medium text-gray-800">
              {formatCurrency(discountAmount)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">VAT Amount</span>
            <span className="text-sm font-medium text-gray-800">
              {formatCurrency(vatAmount)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Total Amount</span>
            <span className="text-sm font-medium text-gray-800">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Nett Amount</span>
            <span className="text-base font-bold text-gray-900">
              {formatCurrency(nettAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
