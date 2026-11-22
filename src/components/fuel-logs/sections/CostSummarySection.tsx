'use client'
import type { UseFormReturn } from 'react-hook-form'
import { Field } from '@/components/shared/FormField'
import { SupplierCodeInput } from '@/components/shared/PartyInputs'
import { FUEL_SOURCES, type FuelFormValues, type FuelLogDto } from '@/lib/api/fleet/fuelLogs'
import { useWarehouses } from '@/lib/api/fleet/warehouses'
import { useItems } from '@/lib/api/fleet/items'
import { useT } from '@/i18n/I18nContext'

function ic(ro?: boolean, err?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${err ? 'border-red-400' : ''} ${
    ro ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
  }`
}

const show = (v: number | string | null | undefined, digits = 2) =>
  v === null || v === undefined || v === '' ? '' : Number(v).toLocaleString('en-US', { maximumFractionDigits: digits })

interface Props {
  form: UseFormReturn<FuelFormValues>
  current?: FuelLogDto
  editable: boolean
}

/**
 * Fuel source decides the inputs: OWN_TANK = store + fuel item (costed by the API at the store's average on approval),
 * VENDOR = supplier + price per litre. Distance / cost per km / hours / cost per hour are the API's (vs the previous
 * approved log of the asset): read-only.
 */
export function CostSummarySection({ form, current, editable }: Props) {
  const { t } = useT()
  const { register, watch, setValue, formState: { errors } } = form
  const ro = !editable
  const fuelSource = watch('fuelSource')
  const own = fuelSource === 'OWN_TANK'
  const liters = Number(watch('tankMeter') || 0)
  const price = watch('costPerLiter')
  const stores = useWarehouses({ active: true }, own)
  const items = useItems({ active: true })

  // VENDOR: liters × price as typed; OWN_TANK: the API's amount (after approval).
  const amount = own ? current?.amount : price !== undefined && !Number.isNaN(price) ? Math.round(liters * Number(price) * 100) / 100 : undefined
  const unitPrice = own ? current?.unitPrice : price

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={`${t('form.fuelType')} *`} error={errors.fuelSource?.message}>
        <select {...register('fuelSource')} disabled={ro} className={ic(ro)}>
          {FUEL_SOURCES.map((s) => <option key={s} value={s}>{s === 'OWN_TANK' ? 'Own Tank' : 'Vendor / External'}</option>)}
        </select>
      </Field>

      {own ? (
        <>
          <Field label={`${t('fuel.store')} *`} error={errors.warehouseId?.message}>
            <select {...register('warehouseId')} disabled={ro} className={ic(ro, !!errors.warehouseId)}>
              <option value="">—</option>
              {(stores.data ?? []).map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
              {current?.warehouseId && !stores.data?.some((w) => w.warehouseId === current.warehouseId) && (
                <option value={current.warehouseId}>{current.warehouseCode}</option>
              )}
            </select>
          </Field>
          <Field label={`${t('fuel.item')} *`} error={errors.itemId?.message} hint={t('fuel.itemHint')}>
            <select {...register('itemId')} disabled={ro} className={ic(ro, !!errors.itemId)}>
              <option value="">—</option>
              {(items.data ?? []).map((i) => <option key={i.itemId} value={i.itemId}>{i.itemCode} · {i.descriptionEn} ({i.baseUomCode})</option>)}
              {current?.itemId && !items.data?.some((i) => i.itemId === current.itemId) && <option value={current.itemId}>{current.itemCode}</option>}
            </select>
          </Field>
        </>
      ) : (
        <Field label={t('form.vendor')} error={errors.vendorName?.message}>
          <SupplierCodeInput id="fuel-suppliers" value={watch('vendorName') ?? ''} onChange={(v) => setValue('vendorName', v, { shouldDirty: true })}
            disabled={ro} className={ic(ro)} placeholder="Fuel station / vendor code" />
          {current?.supplierName && <span className="text-xs text-gray-500">{current.supplierName}</span>}
        </Field>
      )}

      <Field label={own ? t('form.costPerLiter') : `${t('form.costPerLiter')} *`} error={errors.costPerLiter?.message} hint={own ? t('fuel.ownTankPriceHint') : undefined}>
        {own ? (
          <input value={show(unitPrice, 4)} readOnly className={ic(true)} placeholder={t('fuel.onApproval')} />
        ) : (
          <input type="number" step="0.01" min="0" {...register('costPerLiter')} disabled={ro} className={ic(ro, !!errors.costPerLiter)} placeholder="฿ per liter" />
        )}
      </Field>

      <Field label={t('form.totalCost')}>
        <input value={show(amount)} readOnly className={ic(true)} placeholder={own ? t('fuel.onApproval') : 'Auto computed'} />
      </Field>

      <Field label={t('form.distance')}>
        <input value={show(current?.distanceKm, 0)} readOnly className={ic(true)} placeholder={t('fuel.fromPrevious')} />
      </Field>

      <Field label="Avg Cost Per KM (฿) — auto computed">
        <input value={show(current?.costPerKm, 4)} readOnly className={ic(true)} placeholder={t('fuel.fromPrevious')} />
      </Field>

      <Field label={t('form.hours')}>
        <input value={show(current?.hours, 1)} readOnly className={ic(true)} placeholder={t('fuel.fromPrevious')} />
      </Field>

      <Field label="Avg Cost Per Hour (฿)">
        <input value={show(current?.costPerHour, 4)} readOnly className={ic(true)} placeholder={t('fuel.fromPrevious')} />
      </Field>

      <div className="sm:col-span-2 lg:col-span-3 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Cost Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Liters', val: liters ? `${liters.toLocaleString()} L` : '—' },
            { label: 'Cost / Liter', val: unitPrice != null && unitPrice !== '' ? `฿${show(unitPrice, 4)}` : '—' },
            { label: 'Total Amount', val: amount != null && amount !== '' ? `฿${show(amount)}` : '—' },
            { label: 'Avg Cost / km', val: current?.costPerKm != null ? `฿${show(current.costPerKm, 4)}` : '—' },
            { label: 'km / L', val: current?.kmPerLiter != null ? show(current.kmPerLiter) : '—' },
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
