'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { AccidentReportFormValues } from '@/types/accident-report'

interface Props {
  form: UseFormReturn<AccidentReportFormValues>
  isNew: boolean
}

function Field({
  label,
  error,
  children,
  fullWidth,
}: {
  label: string
  error?: string
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <div className={`flex flex-col gap-1${fullWidth ? ' sm:col-span-2 lg:col-span-3' : ''}`}>
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

const ACCIDENT_TYPES = ['COLLISION', 'ROLLOVER', 'FIRE', 'THEFT', 'OTHER'] as const
const RESPONSIBILITIES = ['DRIVER', 'THIRD_PARTY', 'SHARED', 'UNKNOWN'] as const

export function AccidentGeneralSection({ form, isNew }: Props) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Document No. *" error={errors.documentNo?.message}>
        <input
          {...register('documentNo')}
          disabled={!isNew}
          className={ic(!isNew)}
          placeholder="e.g. ACC-2024-001"
        />
      </Field>

      <Field label="Accident Date *" error={errors.accidentDate?.message}>
        <input
          type="date"
          {...register('accidentDate')}
          className={ic()}
        />
      </Field>

      <Field label="Equipment Code *" error={errors.equipmentCode?.message}>
        <input
          {...register('equipmentCode')}
          className={ic()}
          placeholder="e.g. EQ-001"
        />
      </Field>

      <Field label="Driver Name">
        <input
          {...register('driverName')}
          className={ic()}
          placeholder="Driver name"
        />
      </Field>

      <Field label="Driver ID">
        <input
          {...register('driverID')}
          className={ic()}
          placeholder="e.g. DRV-001"
        />
      </Field>

      <Field label="Accident Type *" error={errors.accidentType?.message}>
        <select {...register('accidentType')} className={ic()}>
          {ACCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Responsibility *" error={errors.responsibility?.message}>
        <select {...register('responsibility')} className={ic()}>
          {RESPONSIBILITIES.map((r) => (
            <option key={r} value={r}>
              {r.replace('_', ' ')}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Police Station">
        <input
          {...register('policeStation')}
          className={ic()}
          placeholder="Police station name"
        />
      </Field>

      <Field label="Police Report No.">
        <input
          {...register('policeReportNo')}
          className={ic()}
          placeholder="e.g. PR-2024-0110"
        />
      </Field>

      <Field label="Insurance Policy No.">
        <input
          {...register('insPolicyNo')}
          className={ic()}
          placeholder="e.g. INS-TH-20241"
        />
      </Field>

      <Field label="Claim Reference No.">
        <input
          {...register('refClaimNo')}
          className={ic()}
          placeholder="e.g. CLM-2024-001"
        />
      </Field>

      <Field label="Accident Location">
        <input
          {...register('accidentLocation')}
          className={ic()}
          placeholder="Street / area description"
        />
      </Field>

      <div className="flex items-center gap-3 pt-5">
        <input
          type="checkbox"
          id="insClaimable"
          {...register('insClaimable')}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="insClaimable" className="text-sm font-medium text-gray-700">
          Insurance Claimable
        </label>
      </div>

      <Field label="About the Accident" fullWidth>
        <textarea
          {...register('aboutAccident')}
          rows={3}
          className={`${ic()} resize-none`}
          placeholder="Describe what happened…"
        />
      </Field>

      <Field label="Damage Details" fullWidth>
        <textarea
          {...register('damageDetails')}
          rows={3}
          className={`${ic()} resize-none`}
          placeholder="Describe the damage…"
        />
      </Field>
    </div>
  )
}
