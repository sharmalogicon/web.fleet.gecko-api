'use client'

import type { UseFormReturn } from 'react-hook-form'
import { useT } from '@/i18n/I18nContext'
import { costRateText, type TechnicianView } from '@/lib/api/fleet/technicians'
import { useBranchContext } from '@/lib/api/platform/branches'
import type { TechnicianFormValues } from '@/types/technician'
import { Field, inputClass } from './fields'

/** Own rate (optional: empty = the trade rate from Fleet Setup) and what an hour costs today. */
export function RatesSection({ form, current }: { form: UseFormReturn<TechnicianFormValues>; current?: TechnicianView }) {
  const { t } = useT()
  const { branches } = useBranchContext()
  const { register, formState: { errors } } = form
  const branchCode = current ? branches.find((b) => b.branchId === current.branchId)?.branchCode : undefined

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={t('technician.costPerHour')} error={errors.costPerHour?.message} hint={t('technician.ownRateHint')}>
        <input type="number" step="0.01" min={0} {...register('costPerHour')} className={inputClass(!!errors.costPerHour)} />
      </Field>
      <Field label={t('technician.otCostPerHour')} error={errors.otCostPerHour?.message}>
        <input type="number" step="0.01" min={0} {...register('otCostPerHour')} className={inputClass(!!errors.otCostPerHour)} />
      </Field>
      <Field label={t('fleetSetup.currency')} error={errors.currencyCode?.message}>
        <input {...register('currencyCode')} maxLength={3} className={`${inputClass(!!errors.currencyCode)} uppercase`} placeholder="THB" />
      </Field>
      <Field label={t('technician.costToday')}>
        <input
          readOnly
          value={current ? costRateText(current.costRate, t, branchCode) : t('technician.costAfterSave')}
          className={inputClass(false, true)}
        />
      </Field>
    </div>
  )
}
