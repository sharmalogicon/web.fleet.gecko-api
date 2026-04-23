'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { TireMaintenanceFormValues } from '@/types/tire-maintenance'

interface Props {
  form: UseFormReturn<TireMaintenanceFormValues>
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

interface FinancialSummaryProps {
  totalAmount: number
  vat?: number
  vatAmount?: number
  nettAmount?: number
}

function FinancialSummary({ totalAmount, vat, vatAmount, nettAmount }: FinancialSummaryProps) {
  return (
    <div className="sm:col-span-2 lg:col-span-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Financial Summary (read-only)
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-400">Sub-total</p>
          <p className="text-sm font-medium text-gray-900">
            ฿{totalAmount.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">VAT %</p>
          <p className="text-sm font-medium text-gray-900">{vat != null ? `${vat}%` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">VAT Amount</p>
          <p className="text-sm font-medium text-gray-900">
            {vatAmount != null ? `฿${vatAmount.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Nett Amount</p>
          <p className="text-sm font-semibold text-gray-900">
            {nettAmount != null ? `฿${nettAmount.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

export function MaintenanceHeaderSection({ form, isNew }: Props) {
  const {
    register,
    watch,
    formState: { errors },
  } = form

  const totalAmount = watch('totalAmount') ?? 0
  const vat = watch('vat')
  const vatAmount = watch('vatAmount')
  const nettAmount = watch('nettAmount')

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Document No. *" error={errors.documentNo?.message}>
        <input
          {...register('documentNo')}
          disabled={!isNew}
          className={ic(!isNew)}
          placeholder="e.g. TM-2024-001"
        />
      </Field>

      <Field label="Document Date *" error={errors.documentDate?.message}>
        <input
          type="date"
          {...register('documentDate')}
          className={ic()}
        />
      </Field>

      <Field label="Equipment Code">
        <input
          {...register('equipmentCode')}
          className={ic()}
          placeholder="e.g. EQ-001"
        />
      </Field>

      <Field label="Vendor Name *" error={errors.vendorName?.message}>
        <input
          {...register('vendorName')}
          className={ic()}
          placeholder="Vendor / workshop name"
        />
      </Field>

      <Field label="Inspector">
        <input
          {...register('inspector')}
          className={ic()}
          placeholder="Inspector name"
        />
      </Field>

      <Field label="Driver Name">
        <input
          {...register('driverName')}
          className={ic()}
          placeholder="Driver name"
        />
      </Field>

      <Field label="Meter Read (km)">
        <input
          type="number"
          {...register('meterRead')}
          className={ic()}
          placeholder="e.g. 45200"
        />
      </Field>

      <Field label="Total Hours">
        <input
          type="number"
          step="0.5"
          {...register('totalHours')}
          className={ic()}
          placeholder="e.g. 3200"
        />
      </Field>

      <Field label="Inspection Date">
        <input
          type="date"
          {...register('inspectionDate')}
          className={ic()}
        />
      </Field>

      <Field label="Required Date">
        <input
          type="date"
          {...register('requiredDate')}
          className={ic()}
        />
      </Field>

      <Field label="Billing Customer">
        <input
          {...register('billingCustomerName')}
          className={ic()}
          placeholder="Customer name"
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
        <Field label="Remarks">
          <textarea
            {...register('remarks')}
            rows={3}
            className={`${ic()} resize-none`}
            placeholder="Optional notes…"
          />
        </Field>
      </div>

      <FinancialSummary
        totalAmount={Number(totalAmount)}
        vat={vat != null ? Number(vat) : undefined}
        vatAmount={vatAmount != null ? Number(vatAmount) : undefined}
        nettAmount={nettAmount != null ? Number(nettAmount) : undefined}
      />
    </div>
  )
}
