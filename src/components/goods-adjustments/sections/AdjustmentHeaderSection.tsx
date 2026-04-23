'use client'
import type { UseFormReturn } from 'react-hook-form'
import type { GoodsAdjustmentFormValues } from '@/types/goods-adjustment'

interface Props {
  form: UseFormReturn<GoodsAdjustmentFormValues>
  isNew: boolean
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

export function AdjustmentHeaderSection({ form, isNew }: Props) {
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Document No. *" error={errors.documentNo?.message}>
          <input
            {...register('documentNo')}
            disabled={!isNew}
            className={ic(!isNew)}
            placeholder="e.g. ADJ-2024-001"
          />
        </Field>

        <Field label="Adjustment Date *" error={errors.adjustmentDate?.message}>
          <input type="date" {...register('adjustmentDate')} className={ic()} />
        </Field>

        <Field label="Adjustment Type *" error={errors.adjustmentType?.message}>
          <select {...register('adjustmentType')} className={ic()}>
            <option value="INCREASE">Increase</option>
            <option value="DECREASE">Decrease</option>
            <option value="TRANSFER">Transfer</option>
            <option value="WRITE_OFF">Write Off</option>
          </select>
        </Field>

        <Field label="Type Description">
          <input
            {...register('adjustmentTypeDescription')}
            className={ic()}
            placeholder="e.g. Stock replenishment after physical count"
          />
        </Field>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Remarks">
            <textarea
              {...register('remarks')}
              rows={3}
              className={`${ic()} resize-none`}
              placeholder="Optional notes…"
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
