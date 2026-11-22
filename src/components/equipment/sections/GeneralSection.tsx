'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { EquipmentFormValues } from '@/types/equipment'
import { useT } from '@/i18n/I18nContext'
import { TRUCKING_OWNED_FIELDS, useAssetCatalogue, useAxleLayouts } from '@/lib/api/fleet/assets'
import { useCodeList } from '@/lib/api/fleet/setup'
import { ASSET_CATEGORY_LIST } from '@/components/equipment/EquipmentFilters'

interface Props {
  form: UseFormReturn<EquipmentFormValues>
  isNew: boolean
  /** Linked to Trucking: the Trucking-owned inputs are read-only. */
  linked?: boolean
}

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'UNDER REPAIR', 'DISPOSED'] as const
/** Used until the catalogue has loaded (the API's own lists, GET /assets/catalogue). */
const METER_FALLBACK = ['KM', 'HOUR', 'KM_HOUR', 'NONE']
const FUEL_FALLBACK = ['DIESEL', 'CNG', 'LNG', 'ELECTRIC', 'HYBRID', 'PETROL', 'LPG', 'NONE']

function Field({
  label,
  error,
  children,
  badge,
}: {
  label: string
  error?: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 flex items-center gap-2">{label}{badge}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError?: boolean, disabled?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  } ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`
}

/** The current value stays selectable even when the list does not hold it (old data). */
function withCurrent(options: readonly string[], current: string | undefined) {
  return current && !options.includes(current) ? [current, ...options] : options
}

export function GeneralSection({ form, isNew, linked = false }: Props) {
  const { t } = useT()
  const {
    register,
    watch,
    formState: { errors },
  } = form
  const catalogue = useAssetCatalogue()
  const layouts = useAxleLayouts()
  const categories = useCodeList(ASSET_CATEGORY_LIST)

  const locked = (name: (typeof TRUCKING_OWNED_FIELDS)[number]) => linked && TRUCKING_OWNED_FIELDS.includes(name)
  const lockTitle = linked ? t('equipment.managedInTruckingHint') : undefined
  const laterTitle = t('equipment.laterPhase')

  const status = watch('status')
  const meterOptions = withCurrent(catalogue.data?.meterTypes ?? METER_FALLBACK, watch('meterType'))
  const fuelOptions = withCurrent(catalogue.data?.fuelTypes ?? FUEL_FALLBACK, watch('fuelType'))
  const layoutId = watch('axleLayoutId')

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field
        label={`${t('form.equipmentCode')} *`}
        error={errors.code?.message}
        badge={linked && (
          <span title={lockTitle} className="inline-flex px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-medium">
            {t('equipment.managedInTrucking')}
          </span>
        )}
      >
        <input
          {...register('code')}
          disabled={!isNew}
          className={`${inputClass(!!errors.code)} ${!isNew ? 'bg-gray-50 text-gray-500' : ''}`}
          placeholder="EQ-001"
        />
      </Field>

      <Field label="Equipment Type" error={errors.equipmentType?.message}>
        <input {...register('equipmentType')} list="asset-classes" className={inputClass(!!errors.equipmentType)} placeholder="e.g. 10W, 6W" />
        <datalist id="asset-classes">
          {catalogue.data?.classes.map((c) => <option key={c.assetClass} value={c.assetClass}>{c.description}</option>)}
        </datalist>
      </Field>

      <Field label={t('form.category')} error={errors.category?.message}>
        <input {...register('category')} list="asset-categories" className={inputClass(!!errors.category)} placeholder="TRUCK, FORKLIFT…" />
        <datalist id="asset-categories">
          {categories.data?.filter((c) => c.isActive).map((c) => <option key={c.code} value={c.code}>{c.descriptionEn}</option>)}
        </datalist>
      </Field>

      <Field label={`${t('form.status')} *`} error={errors.status?.message}>
        <select {...register('status')} disabled={locked('status')} title={lockTitle} className={inputClass(!!errors.status, locked('status'))}>
          {STATUS_OPTIONS.map((s) => (
            // UNDER REPAIR comes from Trucking; it cannot be chosen here.
            <option key={s} value={s} disabled={s === 'UNDER REPAIR' && status !== s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('form.brand')} error={errors.brand?.message}>
        <input {...register('brand')} disabled={locked('brand')} title={lockTitle} className={inputClass(!!errors.brand, locked('brand'))} />
      </Field>

      <Field label={t('form.model')} error={errors.model?.message}>
        <input {...register('model')} disabled={locked('model')} title={lockTitle} className={inputClass(!!errors.model, locked('model'))} />
      </Field>

      <Field label="Ownership" error={errors.ownership?.message}>
        <input
          {...register('ownership')}
          list="asset-ownerships"
          disabled={locked('ownership')}
          title={lockTitle}
          className={inputClass(!!errors.ownership, locked('ownership'))}
          placeholder="OWN, LEASE…"
        />
        <datalist id="asset-ownerships">
          {catalogue.data?.ownerships.map((o) => <option key={o} value={o} />)}
        </datalist>
      </Field>

      <Field label={t('form.registrationNo')} error={errors.registrationNo?.message}>
        <input {...register('registrationNo')} disabled={locked('registrationNo')} title={lockTitle} className={inputClass(!!errors.registrationNo, locked('registrationNo'))} />
      </Field>

      <Field label="Engine No." error={errors.engineNo?.message}>
        <input {...register('engineNo')} disabled={locked('engineNo')} title={lockTitle} className={inputClass(!!errors.engineNo, locked('engineNo'))} />
      </Field>

      <Field label="Chassis No." error={errors.chassisNo?.message}>
        <input {...register('chassisNo')} disabled={locked('chassisNo')} title={lockTitle} className={inputClass(!!errors.chassisNo, locked('chassisNo'))} />
      </Field>

      <Field label={t('form.licenseNo')} error={errors.licenseNo?.message}>
        <input {...register('licenseNo')} className={inputClass(!!errors.licenseNo)} />
      </Field>

      <Field label="Meter Type" error={errors.meterType?.message}>
        <select {...register('meterType')} className={inputClass(!!errors.meterType)}>
          <option value="">— Select —</option>
          {meterOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Current Meter">
        {/* Meters arrive with P2 (meter readings). */}
        <input type="number" {...register('currentMeter')} disabled title={laterTitle} className={inputClass(false, true)} />
      </Field>

      <Field label={t('form.year')} error={errors.yearOfManufacture?.message}>
        <input
          type="number"
          {...register('yearOfManufacture')}
          disabled={locked('yearOfManufacture')}
          title={lockTitle}
          className={inputClass(!!errors.yearOfManufacture, locked('yearOfManufacture'))}
          placeholder="2020"
        />
      </Field>

      <Field label="Purchase Date" error={errors.purchaseDate?.message}>
        <input type="date" {...register('purchaseDate')} className={inputClass(!!errors.purchaseDate)} />
      </Field>

      <Field label="Purchase Price" error={errors.purchasePrice?.message}>
        <input type="number" step="0.01" {...register('purchasePrice')} className={inputClass(!!errors.purchasePrice)} />
      </Field>

      <Field label={t('form.fuelType')} error={errors.fuelType?.message}>
        <select {...register('fuelType')} disabled={locked('fuelType')} title={lockTitle} className={inputClass(!!errors.fuelType, locked('fuelType'))}>
          <option value="">— Select —</option>
          {fuelOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Fuel Capacity (L)" error={errors.fuelCapacity?.message}>
        <input type="number" {...register('fuelCapacity')} className={inputClass(!!errors.fuelCapacity)} />
      </Field>

      <Field label={t('equipment.axleLayout')} error={errors.axleLayoutId?.message}>
        <select {...register('axleLayoutId')} className={inputClass(!!errors.axleLayoutId)}>
          <option value="">— Select —</option>
          {layoutId && !layouts.data?.some((l) => l.axleLayoutId === layoutId) && <option value={layoutId}>{layoutId.slice(0, 8)}</option>}
          {layouts.data?.map((l) => (
            <option key={l.axleLayoutId} value={l.axleLayoutId}>
              {l.layoutCode} · {l.nameEn}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('form.customer')}>
        {/* Customer = owner party; later phase. */}
        <input {...register('customerName')} disabled title={laterTitle} className={inputClass(false, true)} />
      </Field>

      <Field label={t('form.driver')}>
        {/* Driver assignment arrives in a later phase. */}
        <input {...register('driverName')} disabled title={laterTitle} className={inputClass(false, true)} />
      </Field>

      <Field label={t('common.remarks')} error={errors.remarks?.message}>
        <textarea {...register('remarks')} rows={3} className={`${inputClass(!!errors.remarks)} resize-none`} />
      </Field>
    </div>
  )
}
