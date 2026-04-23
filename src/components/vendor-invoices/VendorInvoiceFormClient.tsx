'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { VendorInvoice, VendorInvoiceFormValues } from '@/types/vendor-invoice'
import { vendorInvoiceSchema } from '@/types/vendor-invoice'
import { useVendorInvoice } from '@/lib/hooks/useVendorInvoice'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { InvoiceHeaderSection } from '@/components/vendor-invoices/sections/InvoiceHeaderSection'
import { InvoiceLinesSection } from '@/components/vendor-invoices/sections/InvoiceLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  vendorInvoice: VendorInvoice
  vendorInvoiceID: string
  isNew: boolean
}

export function VendorInvoiceFormClient({ vendorInvoice, vendorInvoiceID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useVendorInvoice(vendorInvoiceID)
  const { success, error } = useToastStore()

  const form = useForm<VendorInvoiceFormValues>({
    resolver: zodResolver(vendorInvoiceSchema) as any,
    defaultValues: vendorInvoice,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, vendorInvoice)
      success('Vendor invoice saved', `${saved.documentNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/invoice/vendor/${saved.vendorInvoiceID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Vendor invoice has been removed.')
      router.push('/invoice/vendor')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const title = isNew ? `${t('common.new')} ${t('nav.vendorInvoices')}` : documentNo || t('nav.vendorInvoices')

  const canDelete = !isNew && vendorInvoice.status === 'ACTIVE' && vendorInvoice.lines.length === 0

  const tabs = [
    {
      id: 'header',
      label: t('form.invoiceHeader'),
      content: <InvoiceHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `${t('form.lineItems')} (${vendorInvoice.lines.length})`,
      content: <InvoiceLinesSection lines={vendorInvoice.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new vendor invoice'
            : `${vendorInvoiceID} · ${vendorInvoice.status}`
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
        title="Delete Vendor Invoice"
        message="Delete this vendor invoice? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
