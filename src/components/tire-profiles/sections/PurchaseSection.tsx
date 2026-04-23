'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { TireProfileFormValues } from '@/types/tire-profile'

interface Props {
  form: UseFormReturn<TireProfileFormValues>
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

export function PurchaseSection({ form }: Props) {
  const { register } = form

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Purchased Date">
        <input type="date" {...register('purchasedDate')} className={ic()} />
      </Field>

      <Field label="Purchased Price (฿)">
        <input
          type="number"
          step="0.01"
          {...register('purchasedPrice')}
          className={ic()}
          placeholder="e.g. 8500"
        />
      </Field>

      <Field label="Vendor Name">
        <input
          {...register('vendorName')}
          className={ic()}
          placeholder="e.g. Siam Tyre Service"
        />
      </Field>

      <Field label="Vendor Invoice No.">
        <input
          {...register('vendorInvoiceNo')}
          className={ic()}
          placeholder="e.g. STS-INV-2024-001"
        />
      </Field>

      <Field label="PO No.">
        <input
          {...register('poNo')}
          className={ic()}
          placeholder="e.g. PO-2024-001"
        />
      </Field>

      <Field label="Warranty Mileage (km)">
        <input
          type="number"
          step="1"
          {...register('warrantyMileage')}
          className={ic()}
          placeholder="e.g. 100000"
        />
      </Field>

      <Field label="Warranty Expiry Date">
        <input type="date" {...register('warrantyDate')} className={ic()} />
      </Field>
    </div>
  )
}
