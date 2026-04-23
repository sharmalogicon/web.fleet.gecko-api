'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { TireProfileFormValues } from '@/types/tire-profile'
import { useT } from '@/i18n/I18nContext'

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

const TYRE_POSITIONS = [
  { value: '', label: '— Not Installed —' },
  { value: 'FRONT_LEFT', label: 'Front Left' },
  { value: 'FRONT_RIGHT', label: 'Front Right' },
  { value: 'REAR_LEFT_OUTER', label: 'Rear Left Outer' },
  { value: 'REAR_LEFT_INNER', label: 'Rear Left Inner' },
  { value: 'REAR_RIGHT_OUTER', label: 'Rear Right Outer' },
  { value: 'REAR_RIGHT_INNER', label: 'Rear Right Inner' },
]

export function EquipmentSection({ form }: Props) {
  const { t } = useT()
  const { register } = form

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={t('form.equipmentCode')}>
        <input
          {...register('equipmentCode')}
          className={ic()}
          placeholder="e.g. EQ-001"
        />
      </Field>

      <Field label={`${t('form.registrationNo')} (computed)`}>
        <input
          {...register('registrationNo')}
          readOnly
          className={ic(true)}
          placeholder="Auto-filled from equipment"
        />
      </Field>

      <Field label="Tyre Position">
        <select {...register('tyrePosition')} className={ic()}>
          {TYRE_POSITIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Date Installed">
        <input type="date" {...register('dateInstalled')} className={ic()} />
      </Field>
    </div>
  )
}
