'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { WorkOrderFormValues } from '@/types/work-order'

interface Props {
  form: UseFormReturn<WorkOrderFormValues>
  isNew: boolean
}

const STATUS_OPTIONS = ['DRAFT', 'OPEN', 'IN PROGRESS', 'COMPLETED', 'CANCELLED', 'INVOICED'] as const
const PRIORITY_OPTIONS = ['NORMAL', 'HIGH', 'URGENT'] as const
const CATEGORY_OPTIONS = [
  'ENGINE',
  'BRAKE',
  'TYRE',
  'ELECTRICAL',
  'PM',
  'INSPECTION',
  'BODY',
  'TRANSMISSION',
] as const

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

function fmt(val: number | undefined) {
  return val != null ? `฿${val.toLocaleString()}` : '—'
}

export function WOGeneralSection({ form, isNew }: Props) {
  const { register, watch } = form
  const isApproved = watch('isApproved')
  const totals = {
    parts: watch('totalPartsPrice'),
    labor: watch('totalLaborPrice'),
    discount: watch('totalDiscount'),
    vat: watch('totalVAT'),
    grand: watch('grandTotal'),
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="WO Number">
        <input
          {...register('documentNo')}
          readOnly
          className={ic(true)}
          placeholder="Auto-generated"
        />
      </Field>
      <Field label="WR Reference">
        <input {...register('woRequestNo')} className={ic()} />
      </Field>
      <Field label="Order Date">
        <input type="date" {...register('orderDate')} className={ic()} />
      </Field>
      <Field label="Start Date">
        <input type="date" {...register('startDate')} className={ic()} />
      </Field>
      <Field label="Status">
        <select {...register('status')} className={ic()}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Priority">
        <select {...register('priority')} className={ic()}>
          <option value="">— Select —</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Equipment Code">
        <input {...register('equipmentCode')} className={ic()} />
      </Field>
      <Field label="Driver">
        <input {...register('driverName')} className={ic()} />
      </Field>
      <Field label="Service Category">
        <select {...register('serviceTypeCategory')} className={ic()}>
          <option value="">— Select —</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Billing Customer">
        <input {...register('billingCustomerName')} className={ic()} />
      </Field>
      <Field label="Vendor Name">
        <input {...register('vendorName')} className={ic()} />
      </Field>
      <Field label="Vendor Code">
        <input {...register('vendorCode')} className={ic()} />
      </Field>
      <Field label="Vendor Invoice No.">
        <input {...register('vendorInvoiceNo')} className={ic()} />
      </Field>
      <Field label="WO Invoice No.">
        <input {...register('woInvoiceNo')} className={ic()} />
      </Field>
      <Field label="Claim No.">
        <input {...register('claimNo')} className={ic()} />
      </Field>
      <Field label="Meter Reading">
        <input type="number" {...register('meterRead')} className={ic()} />
      </Field>
      <Field label="VAT (%)">
        <input type="number" step="0.1" {...register('vat')} className={ic()} />
      </Field>

      {/* Checkboxes + conditional approved date */}
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('isApproved')}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">Approved</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('isTireMaintenance')}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">Tire Maintenance</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('isCancel')}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">Cancelled</span>
          </label>
        </div>
        {isApproved && (
          <Field label="Approved On">
            <input type="date" {...register('approvedOn')} className={ic()} />
          </Field>
        )}
      </div>

      <Field label="Remarks">
        <textarea
          {...register('remarks')}
          rows={3}
          className={`${ic()} resize-none sm:col-span-2`}
        />
      </Field>

      {/* Financial summary — read only */}
      <div className="sm:col-span-2 lg:col-span-3 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
          Financial Summary (read-only)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Parts Total', val: fmt(totals.parts) },
            { label: 'Labor Total', val: fmt(totals.labor) },
            { label: 'Discount', val: fmt(totals.discount) },
            { label: 'VAT Amount', val: fmt(totals.vat) },
            { label: 'Grand Total', val: fmt(totals.grand) },
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
