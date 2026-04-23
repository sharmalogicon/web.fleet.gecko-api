'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { GoodsAdjustment, GoodsAdjustmentFormValues } from '@/types/goods-adjustment'
import { goodsAdjustmentSchema, ADJUSTMENT_TYPE_MAP } from '@/types/goods-adjustment'
import { useGoodsAdjustment } from '@/lib/hooks/useGoodsAdjustment'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AdjustmentHeaderSection } from '@/components/goods-adjustments/sections/AdjustmentHeaderSection'
import { AdjustmentLinesSection } from '@/components/goods-adjustments/sections/AdjustmentLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  goodsAdjustment: GoodsAdjustment
  adjustmentID: string
  isNew: boolean
}

export function AdjustmentFormClient({ goodsAdjustment, adjustmentID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useGoodsAdjustment(adjustmentID)
  const { success, error } = useToastStore()

  const form = useForm<GoodsAdjustmentFormValues>({
    resolver: zodResolver(goodsAdjustmentSchema) as any,
    defaultValues: goodsAdjustment,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, goodsAdjustment)
      success('Adjustment saved', `${saved.documentNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/goods-adjustments/${saved.adjustmentID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Goods adjustment has been removed.')
      router.push('/fleet/goods-adjustments')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const adjustmentType = watch('adjustmentType')
  const title = isNew ? 'New Goods Adjustment' : documentNo || 'Goods Adjustment'
  const typeLabel = ADJUSTMENT_TYPE_MAP[adjustmentType] ?? adjustmentType

  const tabs = [
    {
      id: 'header',
      label: 'Header',
      content: <AdjustmentHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `Line Items (${goodsAdjustment.lines.length})`,
      content: <AdjustmentLinesSection lines={goodsAdjustment.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new goods adjustment'
            : `${adjustmentID} · ${typeLabel}`
        }
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
        title="Delete Goods Adjustment"
        message="Delete this goods adjustment? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
