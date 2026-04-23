'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { WorkRequest, WorkRequestFormValues } from '@/types/work-request'
import { workRequestSchema } from '@/types/work-request'
import { useWorkRequest } from '@/lib/hooks/useWorkRequest'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useT } from '@/i18n/I18nContext'

const WR_STATUSES = ['DRAFT', 'SUBMITTED', 'IN PROGRESS', 'COMPLETED', 'CANCELLED'] as const
const PRIORITY_TYPES = ['NORMAL', 'HIGH', 'URGENT'] as const

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function ic(err?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    err ? 'border-red-400' : 'border-gray-300'
  }`
}

interface Props {
  record: WorkRequest | WorkRequestFormValues
  recordID: string
  isNew: boolean
}

export function WorkRequestFormClient({ record, recordID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useWorkRequest(recordID)
  const { success, error } = useToastStore()

  const form = useForm<WorkRequestFormValues>({
    resolver: zodResolver(workRequestSchema) as any,
    defaultValues: record,
  })
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Saved', `${saved.documentNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/work-requests/${saved.wrID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Work request has been removed.')
      router.push('/fleet/work-requests')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = form.watch('documentNo')
  const title = isNew ? `${t('common.new')} ${t('nav.workRequests')}` : documentNo || t('nav.workRequests')

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Document No" error={errors.documentNo?.message}>
        <input
          {...register('documentNo')}
          disabled
          className={`${ic(!!errors.documentNo)} bg-gray-50 text-gray-500`}
          placeholder="Auto-generated"
        />
      </Field>

      <Field label="Order Date" error={errors.orderDate?.message}>
        <input type="date" {...register('orderDate')} className={ic(!!errors.orderDate)} />
      </Field>

      <Field label="Status" error={errors.status?.message}>
        <select {...register('status')} className={ic(!!errors.status)}>
          {WR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Priority" error={errors.priorityType?.message}>
        <select {...register('priorityType')} className={ic(!!errors.priorityType)}>
          <option value="">— Select —</option>
          {PRIORITY_TYPES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Equipment Code" error={errors.equipmentCode?.message}>
        <input
          {...register('equipmentCode')}
          className={ic(!!errors.equipmentCode)}
          placeholder="e.g. EQ-001"
        />
      </Field>

      <Field label="Billing Customer" error={errors.billingCustomerName?.message}>
        <input
          {...register('billingCustomerName')}
          className={ic(!!errors.billingCustomerName)}
          placeholder="Customer name"
        />
      </Field>

      <Field label="Vendor Name" error={errors.vendorName?.message}>
        <input
          {...register('vendorName')}
          className={ic(!!errors.vendorName)}
          placeholder="Vendor name"
        />
      </Field>

      <Field label="Vendor Code" error={errors.vendorCode?.message}>
        <input
          {...register('vendorCode')}
          className={ic(!!errors.vendorCode)}
          placeholder="e.g. VND-001"
        />
      </Field>

      <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
        <textarea
          {...register('description')}
          rows={3}
          className={ic(!!errors.description)}
          placeholder="Describe the work to be performed…"
        />
      </Field>

      <Field label="Remarks" error={errors.remarks?.message} className="sm:col-span-2">
        <textarea
          {...register('remarks')}
          rows={2}
          className={ic(!!errors.remarks)}
          placeholder="Additional remarks or notes…"
        />
      </Field>

      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isCancel')}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">Cancelled</span>
        </label>
      </div>
    </div>
  )

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new work request' : recordID}
        tabs={[{ id: 'detail', label: t('common.details'), content }]}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting ? t('common.loading') : t('common.delete')}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        }
      />
      <ConfirmDialog
        open={showDelete}
        title="Delete Work Request"
        message={`Delete "${documentNo || `WR-${recordID}`}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
