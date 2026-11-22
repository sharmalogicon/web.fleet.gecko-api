'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { StockFormValues } from '@/types/stock'
import { useT } from '@/i18n/I18nContext'
import type { WarehouseDto } from '@/lib/api/fleet/warehouses'

interface Props {
  form: UseFormReturn<StockFormValues>
  /** The header branch's default store: its reorder policy is edited here (null = inputs disabled). */
  warehouse?: WarehouseDto | null
}

function Field({
  label,
  children,
  readOnly,
  error,
}: {
  label: string
  children: React.ReactNode
  readOnly?: boolean
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">
        {label}
        {readOnly && (
          <span className="ml-1 text-xs font-normal text-gray-400">(read-only)</span>
        )}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(readOnly?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 ${
    readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : 'bg-white'
  }`
}

function fmt(value: number | undefined): string {
  if (value == null) return ''
  return value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function InventorySection({ form, warehouse }: Props) {
  const { t } = useT()
  const { register, watch, formState: { errors } } = form
  const noStore = !warehouse
  const later = t('equipment.laterPhase')

  const totalQtyOnHand = watch('totalQtyOnHand')
  const avgCostPerUnit = watch('avgCostPerUnit')
  const lowestCostPerUnit = watch('lowestCostPerUnit')
  const highestCostPerUnit = watch('highestCostPerUnit')
  const pendingQty = watch('pendingQty')

  return (
    <div className="flex flex-col gap-6">
      {/* Read-only inventory snapshot */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Inventory Snapshot
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Qty on Hand" readOnly>
            <input
              readOnly
              value={fmt(totalQtyOnHand) || '—'}
              className={inputClass(true)}
            />
          </Field>

          <Field label="Avg Cost / Unit" readOnly>
            <input
              readOnly
              value={avgCostPerUnit != null ? `฿${fmt(avgCostPerUnit)}` : '—'}
              className={inputClass(true)}
            />
          </Field>

          <Field label="Lowest Cost / Unit" readOnly>
            <input
              readOnly
              value={lowestCostPerUnit != null ? `฿${fmt(lowestCostPerUnit)}` : '—'}
              className={inputClass(true)}
            />
          </Field>

          <Field label="Highest Cost / Unit" readOnly>
            <input
              readOnly
              value={highestCostPerUnit != null ? `฿${fmt(highestCostPerUnit)}` : '—'}
              className={inputClass(true)}
            />
          </Field>

          <Field label="Pending Qty" readOnly>
            <input
              readOnly
              value={fmt(pendingQty) || '—'}
              className={inputClass(true)}
            />
          </Field>

          <Field label="Stock Ageing" readOnly>
            <input readOnly value="—" className={inputClass(true)} />
          </Field>
        </div>
      </div>

      {/* Editable inventory settings */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Inventory Settings
        </p>
        <p className="-mt-2 mb-3 text-xs text-gray-400">
          {noStore ? t('stock.noDefaultStore') : t('stock.policyFor').replace('{store}', `${warehouse.warehouseCode} · ${warehouse.nameEn}`)}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={t('form.sellingPrice')}>
            <input
              type="number"
              step="0.01"
              {...register('sellingPrice')}
              disabled
              title={later}
              className={inputClass(true)}
              min={0}
              placeholder="0.00"
            />
          </Field>

          <Field label={t('form.markup')}>
            <input
              type="number"
              step="0.01"
              {...register('markupClaim')}
              disabled
              title={later}
              className={inputClass(true)}
              min={0}
              placeholder="0.00"
            />
          </Field>

          <Field label={t('form.reorderPoint')} error={errors.reOrderLevel?.message}>
            <input
              type="number"
              {...register('reOrderLevel')}
              disabled={noStore}
              className={inputClass(noStore)}
              min={0}
            />
          </Field>

          <Field label={t('form.minStock')} error={errors.minQty?.message}>
            <input
              type="number"
              {...register('minQty')}
              disabled={noStore}
              className={inputClass(noStore)}
              min={0}
            />
          </Field>

          <Field label={t('form.maxStock')} error={errors.maxQty?.message}>
            <input
              type="number"
              {...register('maxQty')}
              disabled={noStore}
              className={inputClass(noStore)}
              min={0}
            />
          </Field>

          <Field label={t('form.reorderQty')} error={errors.reOrderQty?.message}>
            <input
              type="number"
              {...register('reOrderQty')}
              disabled={noStore}
              className={inputClass(noStore)}
              min={0}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
