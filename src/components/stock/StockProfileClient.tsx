'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { StockProfile, StockFormValues } from '@/types/stock'
import { stockSchema } from '@/types/stock'
import { useStock } from '@/lib/hooks/useStock'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { GeneralInfoSection } from '@/components/stock/sections/GeneralInfoSection'
import { InventorySection } from '@/components/stock/sections/InventorySection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  stock: StockProfile | StockFormValues
  stockID: string
  isNew: boolean
}

export function StockProfileClient({ stock, stockID, isNew }: Props) {
  const { t } = useT()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useStock(stockID)
  const { success, error } = useToastStore()

  const form = useForm<StockFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(stockSchema) as any,
    defaultValues: stock as StockFormValues,
  })

  const {
    handleSubmit,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Stock saved', `${saved.code} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/master/stock/${saved.stockID}`)
    } catch {
      error('Save failed', 'An error occurred. Please try again.')
    }
  })

  const handleDelete = async () => {
    const code = form.getValues('code')
    try {
      await remove()
      success('Stock deleted', `${code} has been removed.`)
      router.push('/master/stock')
    } catch {
      error('Delete failed', 'An error occurred. Please try again.')
    } finally {
      setShowDeleteDialog(false)
    }
  }

  const code = form.watch('code')
  const title = isNew ? 'New Stock Item' : code || 'Stock Profile'

  const tabs = [
    {
      id: 'general',
      label: 'General Information',
      content: <GeneralInfoSection form={form} isNew={isNew} />,
    },
    {
      id: 'inventory',
      label: 'Inventory',
      content: <InventorySection form={form} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Register new stock item' : stockID}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
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
        open={showDeleteDialog}
        title="Delete Stock Item"
        message={`Are you sure you want to delete "${form.getValues('code')}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        destructive
      />
    </>
  )
}
