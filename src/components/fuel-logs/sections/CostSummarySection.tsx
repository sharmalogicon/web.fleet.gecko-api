'use client'
import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { FuelLogFormValues } from '@/types/fuel-log'
import { FUEL_SOURCE_OPTIONS } from '@/types/fuel-log'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<FuelLogFormValues>
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

export function CostSummarySection({ form }: Props) {
  const { t } = useT()
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const fuelSource = watch('fuelSource')
  const tankMeter = watch('tankMeter')
  const costPerLiter = watch('costPerLiter')
  const totalDistance = watch('totalDistance')

  // Auto-compute totalAmount = tankMeter * costPerLiter
  useEffect(() => {
    if (tankMeter != null && costPerLiter != null) {
      const total = Number(tankMeter) * Number(costPerLiter)
      setValue('totalAmount', Math.round(total * 100) / 100)
    }
  }, [tankMeter, costPerLiter, setValue])

  // Auto-compute avgCostPerKM = totalAmount / totalDistance
  useEffect(() => {
    const totalAmount = tankMeter != null && costPerLiter != null
      ? Number(tankMeter) * Number(costPerLiter)
      : null
    if (totalAmount && totalDistance && Number(totalDistance) > 0) {
      const avg = totalAmount / Number(totalDistance)
      setValue('avgCostPerKM', Math.round(avg * 100) / 100)
    }
  }, [tankMeter, costPerLiter, totalDistance, setValue])

  const totalAmount = watch('totalAmount')
  const avgCostPerKM = watch('avgCostPerKM')

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={`${t('form.fuelType')} *`} error={errors.fuelSource?.message}>
        <select {...register('fuelSource')} className={ic()}>
          {FUEL_SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'OWN_TANK' ? 'Own Tank' : 'Vendor / External'}
            </option>
          ))}
        </select>
      </Field>

      {fuelSource === 'VENDOR' && (
        <Field label={t('form.vendor')}>
          <input
            {...register('vendorName')}
            className={ic()}
            placeholder="Fuel station or vendor name"
          />
        </Field>
      )}

      <Field label={t('form.costPerLiter')}>
        <input
          type="number"
          step="0.01"
          min="0"
          {...register('costPerLiter')}
          className={ic()}
          placeholder="฿ per liter"
        />
      </Field>

      <Field label={t('form.totalCost')}>
        <input
          type="number"
          step="0.01"
          value={totalAmount ?? ''}
          readOnly
          className={ic(true)}
          placeholder="Auto computed"
        />
      </Field>

      <Field label={t('form.distance')}>
        <input
          type="number"
          step="1"
          min="0"
          {...register('totalDistance')}
          className={ic()}
          placeholder="km traveled"
        />
      </Field>

      <Field label="Avg Cost Per KM (฿) — auto computed">
        <input
          type="number"
          step="0.01"
          value={avgCostPerKM ?? ''}
          readOnly
          className={ic(true)}
          placeholder="Auto computed"
        />
      </Field>

      <Field label={t('form.hours')}>
        <input
          type="number"
          step="0.1"
          min="0"
          {...register('totalHour')}
          className={ic()}
          placeholder="hours of operation"
        />
      </Field>

      <Field label="Avg Cost Per Hour (฿)">
        <input
          type="number"
          step="0.01"
          min="0"
          {...register('avgCostPerHour')}
          className={ic()}
          placeholder="฿ per hour"
        />
      </Field>

      {/* Summary card */}
      <div className="sm:col-span-2 lg:col-span-3 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Cost Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Liters', val: tankMeter != null ? `${tankMeter} L` : '—' },
            { label: 'Cost / Liter', val: costPerLiter != null ? `฿${costPerLiter}` : '—' },
            {
              label: 'Total Amount',
              val: totalAmount != null ? `฿${Number(totalAmount).toLocaleString()}` : '—',
            },
            {
              label: 'Avg Cost / km',
              val: avgCostPerKM != null ? `฿${avgCostPerKM}` : '—',
            },
          ].map(({ label, val }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-900">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
