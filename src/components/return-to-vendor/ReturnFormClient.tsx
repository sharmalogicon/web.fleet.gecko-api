'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { ReturnToVendor, ReturnToVendorFormValues } from '@/types/return-to-vendor'
import { returnToVendorSchema } from '@/types/return-to-vendor'
import { useReturnToVendor } from '@/lib/hooks/useReturnToVendor'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ReturnHeaderSection } from '@/components/return-to-vendor/sections/ReturnHeaderSection'
import { ReturnLinesSection } from '@/components/return-to-vendor/sections/ReturnLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  returnToVendor: ReturnToVendor
  returnID: string
  isNew: boolean
}

export function ReturnFormClient({ returnToVendor, returnID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useReturnToVendor(returnID)
  const { success, error } = useToastStore()

  const form = useForm<ReturnToVendorFormValues>({
    resolver: zodResolver(returnToVendorSchema) as any,
    defaultValues: returnToVendor,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, returnToVendor)
      success('Return saved', `${saved.documentNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/return-to-vendor/${saved.returnID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Return to vendor has been removed.')
      router.push('/fleet/return-to-vendor')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const title = isNew ? 'New Return to Vendor' : documentNo || 'Return to Vendor'

  const tabs = [
    {
      id: 'header',
      label: 'Header',
      content: <ReturnHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `Line Items (${returnToVendor.lines.length})`,
      content: <ReturnLinesSection lines={returnToVendor.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new return to vendor'
            : `${returnID} · Return to Vendor`
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
        title="Delete Return to Vendor"
        message="Delete this return to vendor record? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
