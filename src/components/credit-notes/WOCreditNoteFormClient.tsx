'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { WOCreditNote, WOCreditNoteFormValues } from '@/types/wo-credit-note'
import { woCreditNoteSchema } from '@/types/wo-credit-note'
import { useWOCreditNote } from '@/lib/hooks/useWOCreditNote'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { WOCreditNoteHeaderSection } from '@/components/credit-notes/sections/WOCreditNoteHeaderSection'
import { WOCreditNoteLinesSection } from '@/components/credit-notes/sections/WOCreditNoteLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  woCreditNote: WOCreditNote
  woCreditNoteID: string
  isNew: boolean
}

export function WOCreditNoteFormClient({ woCreditNote, woCreditNoteID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useWOCreditNote(woCreditNoteID)
  const { success, error } = useToastStore()

  const form = useForm<WOCreditNoteFormValues>({
    resolver: zodResolver(woCreditNoteSchema) as any,
    defaultValues: woCreditNote,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, woCreditNote)
      success('WO credit note saved', `${saved.creditNoteNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/invoice/credit-notes/wo/${saved.woCreditNoteID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'WO credit note has been removed.')
      router.push('/invoice/credit-notes/wo')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const creditNoteNo = watch('creditNoteNo')
  const title = isNew ? 'New WO Credit Note' : creditNoteNo || 'WO Credit Note'

  const tabs = [
    {
      id: 'header',
      label: 'Credit Note Header',
      content: <WOCreditNoteHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `Line Items (${woCreditNote.lines.length})`,
      content: <WOCreditNoteLinesSection lines={woCreditNote.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new WO credit note'
            : `${woCreditNoteID} · ${woCreditNote.status}`
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
        title="Delete WO Credit Note"
        message="Delete this WO credit note? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
