'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { StockFormValues } from '@/types/stock'
import { useT } from '@/i18n/I18nContext'
import { useCodeList } from '@/lib/api/fleet/setup'
import { ITEM_CATEGORY_LIST, useItemCatalogue } from '@/lib/api/fleet/items'
import type { WarehouseDto } from '@/lib/api/fleet/warehouses'

interface Props {
  form: UseFormReturn<StockFormValues>
  isNew: boolean
  /** The header branch's default store; null = Location / Lead Time disabled. */
  warehouse?: WarehouseDto | null
}

/** Used until the tenant's FLEET_ITEM_CATEGORY list has values. */
const CATEGORY_FALLBACK = ['PARTS', 'LUBRICANT', 'CONSUMABLE', 'TYRE']
const WARRANTY_PERIOD_OPTIONS = ['DAY', 'WEEK', 'MONTH', 'YEAR'] as const

function Field({
  label,
  error,
  children,
  colSpan,
}: {
  label: string
  error?: string
  children: React.ReactNode
  colSpan?: number
}) {
  return (
    <div
      className="flex flex-col gap-1"
      style={colSpan ? { gridColumn: `span ${colSpan}` } : undefined}
    >
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError?: boolean, disabled?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  } ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'}`
}

export function GeneralInfoSection({ form, isNew, warehouse }: Props) {
  const { t } = useT()
  const catalogue = useItemCatalogue()
  const categoryList = useCodeList(ITEM_CATEGORY_LIST)
  const listed = categoryList.data?.filter((c) => c.isActive).map((c) => c.code) ?? []
  const noStore = !warehouse
  const noStoreHint = t('stock.noDefaultStore')
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const isActive = watch('isActive')
  const isOriginalPart = watch('isOriginalPart')
  const category = watch('stockCategory')
  const categoryOptions = listed.length ? listed : CATEGORY_FALLBACK
  const CATEGORY_OPTIONS = category && !categoryOptions.includes(category) ? [category, ...categoryOptions] : categoryOptions

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={`${t('form.stockCode')} *`} error={errors.code?.message}>
        <input
          {...register('code')}
          disabled={!isNew}
          className={inputClass(!!errors.code, !isNew)}
          placeholder="STK-001"
        />
      </Field>

      <Field label={`${t('form.description')} *`} error={errors.description?.message} colSpan={2}>
        <input
          {...register('description')}
          className={inputClass(!!errors.description)}
          placeholder="Item description"
        />
      </Field>

      <Field label="Active">
        <div className="flex items-center gap-2 h-[38px]">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setValue('isActive', !isActive, { shouldDirty: true })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isActive ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600">{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </Field>

      <Field label={t('form.category')} error={errors.stockCategory?.message}>
        <select {...register('stockCategory')} className={inputClass()}>
          <option value="">— Select —</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Stock Type" error={errors.stockType?.message}>
        <input
          {...register('stockType')}
          list="item-types"
          className={inputClass(!!errors.stockType)}
          placeholder="FILTER, BELT, BRAKE…"
        />
        <datalist id="item-types">
          {catalogue.data?.itemTypes.map((x) => <option key={x} value={x} />)}
        </datalist>
      </Field>

      <Field label={t('form.brand')} error={errors.brand?.message}>
        <input {...register('brand')} className={inputClass(!!errors.brand)} placeholder="e.g. DENSO, SHELL" />
      </Field>

      <Field label={t('form.uom')} error={errors.uom?.message}>
        <input {...register('uom')} list="item-uoms" className={inputClass(!!errors.uom)} placeholder="PCS, BTL, SET…" />
        <datalist id="item-uoms">
          {catalogue.data?.uoms.map((u) => <option key={u.code} value={u.code}>{u.description}</option>)}
        </datalist>
      </Field>

      <Field label="Location" error={errors.location?.message ?? (noStore ? noStoreHint : undefined)}>
        {/* The bin in the header branch's default store (a new code creates the bin). */}
        <input {...register('location')} list="store-bins" disabled={noStore} title={noStore ? noStoreHint : warehouse?.warehouseCode} className={inputClass(!!errors.location, noStore)} placeholder="A-01-01" />
        <datalist id="store-bins">
          {warehouse?.bins.filter((b) => b.isActive).map((b) => <option key={b.binId} value={b.binCode}>{b.description ?? ''}</option>)}
        </datalist>
      </Field>

      <Field label="Lead Time (days)" error={errors.leadTime?.message}>
        <input type="number" {...register('leadTime')} disabled={noStore} title={noStore ? noStoreHint : undefined} className={inputClass(!!errors.leadTime, noStore)} min={0} />
      </Field>

      <Field label="Warranty Value" error={errors.warrantyValue?.message}>
        <input type="number" {...register('warrantyValue')} className={inputClass(!!errors.warrantyValue)} min={0} />
      </Field>

      <Field label="Warranty Period" error={errors.warrantyPeriod?.message}>
        <select {...register('warrantyPeriod')} className={inputClass(!!errors.warrantyPeriod)}>
          <option value="">— Select —</option>
          {WARRANTY_PERIOD_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Original Part">
        <div className="flex items-center gap-2 h-[38px]">
          <input
            type="checkbox"
            {...register('isOriginalPart')}
            checked={isOriginalPart}
            onChange={(e) => setValue('isOriginalPart', e.target.checked, { shouldDirty: true })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">OEM / Original Part</span>
        </div>
      </Field>

      <Field label={t('common.remarks')} colSpan={3}>
        <textarea
          {...register('remarks')}
          rows={3}
          className={`${inputClass()} resize-none`}
          placeholder="Additional notes…"
        />
      </Field>
    </div>
  )
}
