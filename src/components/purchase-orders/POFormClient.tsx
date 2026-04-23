'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { PurchaseOrder, PurchaseOrderFormValues } from '@/types/purchase-order'
import { purchaseOrderSchema } from '@/types/purchase-order'
import { usePurchaseOrder } from '@/lib/hooks/usePurchaseOrder'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { POHeaderSection } from '@/components/purchase-orders/sections/POHeaderSection'
import { POLinesSection } from '@/components/purchase-orders/sections/POLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  purchaseOrder: PurchaseOrder
  purchaseOrderID: string
  isNew: boolean
}

export function POFormClient({ purchaseOrder, purchaseOrderID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = usePurchaseOrder(purchaseOrderID)
  const { success, error } = useToastStore()

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema) as any,
    defaultValues: purchaseOrder,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, purchaseOrder)
      success('Purchase order saved', `${saved.documentNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/purchase-orders/${saved.purchaseOrderID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Purchase order has been removed.')
      router.push('/fleet/purchase-orders')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const title = isNew ? 'New Purchase Order' : documentNo || 'Purchase Order'

  const statusLabel = purchaseOrder.isCancel
    ? 'Cancelled'
    : purchaseOrder.isApproved
      ? 'Approved'
      : 'Draft'

  const tabs = [
    {
      id: 'header',
      label: 'Header',
      content: <POHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `Line Items (${purchaseOrder.lines.length})`,
      content: <POLinesSection lines={purchaseOrder.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new purchase order'
            : `${purchaseOrderID} · ${statusLabel}`
        }
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && !purchaseOrder.isApproved && !purchaseOrder.isCancel && (
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
        title="Delete Purchase Order"
        message="Delete this purchase order? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
