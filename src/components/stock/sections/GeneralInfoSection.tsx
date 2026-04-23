'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { StockFormValues } from '@/types/stock'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<StockFormValues>
  isNew: boolean
}

const CATEGORY_OPTIONS = ['PARTS', 'LUBRICANT', 'CONSUMABLE', 'TYRE'] as const
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

export function GeneralInfoSection({ form, isNew }: Props) {
  const { t } = useT()
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const isActive = watch('isActive')
  const isOriginalPart = watch('isOriginalPart')

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

      <Field label={t('form.category')}>
        <select {...register('stockCategory')} className={inputClass()}>
          <option value="">— Select —</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Stock Type">
        <input
          {...register('stockType')}
          className={inputClass()}
          placeholder="FILTER, BELT, BRAKE…"
        />
      </Field>

      <Field label={t('form.brand')}>
        <input {...register('brand')} className={inputClass()} placeholder="e.g. DENSO, SHELL" />
      </Field>

      <Field label={t('form.uom')}>
        <input {...register('uom')} className={inputClass()} placeholder="PCS, BTL, SET…" />
      </Field>

      <Field label="Location">
        <input {...register('location')} className={inputClass()} placeholder="A-01-01" />
      </Field>

      <Field label="Lead Time (days)">
        <input type="number" {...register('leadTime')} className={inputClass()} min={0} />
      </Field>

      <Field label="Warranty Value">
        <input type="number" {...register('warrantyValue')} className={inputClass()} min={0} />
      </Field>

      <Field label="Warranty Period">
        <select {...register('warrantyPeriod')} className={inputClass()}>
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
