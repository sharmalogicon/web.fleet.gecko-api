'use client'

import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { DriverFormValues } from '@/types/driver'
import { calcAge } from '@/lib/utils/driver'
import { useT } from '@/i18n/I18nContext'

interface GeneralSectionProps {
  form: UseFormReturn<DriverFormValues>
  /** Read-only inputs (Trucking-owned, personal data, hidden rates). */
  locked?: ReadonlySet<string>
}

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ON LEAVE', 'TERMINATED'] as const

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

/** "On file in Trucking" is not a date: show it in a text input. */
const isIsoDate = (v: string | undefined) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v)

function inputClass(hasError?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed ${
    hasError ? 'border-red-400' : 'border-gray-300'
  }`
}

export function GeneralSection({ form, locked }: GeneralSectionProps) {
  const lock = (field: string) => !!locked?.has(field)
  const { t } = useT()
  const { register, watch, formState: { errors } } = form
  const dobValue = watch('dob')
  const age = useMemo(() => calcAge(dobValue), [dobValue])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={`${t('form.driverCode')} *`} error={errors.driverCode?.message}>
        <input {...register('driverCode')} disabled={lock('driverCode')} className={inputClass(!!errors.driverCode)} placeholder="DRV-001" />
      </Field>

      <Field label={`${t('form.driverName')} *`} error={errors.driverName?.message}>
        <input {...register('driverName')} disabled={lock('driverName')} className={inputClass(!!errors.driverName)} placeholder="Full name" />
      </Field>

      <Field label={`${t('form.status')} *`} error={errors.status?.message}>
        <select {...register('status')} disabled={lock('status')} className={inputClass(!!errors.status)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>

      <Field label={t('form.position')}>
        <input {...register('position')} disabled={lock('position')} className={inputClass()} placeholder="e.g. Senior Driver" />
      </Field>

      <Field label="Date of Birth">
        <input type={lock('dob') && !isIsoDate(dobValue) ? 'text' : 'date'} {...register('dob')} disabled={lock('dob')} className={inputClass()} />
      </Field>

      <Field label="Age">
        <input
          value={age !== null ? `${age} years` : ''}
          readOnly
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
        />
      </Field>

      <Field label="ID Number">
        <input {...register('idNo')} disabled={lock('idNo')} className={inputClass()} placeholder="National ID" />
      </Field>

      <Field label="Social Security No.">
        <input {...register('ssNo')} disabled={lock('ssNo')} className={inputClass()} />
      </Field>

      <Field label="Fuel Card">
        <input {...register('fuelCard')} disabled={lock('fuelCard')} className={inputClass()} />
      </Field>

      <Field label="Date Hired">
        <input type="date" {...register('dateHire')} disabled={lock('dateHire')} className={inputClass()} />
      </Field>

      <Field label="Date Released" error={errors.dateRelease?.message}>
        <input type="date" {...register('dateRelease')} disabled={lock('dateRelease')} className={inputClass(!!errors.dateRelease)} />
      </Field>

      <Field label="Standard Rate">
        <input type="number" step="0.01" {...register('standardRate')} disabled={lock('standardRate')} className={inputClass()} />
      </Field>

      <Field label="Overtime Rate">
        <input type="number" step="0.01" {...register('overtimeRate')} disabled={lock('overtimeRate')} className={inputClass()} />
      </Field>

      <Field label={t('form.phone')}>
        <input {...register('phoneNumber')} disabled={lock('phoneNumber')} className={inputClass()} />
      </Field>

      <Field label="Fax">
        <input {...register('faxNumber')} disabled={lock('faxNumber')} className={inputClass()} />
      </Field>

      <Field label={t('form.email')} error={errors.emailID?.message}>
        <input type="email" {...register('emailID')} disabled={lock('emailID')} className={inputClass(!!errors.emailID)} />
      </Field>

      <Field label="Address 1">
        <input {...register('address1')} disabled={lock('address1')} className={inputClass()} />
      </Field>

      <Field label="Address 2">
        <input {...register('address2')} disabled={lock('address2')} className={inputClass()} />
      </Field>

      <Field label="State / Province">
        <input {...register('state')} disabled={lock('state')} className={inputClass()} />
      </Field>

      <Field label={t('form.country')}>
        <input {...register('countryCode')} disabled={lock('countryCode')} className={inputClass()} placeholder="TH" />
      </Field>

      <Field label="Post Code">
        <input {...register('postCode')} disabled={lock('postCode')} className={inputClass()} />
      </Field>

      <Field label={t('common.remarks')}>
        <textarea {...register('remarks')} disabled={lock('remarks')} rows={3} className={`${inputClass()} resize-none`} />
      </Field>
    </div>
  )
}
