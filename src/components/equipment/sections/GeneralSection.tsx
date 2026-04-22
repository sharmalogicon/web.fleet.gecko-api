'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { EquipmentFormValues } from '@/types/equipment'

interface Props {
  form: UseFormReturn<EquipmentFormValues>
  isNew: boolean
}

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'UNDER REPAIR', 'DISPOSED'] as const
const METER_OPTIONS = ['KM', 'HR', 'MILE'] as const
const FUEL_OPTIONS = ['Diesel', 'Petrol', 'LPG', 'Electric'] as const

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

function inputClass(hasError?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  }`
}

export function GeneralSection({ form, isNew }: Props) {
  const {
    register,
    formState: { errors },
  } = form
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Equipment Code *" error={errors.code?.message}>
        <input
          {...register('code')}
          disabled={!isNew}
          className={`${inputClass(!!errors.code)} ${!isNew ? 'bg-gray-50 text-gray-500' : ''}`}
          placeholder="EQ-001"
        />
      </Field>

      <Field label="Equipment Type">
        <input {...register('equipmentType')} className={inputClass()} placeholder="e.g. 10W, 6W" />
      </Field>

      <Field label="Category">
        <input {...register('category')} className={inputClass()} placeholder="TRUCK, FORKLIFT…" />
      </Field>

      <Field label="Status *" error={errors.status?.message}>
        <select {...register('status')} className={inputClass(!!errors.status)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Brand">
        <input {...register('brand')} className={inputClass()} />
      </Field>

      <Field label="Model">
        <input {...register('model')} className={inputClass()} />
      </Field>

      <Field label="Ownership">
        <input {...register('ownership')} className={inputClass()} placeholder="OWN, LEASE…" />
      </Field>

      <Field label="Registration No.">
        <input {...register('registrationNo')} className={inputClass()} />
      </Field>

      <Field label="Engine No.">
        <input {...register('engineNo')} className={inputClass()} />
      </Field>

      <Field label="Chassis No.">
        <input {...register('chassisNo')} className={inputClass()} />
      </Field>

      <Field label="License No.">
        <input {...register('licenseNo')} className={inputClass()} />
      </Field>

      <Field label="Meter Type">
        <select {...register('meterType')} className={inputClass()}>
          <option value="">— Select —</option>
          {METER_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Current Meter">
        <input type="number" {...register('currentMeter')} className={inputClass()} />
      </Field>

      <Field label="Year of Manufacture">
        <input
          type="number"
          {...register('yearOfManufacture')}
          className={inputClass()}
          placeholder="2020"
        />
      </Field>

      <Field label="Purchase Date">
        <input type="date" {...register('purchaseDate')} className={inputClass()} />
      </Field>

      <Field label="Purchase Price">
        <input type="number" step="0.01" {...register('purchasePrice')} className={inputClass()} />
      </Field>

      <Field label="Fuel Type">
        <select {...register('fuelType')} className={inputClass()}>
          <option value="">— Select —</option>
          {FUEL_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Fuel Capacity (L)">
        <input type="number" {...register('fuelCapacity')} className={inputClass()} />
      </Field>

      <Field label="Customer / Owner">
        <input {...register('customerName')} className={inputClass()} />
      </Field>

      <Field label="Assigned Driver">
        <input {...register('driverName')} className={inputClass()} />
      </Field>

      <Field label="Remarks">
        <textarea {...register('remarks')} rows={3} className={`${inputClass()} resize-none`} />
      </Field>
    </div>
  )
}
