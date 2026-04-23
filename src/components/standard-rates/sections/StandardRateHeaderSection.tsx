'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { StandardRateFormValues } from '@/types/standard-rate'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<StandardRateFormValues>
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

export function StandardRateHeaderSection({ form, isNew }: Props) {
  const { t } = useT()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Rate Code *" error={errors.rateCode?.message}>
          <input
            {...register('rateCode')}
            disabled={!isNew}
            className={ic(!isNew)}
            placeholder="e.g. STD-2024-001"
          />
        </Field>

        <Field label="Rate Date *" error={errors.rateDate?.message}>
          <input
            type="date"
            {...register('rateDate')}
            className={ic()}
          />
        </Field>

        <Field label="Effective Date *" error={errors.effectiveDate?.message}>
          <input
            type="date"
            {...register('effectiveDate')}
            className={ic()}
          />
        </Field>

        <Field label={t('form.description')} error={errors.description?.message}>
          <input
            {...register('description')}
            className={ic()}
            placeholder="Rate description"
          />
        </Field>

        <Field label={t('common.remarks')} fullWidth>
          <textarea
            {...register('remarks')}
            rows={2}
            className={`${ic()} resize-none`}
            placeholder="Additional remarks…"
          />
        </Field>
      </div>
    </div>
  )
}
