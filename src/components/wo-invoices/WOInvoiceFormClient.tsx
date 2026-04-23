'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { WOInvoice, WOInvoiceFormValues } from '@/types/wo-invoice'
import { woInvoiceSchema } from '@/types/wo-invoice'
import { useWOInvoice } from '@/lib/hooks/useWOInvoice'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { WOInvoiceHeaderSection } from '@/components/wo-invoices/sections/WOInvoiceHeaderSection'
import { WOInvoiceLinesSection } from '@/components/wo-invoices/sections/WOInvoiceLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  woInvoice: WOInvoice
  woInvoiceID: string
  isNew: boolean
}

export function WOInvoiceFormClient({ woInvoice, woInvoiceID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useWOInvoice(woInvoiceID)
  const { success, error } = useToastStore()

  const form = useForm<WOInvoiceFormValues>({
    resolver: zodResolver(woInvoiceSchema) as any,
    defaultValues: woInvoice,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, woInvoice)
      success('WO invoice saved', `${saved.receiptNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/invoice/work-order/${saved.woInvoiceID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'WO invoice has been removed.')
      router.push('/invoice/work-order')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const receiptNo = watch('receiptNo')
  const title = isNew ? 'New WO Invoice' : receiptNo || 'WO Invoice'

  const tabs = [
    {
      id: 'header',
      label: 'Invoice Header',
      content: <WOInvoiceHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `WO Line Items (${woInvoice.lines.length})`,
      content: <WOInvoiceLinesSection lines={woInvoice.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new WO invoice'
            : `${woInvoiceID} · ${woInvoice.status}`
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
        title="Delete WO Invoice"
        message="Delete this WO invoice? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
