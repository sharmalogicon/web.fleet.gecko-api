'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { InsuranceClaimFormValues, InsuranceClaim } from '@/types/insurance-claim'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<InsuranceClaimFormValues>
  isNew: boolean
  lines: InsuranceClaim['lines']
}

function Field({
  label,
  error,
  children,
  fullWidth,
}: {
  label: string
  error?: string
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <div className={`flex flex-col gap-1${fullWidth ? ' sm:col-span-2 lg:col-span-3' : ''}`}>
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

function ReadonlyAmount({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 border-gray-200 font-mono text-right">
        ฿{(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
    </div>
  )
}

export function ClaimHeaderSection({ form, isNew, lines }: Props) {
  const { t } = useT()
  const {
    register,
    watch,
    formState: { errors },
  } = form

  const totalAmount = watch('totalAmount') ?? 0
  const discountAmount = watch('discountAmount') ?? 0
  const vat = watch('vat') ?? 0
  const vatAmount = watch('vatAmount') ?? 0
  const nettAmount = watch('nettAmount') ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={`${t('form.documentNo')} *`} error={errors.documentNo?.message}>
          <input
            {...register('documentNo')}
            disabled={!isNew}
            className={ic(!isNew)}
            placeholder="e.g. IC-2024-001"
          />
        </Field>

        <Field label={`${t('form.date')} *`} error={errors.documentDate?.message}>
          <input
            type="date"
            {...register('documentDate')}
            className={ic()}
          />
        </Field>

        <Field label={`${t('form.accidentNo')} *`} error={errors.accidentRefNo?.message}>
          <input
            {...register('accidentRefNo')}
            className={ic()}
            placeholder="e.g. ACC-2024-001"
          />
        </Field>

        <Field label={t('form.claimNo')}>
          <input
            {...register('claimRefNo')}
            className={ic()}
            placeholder="Insurer claim reference"
          />
        </Field>

        <Field label={t('form.equipmentCode')}>
          <input
            {...register('equipmentCode')}
            className={ic()}
            placeholder="e.g. EQ-001"
          />
        </Field>

        <Field label={t('form.category')}>
          <input
            {...register('equipmentCategory')}
            className={ic()}
            placeholder="e.g. Truck"
          />
        </Field>

        <Field label={t('form.driverName')}>
          <input
            {...register('driverName')}
            className={ic()}
            placeholder="Driver name"
          />
        </Field>

        <Field label="Driver ID">
          <input
            {...register('driverID')}
            className={ic()}
            placeholder="e.g. DRV-001"
          />
        </Field>

        <Field label={t('form.vendor')}>
          <input
            {...register('vendorName')}
            className={ic()}
            placeholder="Repair/service vendor"
          />
        </Field>

        <Field label={t('form.contactPerson')}>
          <input
            {...register('contactPerson')}
            className={ic()}
            placeholder="Vendor contact name"
          />
        </Field>

        <Field label="Claim By">
          <input
            {...register('claimBy')}
            className={ic()}
            placeholder="e.g. Fleet Manager"
          />
        </Field>

        <Field label="Revised From">
          <input
            {...register('revisedFrom')}
            className={ic()}
            placeholder="Original document no."
          />
        </Field>

        <Field label="VAT %">
          <input
            type="number"
            step="0.01"
            {...register('vat', { valueAsNumber: true })}
            className={ic()}
            placeholder="7"
          />
        </Field>

        <Field label={t('common.remarks')} fullWidth>
          <textarea
            {...register('remarks')}
            rows={2}
            className={`${ic()} resize-none`}
            placeholder="Additional remarks…"
          />
        </Field>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Financial Summary (read-only)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <ReadonlyAmount label="Total Amount" value={totalAmount} />
          <ReadonlyAmount label="Discount" value={discountAmount} />
          <ReadonlyAmount label={`VAT (${vat}%)`} value={vatAmount} />
          <ReadonlyAmount label="Nett Amount" value={nettAmount} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Line Items</label>
            <div className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 border-gray-200 text-right font-mono">
              {lines.length} line{lines.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
