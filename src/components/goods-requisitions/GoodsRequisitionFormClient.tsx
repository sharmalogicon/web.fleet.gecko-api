'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { GoodsRequisition, GoodsRequisitionFormValues } from '@/types/goods-requisition'
import { goodsRequisitionSchema } from '@/types/goods-requisition'
import { useGoodsRequisition } from '@/lib/hooks/useGoodsRequisition'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RequisitionHeaderSection } from '@/components/goods-requisitions/sections/RequisitionHeaderSection'
import { RequisitionLinesSection } from '@/components/goods-requisitions/sections/RequisitionLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  goodsRequisition: GoodsRequisition
  goodsRequisitionID: string
  isNew: boolean
}

export function GoodsRequisitionFormClient({ goodsRequisition, goodsRequisitionID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useGoodsRequisition(goodsRequisitionID)
  const { success, error } = useToastStore()

  const form = useForm<GoodsRequisitionFormValues>({
    resolver: zodResolver(goodsRequisitionSchema) as any,
    defaultValues: goodsRequisition,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, goodsRequisition)
      success('Goods requisition saved', `${saved.documentNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/goods-requisitions/${saved.requisitionID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', `Goods requisition has been removed.`)
      router.push('/fleet/goods-requisitions')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const title = isNew ? `${t('common.new')} ${t('nav.goodsRequisitions')}` : documentNo || t('nav.goodsRequisitions')

  const tabs = [
    {
      id: 'header',
      label: t('form.header'),
      content: <RequisitionHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `${t('form.lineItems')} (${goodsRequisition.lines.length})`,
      content: <RequisitionLinesSection lines={goodsRequisition.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new goods requisition'
            : `${goodsRequisitionID} · ${
                goodsRequisition.isCancel
                  ? 'Cancelled'
                  : goodsRequisition.isApproved
                    ? 'Approved'
                    : 'Draft'
              }`
        }
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && !goodsRequisition.isApproved && (
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
        title="Delete Goods Requisition"
        message="Delete this goods requisition? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
