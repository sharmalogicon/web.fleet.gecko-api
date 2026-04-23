'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { VendorCreditNote, VendorCreditNoteFormValues } from '@/types/vendor-credit-note'
import { vendorCreditNoteSchema } from '@/types/vendor-credit-note'
import { useVendorCreditNote } from '@/lib/hooks/useVendorCreditNote'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { VendorCreditNoteHeaderSection } from '@/components/credit-notes/sections/VendorCreditNoteHeaderSection'
import { VendorCreditNoteLinesSection } from '@/components/credit-notes/sections/VendorCreditNoteLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  vendorCreditNote: VendorCreditNote
  vendorCreditNoteID: string
  isNew: boolean
}

export function VendorCreditNoteFormClient({ vendorCreditNote, vendorCreditNoteID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useVendorCreditNote(vendorCreditNoteID)
  const { success, error } = useToastStore()

  const form = useForm<VendorCreditNoteFormValues>({
    resolver: zodResolver(vendorCreditNoteSchema) as any,
    defaultValues: vendorCreditNote,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, vendorCreditNote)
      success('Vendor credit note saved', `${saved.creditNoteNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/invoice/credit-notes/vendor/${saved.vendorCreditNoteID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Vendor credit note has been removed.')
      router.push('/invoice/credit-notes/vendor')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const creditNoteNo = watch('creditNoteNo')
  const title = isNew ? `${t('common.new')} ${t('nav.creditNotesVendor')}` : creditNoteNo || t('nav.creditNotesVendor')

  const tabs = [
    {
      id: 'header',
      label: t('form.header'),
      content: <VendorCreditNoteHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `${t('form.lineItems')} (${vendorCreditNote.lines.length})`,
      content: <VendorCreditNoteLinesSection lines={vendorCreditNote.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new vendor credit note'
            : `${vendorCreditNoteID} · ${vendorCreditNote.status}`
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
        title="Delete Vendor Credit Note"
        message="Delete this vendor credit note? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
