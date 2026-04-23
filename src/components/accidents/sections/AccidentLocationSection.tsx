'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { AccidentReportFormValues } from '@/types/accident-report'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<AccidentReportFormValues>
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

function ic() {
  return 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
}

export function AccidentLocationSection({ form }: Props) {
  const { t } = useT()
  const { register } = form

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={t('form.address')} fullWidth>
        <textarea
          {...register('address')}
          rows={2}
          className={`${ic()} resize-none`}
          placeholder="Street address or landmark"
        />
      </Field>

      <Field label={t('form.city')}>
        <input
          {...register('city')}
          className={ic()}
          placeholder="e.g. Bangkok"
        />
      </Field>

      <Field label={t('form.country')}>
        <input
          {...register('country')}
          className={ic()}
          placeholder="e.g. Thailand"
        />
      </Field>
    </div>
  )
}
