'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { GoodsRequest, GoodsRequestFormValues } from '@/types/goods-request'
import { goodsRequestSchema, GOODS_REQUEST_STATUS_OPTIONS } from '@/types/goods-request'
import { useGoodsRequest } from '@/lib/hooks/useGoodsRequest'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useT } from '@/i18n/I18nContext'

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

interface Props {
  goodsRequest: GoodsRequest | GoodsRequestFormValues
  goodsRequestID: string
  isNew: boolean
}

export function GoodsRequestFormClient({ goodsRequest, goodsRequestID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useGoodsRequest(goodsRequestID)
  const { success, error } = useToastStore()

  const form = useForm<GoodsRequestFormValues>({
    resolver: zodResolver(goodsRequestSchema) as any,
    defaultValues: goodsRequest,
  })

  const {
    handleSubmit,
    register,
    watch,
    formState: { errors, isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Goods request saved', `${saved.reqNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/goods-requests/${saved.goodsRequestID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', `Goods request has been removed.`)
      router.push('/fleet/goods-requests')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const reqNo = watch('reqNo')
  const title = isNew ? 'New Goods Request' : reqNo || 'Goods Request'

  const tabs = [
    {
      id: 'details',
      label: 'Details',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Request No. *" error={errors.reqNo?.message}>
            <input
              {...register('reqNo')}
              disabled={!isNew}
              className={ic(!isNew)}
              placeholder="e.g. GR-2024-001"
            />
          </Field>

          <Field label="Request Date *" error={errors.reqDate?.message}>
            <input type="date" {...register('reqDate')} className={ic()} />
          </Field>

          <Field label="Required By *" error={errors.requireDate?.message}>
            <input type="date" {...register('requireDate')} className={ic()} />
          </Field>

          <Field label="Work Order No.">
            <input
              {...register('workOrderNo')}
              className={ic()}
              placeholder="e.g. WO-001"
            />
          </Field>

          <Field label="Job Ref No.">
            <input
              {...register('jobRefNo')}
              className={ic()}
              placeholder="e.g. JR-001"
            />
          </Field>

          <Field label="Status *" error={errors.status?.message}>
            <select {...register('status')} className={ic()}>
              {GOODS_REQUEST_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
      ),
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new goods request' : goodsRequestID}
        tabs={tabs}
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
        title="Delete Goods Request"
        message="Delete this goods request? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
