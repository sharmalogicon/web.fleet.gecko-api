'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { TireChangeFormValues } from '@/types/tire-change'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<TireChangeFormValues>
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

const CATEGORIES = ['ROUTINE', 'CORRECTIVE', 'EMERGENCY'] as const

export function ChangeHeaderSection({ form, isNew }: Props) {
  const { t } = useT()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={`${t('form.documentNo')} *`} error={errors.documentNo?.message}>
        <input
          {...register('documentNo')}
          disabled={!isNew}
          className={ic(!isNew)}
          placeholder="e.g. TC-2024-001"
        />
      </Field>

      <Field label={`${t('form.date')} *`} error={errors.changeDate?.message}>
        <input
          type="date"
          {...register('changeDate')}
          className={ic()}
        />
      </Field>

      <Field label={`${t('form.equipmentCode')} *`} error={errors.equipmentCode?.message}>
        <input
          {...register('equipmentCode')}
          className={ic()}
          placeholder="e.g. EQ-001"
        />
      </Field>

      <Field label="Equipment Type">
        <input
          {...register('equipmentType')}
          className={ic()}
          placeholder="e.g. Truck"
        />
      </Field>

      <Field label="Changed By">
        <input
          {...register('changeBy')}
          className={ic()}
          placeholder="Technician name"
        />
      </Field>

      <Field label={t('form.woNo')}>
        <input
          {...register('workOrderNo')}
          className={ic()}
          placeholder="e.g. WO-2024-010"
        />
      </Field>

      <Field label={t('form.driverName')}>
        <input
          {...register('driverName')}
          className={ic()}
          placeholder="Driver name"
        />
      </Field>

      <Field label={t('form.hours')}>
        <input
          type="number"
          step="0.5"
          {...register('totalHrs')}
          className={ic()}
          placeholder="e.g. 2.5"
        />
      </Field>

      <Field label={t('form.category')}>
        <select {...register('category')} className={ic()}>
          <option value="">— Select —</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('form.odometer')}>
        <input
          type="number"
          {...register('meterRead')}
          className={ic()}
          placeholder="e.g. 45200"
        />
      </Field>

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
  )
}
