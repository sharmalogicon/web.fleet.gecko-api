'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { TireProfileFormValues } from '@/types/tire-profile'

interface Props {
  form: UseFormReturn<TireProfileFormValues>
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

const TYRE_STATUSES = ['NEW', 'USED', 'RECAP', 'SCRAP'] as const
const TYRE_CONDITIONS = ['GOOD', 'FAIR', 'POOR'] as const

export function GeneralSection({ form, isNew }: Props) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Serial No. *" error={errors.serialNo?.message}>
        <input
          {...register('serialNo')}
          disabled={!isNew}
          className={ic(!isNew)}
          placeholder="e.g. TYR-001"
        />
      </Field>

      <Field label="Brand *" error={errors.brand?.message}>
        <input
          {...register('brand')}
          className={ic()}
          placeholder="e.g. Michelin"
        />
      </Field>

      <Field label="Model">
        <input
          {...register('model')}
          className={ic()}
          placeholder="e.g. X Multi D"
        />
      </Field>

      <Field label="Tyre Size *" error={errors.tyreSize?.message}>
        <input
          {...register('tyreSize')}
          className={ic()}
          placeholder="e.g. 11R22.5"
        />
      </Field>

      <Field label="Status *" error={errors.tyreStatus?.message}>
        <select {...register('tyreStatus')} className={ic()}>
          {TYRE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Condition *" error={errors.condition?.message}>
        <select {...register('condition')} className={ic()}>
          {TYRE_CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Tyre Pressure (PSI)">
        <input
          type="number"
          step="0.1"
          {...register('tyrePressure')}
          className={ic()}
          placeholder="e.g. 110"
        />
      </Field>

      <Field label="Tread Depth (mm)">
        <input
          type="number"
          step="0.1"
          {...register('tyreThread')}
          className={ic()}
          placeholder="e.g. 16"
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

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="isActive"
          {...register('isActive')}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          Active
        </label>
      </div>
    </div>
  )
}
