'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { StockFormValues } from '@/types/stock'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<StockFormValues>
}

function Field({
  label,
  children,
  readOnly,
}: {
  label: string
  children: React.ReactNode
  readOnly?: boolean
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

export function InventorySection({ form }: Props) {
  const { t } = useT()
  const { register, watch } = form

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={t('form.sellingPrice')}>
            <input
              type="number"
              step="0.01"
              {...register('sellingPrice')}
              className={inputClass()}
              min={0}
              placeholder="0.00"
            />
          </Field>

          <Field label={t('form.markup')}>
            <input
              type="number"
              step="0.01"
              {...register('markupClaim')}
              className={inputClass()}
              min={0}
              placeholder="0.00"
            />
          </Field>

          <Field label={t('form.reorderPoint')}>
            <input
              type="number"
              {...register('reOrderLevel')}
              className={inputClass()}
              min={0}
            />
          </Field>

          <Field label={t('form.minStock')}>
            <input
              type="number"
              {...register('minQty')}
              className={inputClass()}
              min={0}
            />
          </Field>

          <Field label={t('form.maxStock')}>
            <input
              type="number"
              {...register('maxQty')}
              className={inputClass()}
              min={0}
            />
          </Field>

          <Field label={t('form.reorderQty')}>
            <input
              type="number"
              {...register('reOrderQty')}
              className={inputClass()}
              min={0}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
