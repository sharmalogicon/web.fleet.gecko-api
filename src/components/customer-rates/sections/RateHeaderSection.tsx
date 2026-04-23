'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { CustomerRateFormValues } from '@/types/customer-rate'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<CustomerRateFormValues>
  isNew: boolean
}

function Field({
  label,
  error,
  children,
  fullWidth,
}: {
  label: string
  error?: string
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <div className={`flex flex-col gap-1${fullWidth ? ' sm:col-span-2 lg:col-span-3' : ''}`}>
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

export function RateHeaderSection({ form, isNew }: Props) {
  const { t } = useT()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={`${t('form.quotationNo')} *`} error={errors.quotationNo?.message}>
          <input
            {...register('quotationNo')}
            disabled={!isNew}
            className={ic(!isNew)}
            placeholder="e.g. QT-2024-001"
          />
        </Field>

        <Field label="Quotation Date *" error={errors.quotationDate?.message}>
          <input
            type="date"
            {...register('quotationDate')}
            className={ic()}
          />
        </Field>

        <Field label="Effective Date *" error={errors.effectiveDate?.message}>
          <input
            type="date"
            {...register('effectiveDate')}
            className={ic()}
          />
        </Field>

        <Field label="Expiry Date *" error={errors.expiryDate?.message}>
          <input
            type="date"
            {...register('expiryDate')}
            className={ic()}
          />
        </Field>

        <Field label="Customer Code">
          <input
            {...register('customerCode')}
            className={ic()}
            placeholder="e.g. CUST-001"
          />
        </Field>

        <Field label="Customer Name">
          <input
            {...register('customerName')}
            className={ic()}
            placeholder="Customer company name"
          />
        </Field>

        <Field label="Agent Code">
          <input
            {...register('agentCode')}
            className={ic()}
            placeholder="e.g. AGT-001"
          />
        </Field>

        <Field label="Forwarder Code">
          <input
            {...register('forwarderCode')}
            className={ic()}
            placeholder="e.g. FWD-001"
          />
        </Field>

        <Field label="Sales Person">
          <input
            {...register('salesPerson')}
            className={ic()}
            placeholder="Sales representative name"
          />
        </Field>

        <Field label="Contact No.">
          <input
            {...register('contactNo')}
            className={ic()}
            placeholder="e.g. 02-123-4567"
          />
        </Field>

        <Field label="Created By">
          <input
            {...register('createdBy')}
            className={ic()}
            placeholder="e.g. Sales Team"
          />
        </Field>

        <Field label={t('common.remarks')} fullWidth>
          <textarea
            {...register('remarks')}
            rows={2}
            className={`${ic()} resize-none`}
            placeholder="Additional remarks…"
          />
        </Field>
      </div>
    </div>
  )
}
