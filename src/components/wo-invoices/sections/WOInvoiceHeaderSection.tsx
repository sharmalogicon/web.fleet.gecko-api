'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { WOInvoiceFormValues } from '@/types/wo-invoice'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<WOInvoiceFormValues>
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

export function WOInvoiceHeaderSection({ form, isNew }: Props) {
  const { t } = useT()
  const {
    register,
    watch,
    formState: { errors },
  } = form

  const vatAmount = watch('vatAmount')
  const nettAmount = watch('nettAmount')
  const totalAmount = watch('totalAmount')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={`${t('form.receiptNo')} *`} error={errors.receiptNo?.message}>
          <input
            {...register('receiptNo')}
            disabled={!isNew}
            className={ic(!isNew)}
            placeholder="e.g. WOI-2024-001"
          />
        </Field>

        <Field label={`${t('form.date')} *`} error={errors.cashReceiptDate?.message}>
          <input type="date" {...register('cashReceiptDate')} className={ic()} />
        </Field>

        <Field label={t('form.customer')}>
          <input
            {...register('customerName')}
            className={ic()}
            placeholder="e.g. Bangkok Logistics Co."
          />
        </Field>

        <Field label="Customer Code">
          <input
            {...register('customerCode')}
            className={ic()}
            placeholder="e.g. CST-001"
          />
        </Field>

        <Field label="Credit Term">
          <input
            {...register('creditTerm')}
            className={ic()}
            placeholder="e.g. Net 30"
          />
        </Field>

        <Field label="Work Order Discount (%)">
          <input
            type="number"
            step="0.01"
            {...register('workOrderDiscount')}
            className={ic()}
            placeholder="0"
          />
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
              placeholder="Billing address"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
