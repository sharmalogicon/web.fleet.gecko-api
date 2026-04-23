'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { FuelLogFormValues } from '@/types/fuel-log'

interface Props {
  form: UseFormReturn<FuelLogFormValues>
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

export function FuelEntrySection({ form }: Props) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Equipment Code *" error={errors.equipmentCode?.message}>
        <input
          {...register('equipmentCode')}
          className={ic()}
          placeholder="e.g. EQ-001"
        />
      </Field>

      <Field label="Meter Update Date *" error={errors.meterUpdateDate?.message}>
        <input type="date" {...register('meterUpdateDate')} className={ic()} />
      </Field>

      <Field label="Voucher No.">
        <input
          {...register('voucherNo')}
          className={ic()}
          placeholder="e.g. FL-2024-001"
        />
      </Field>

      <Field label="Tank Meter (Liters) *" error={errors.tankMeter?.message}>
        <input
          type="number"
          step="0.01"
          min="0"
          {...register('tankMeter')}
          className={ic()}
          placeholder="0"
        />
      </Field>

      <Field label="Meter Reading (km)">
        <input
          type="number"
          step="1"
          min="0"
          {...register('meterRead')}
          className={ic()}
          placeholder="odometer km"
        />
      </Field>

      <Field label="Hour Meter (hrs)">
        <input
          type="number"
          step="0.1"
          min="0"
          {...register('hourMeter')}
          className={ic()}
          placeholder="engine hours"
        />
      </Field>

      <Field label="Driver Name">
        <input {...register('driverName')} className={ic()} placeholder="Driver full name" />
      </Field>

      <Field label="Driver Card No.">
        <input {...register('driverCard')} className={ic()} placeholder="e.g. DRV-001" />
      </Field>

      <Field label="Remarks">
        <textarea
          {...register('remarks')}
          rows={3}
          className={`${ic()} resize-none`}
          placeholder="Optional notes…"
        />
      </Field>
    </div>
  )
}
