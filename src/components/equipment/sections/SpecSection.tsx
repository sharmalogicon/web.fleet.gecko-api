'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { EquipmentFormValues } from '@/types/equipment'

interface Props {
  form: UseFormReturn<EquipmentFormValues>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

function inputClass() {
  return 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
}

export function SpecSection({ form }: Props) {
  const { register } = form
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Gross Weight (kg)">
        <input type="number" {...register('grossWeight')} className={inputClass()} />
      </Field>
      <Field label="Net Weight (kg)">
        <input type="number" {...register('netWeight')} className={inputClass()} />
      </Field>
      <Field label="Payload (kg)">
        <input type="number" {...register('payload')} className={inputClass()} />
      </Field>
      <Field label="Length (mm)">
        <input type="number" {...register('length')} className={inputClass()} />
      </Field>
      <Field label="Width (mm)">
        <input type="number" {...register('width')} className={inputClass()} />
      </Field>
      <Field label="Height (mm)">
        <input type="number" {...register('height')} className={inputClass()} />
      </Field>
      <Field label="Engine Capacity (cc)">
        <input type="number" {...register('engineCapacity')} className={inputClass()} />
      </Field>
      <Field label="Horse Power">
        <input type="number" {...register('horsePower')} className={inputClass()} />
      </Field>
    </div>
  )
}
