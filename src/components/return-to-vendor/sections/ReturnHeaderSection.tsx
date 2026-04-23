'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { ReturnToVendorFormValues } from '@/types/return-to-vendor'

interface Props {
  form: UseFormReturn<ReturnToVendorFormValues>
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

export function ReturnHeaderSection({ form, isNew }: Props) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Document No. *" error={errors.documentNo?.message}>
          <input
            {...register('documentNo')}
            disabled={!isNew}
            className={ic(!isNew)}
            placeholder="e.g. RTV-2024-001"
          />
        </Field>

        <Field label="Return Date *" error={errors.returnDate?.message}>
          <input type="date" {...register('returnDate')} className={ic()} />
        </Field>

        <Field label="Vendor Name *" error={errors.vendorName?.message}>
          <input
            {...register('vendorName')}
            className={ic()}
            placeholder="e.g. ABC Auto Parts Co., Ltd."
          />
        </Field>

        <Field label="Vendor Code">
          <input
            {...register('vendorCode')}
            className={ic()}
            placeholder="e.g. VND-001"
          />
        </Field>

        <Field label="Returned By">
          <input
            {...register('returnBy')}
            className={ic()}
            placeholder="e.g. Somchai K."
          />
        </Field>

        <Field label="Total Amount">
          <input
            {...register('totalAmount', { valueAsNumber: true })}
            type="number"
            min={0}
            step={0.01}
            className={ic()}
            placeholder="0.00"
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
      </div>
    </div>
  )
}
