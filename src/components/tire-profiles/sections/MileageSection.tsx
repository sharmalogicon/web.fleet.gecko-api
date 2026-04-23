'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { TireProfileFormValues } from '@/types/tire-profile'
import type { TireProfile } from '@/types/tire-profile'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<TireProfileFormValues>
  existing?: TireProfile
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

function formatNum(v?: number): string {
  if (v === undefined || v === null) return '—'
  return v.toLocaleString('en-US')
}

function formatCurrency(v?: number): string {
  if (v === undefined || v === null) return '—'
  return '฿' + v.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

export function MileageSection({ form, existing }: Props) {
  const { t } = useT()
  const { register } = form

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Anticipated Mileage (km)">
          <input
            type="number"
            step="1"
            {...register('anticipatedMileage')}
            className={ic()}
            placeholder="e.g. 150000"
          />
        </Field>

        <Field label="Actual Mileage (km)">
          <input
            type="number"
            step="1"
            {...register('actualMileage')}
            className={ic()}
            placeholder="e.g. 72000"
          />
        </Field>

        <Field label="Anticipated Hours">
          <input
            type="number"
            step="0.1"
            {...register('anticipatedHour')}
            className={ic()}
            placeholder="e.g. 5000"
          />
        </Field>

        <Field label="Actual Hours">
          <input
            type="number"
            step="0.1"
            {...register('actualHour')}
            className={ic()}
            placeholder="e.g. 2400"
          />
        </Field>
      </div>

      {/* Recap stats — read-only summary */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recap &amp; Cost Summary (Read-only)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Times Recapped</span>
            <span className="text-sm font-medium text-gray-800">
              {formatNum(existing?.timeRecaped)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Total Recap Cost</span>
            <span className="text-sm font-medium text-gray-800">
              {formatCurrency(existing?.recapCost)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Total Inspection Cost</span>
            <span className="text-sm font-medium text-gray-800">
              {formatCurrency(existing?.totalInspectionCost)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500">Total Repair Cost</span>
            <span className="text-base font-bold text-gray-900">
              {formatCurrency(existing?.totalRepairCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
