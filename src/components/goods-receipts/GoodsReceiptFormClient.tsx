'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { GoodsReceipt, GoodsReceiptFormValues } from '@/types/goods-receipt'
import { goodsReceiptSchema } from '@/types/goods-receipt'
import { useGoodsReceipt } from '@/lib/hooks/useGoodsReceipt'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ReceiptHeaderSection } from '@/components/goods-receipts/sections/ReceiptHeaderSection'
import { ReceiptLinesSection } from '@/components/goods-receipts/sections/ReceiptLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  goodsReceipt: GoodsReceipt
  goodsReceiptID: string
  isNew: boolean
}

export function GoodsReceiptFormClient({ goodsReceipt, goodsReceiptID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useGoodsReceipt(goodsReceiptID)
  const { success, error } = useToastStore()

  const form = useForm<GoodsReceiptFormValues>({
    resolver: zodResolver(goodsReceiptSchema) as any,
    defaultValues: goodsReceipt,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, goodsReceipt)
      success('Goods receipt saved', `${saved.documentNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/goods-receipts/${saved.goodsReceiptID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Goods receipt has been removed.')
      router.push('/fleet/goods-receipts')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const title = isNew ? 'New Goods Receipt' : documentNo || 'Goods Receipt'

  const statusLabel = goodsReceipt.isCancel ? 'Cancelled' : 'Received'

  const tabs = [
    {
      id: 'header',
      label: 'Header',
      content: <ReceiptHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `Line Items (${goodsReceipt.lines.length})`,
      content: <ReceiptLinesSection lines={goodsReceipt.lines} />,
    },
  ]

  const canDelete = !isNew && !goodsReceipt.isCancel && goodsReceipt.lines.length === 0

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new goods receipt'
            : `${goodsReceiptID} · ${statusLabel}`
        }
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {canDelete && (
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
        title="Delete Goods Receipt"
        message="Delete this goods receipt? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
