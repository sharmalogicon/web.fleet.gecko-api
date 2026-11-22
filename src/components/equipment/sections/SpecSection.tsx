'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { EquipmentFormValues } from '@/types/equipment'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<EquipmentFormValues>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputClass() {
  return 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
}

export function SpecSection({ form }: Props) {
  const { t } = useT()
  const { register, formState: { errors } } = form
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Gross Weight (kg)" error={errors.grossWeight?.message}>
        <input type="number" {...register('grossWeight')} className={inputClass()} />
      </Field>
      <Field label="Net Weight (kg)" error={errors.netWeight?.message}>
        <input type="number" {...register('netWeight')} className={inputClass()} />
      </Field>
      <Field label="Payload (kg)" error={errors.payload?.message}>
        <input type="number" {...register('payload')} className={inputClass()} />
      </Field>
      <Field label="Length (mm)" error={errors.length?.message}>
        <input type="number" {...register('length')} className={inputClass()} />
      </Field>
      <Field label="Width (mm)" error={errors.width?.message}>
        <input type="number" {...register('width')} className={inputClass()} />
      </Field>
      <Field label="Height (mm)" error={errors.height?.message}>
        <input type="number" {...register('height')} className={inputClass()} />
      </Field>
      <Field label="Engine Capacity (cc)" error={errors.engineCapacity?.message}>
        <input type="number" {...register('engineCapacity')} className={inputClass()} />
      </Field>
      <Field label="Horse Power" error={errors.horsePower?.message}>
        <input type="number" {...register('horsePower')} className={inputClass()} />
      </Field>
    </div>
  )
}
