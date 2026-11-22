'use client'
import type { UseFormReturn } from 'react-hook-form'
import { Field } from '@/components/shared/FormField'
import { AssetCodeInput, DriverCodeInput } from '@/components/meters/MeterBits'
import type { FuelFormValues } from '@/lib/api/fleet/fuelLogs'
import type { AssetView } from '@/lib/api/fleet/assets'
import { useT } from '@/i18n/I18nContext'

function ic(ro?: boolean, err?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${err ? 'border-red-400' : ''} ${
    ro ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
  }`
}

interface Props {
  form: UseFormReturn<FuelFormValues>
  editable: boolean
  isNew: boolean
  onAsset: (a: AssetView | null) => void
}

/** Same inputs; equipment + driver are pickers (codes → ids), the date carries the time (fuelledAt). */
export function FuelEntrySection({ form, editable, isNew, onAsset }: Props) {
  const { t } = useT()
  const { register, watch, setValue, getValues, formState: { errors } } = form
  const ro = !editable

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={`${t('form.equipmentCode')} *`} error={errors.equipmentCode?.message ?? errors.assetProfileId?.message}>
        {editable && isNew ? (
          <AssetCodeInput
            id="fuel-assets"
            value={watch('equipmentCode') ?? ''}
            onChange={(v) => setValue('equipmentCode', v, { shouldDirty: true })}
            onResolve={(a) => { setValue('assetProfileId', a?.id ?? '', { shouldDirty: true }); onAsset(a) }}
            className={ic(false, !!errors.equipmentCode)}
            placeholder="e.g. EQ-001"
          />
        ) : (
          <input value={watch('equipmentCode') ?? ''} disabled className={ic(true)} />
        )}
      </Field>

      <Field label="Meter Update Date *" error={errors.meterUpdateDate?.message}>
        <input type="datetime-local" {...register('meterUpdateDate')} disabled={ro} className={ic(ro, !!errors.meterUpdateDate)} />
      </Field>

      <Field label={t('form.voucherNo')} error={errors.voucherNo?.message}>
        <input {...register('voucherNo')} disabled={ro} className={ic(ro)} placeholder="Station receipt no" />
      </Field>

      <Field label={`${t('form.liters')} *`} error={errors.tankMeter?.message}>
        <input type="number" step="0.01" min="0" {...register('tankMeter')} disabled={ro} className={ic(ro, !!errors.tankMeter)} placeholder="0" />
      </Field>

      <Field label={t('form.odometer')} error={errors.meterRead?.message} hint={t('fuel.meterHint')}>
        <input type="number" step="1" min="0" {...register('meterRead')} disabled={ro} className={ic(ro)} placeholder="odometer km" />
      </Field>

      <Field label={t('form.hourMeter')} error={errors.hourMeter?.message}>
        <input type="number" step="0.1" min="0" {...register('hourMeter')} disabled={ro} className={ic(ro)} placeholder="engine hours" />
      </Field>

      <Field label={t('form.driverName')} error={errors.driverName?.message}>
        {editable ? (
          <DriverCodeInput
            id="fuel-drivers"
            value={watch('driverName') ?? ''}
            onChange={(v) => setValue('driverName', v, { shouldDirty: true })}
            onResolve={(d) => {
              setValue('driverId', d?.id ?? '', { shouldDirty: true })
              // The driver's fuel card, unless one is keyed already.
              if (d?.dto.fuelCardNo && !getValues('driverCard')) setValue('driverCard', d.dto.fuelCardNo, { shouldDirty: true })
            }}
            className={ic()}
            placeholder="Driver code"
          />
        ) : (
          <input value={watch('driverName') ?? ''} disabled className={ic(true)} />
        )}
      </Field>

      <Field label="Driver Card No." error={errors.driverCard?.message}>
        <input {...register('driverCard')} disabled={ro} className={ic(ro)} placeholder="Fuel card no" />
      </Field>

      <Field label={t('common.remarks')} error={errors.remarks?.message}>
        <textarea {...register('remarks')} rows={3} disabled={ro} className={`${ic(ro)} resize-none`} placeholder="Optional notes…" />
      </Field>
    </div>
  )
}
