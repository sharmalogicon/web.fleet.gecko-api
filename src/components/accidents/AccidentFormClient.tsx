'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { AccidentReport, AccidentReportFormValues } from '@/types/accident-report'
import { accidentReportSchema } from '@/types/accident-report'
import { useAccidentReport } from '@/lib/hooks/useAccidentReport'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AccidentGeneralSection } from '@/components/accidents/sections/AccidentGeneralSection'
import { AccidentLocationSection } from '@/components/accidents/sections/AccidentLocationSection'
import { AccidentImagesSection } from '@/components/accidents/sections/AccidentImagesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  accident: AccidentReport
  accidentID: string
  isNew: boolean
}

export function AccidentFormClient({ accident, accidentID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useAccidentReport(accidentID)
  const { success, error } = useToastStore()

  const form = useForm<AccidentReportFormValues>({
    resolver: zodResolver(accidentReportSchema) as any,
    defaultValues: accident,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, accident.images)
      success('Accident report saved', `${saved.documentNo} has been saved.`)
      form.reset({ ...saved })
      if (isNew) router.push(`/fleet/accidents/${saved.accidentID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Accident report has been removed.')
      router.push('/fleet/accidents')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const title = isNew ? `${t('common.new')} ${t('nav.accidents')}` : documentNo || t('nav.accidents')

  const tabs = [
    {
      id: 'general',
      label: t('form.accidentInfo'),
      content: <AccidentGeneralSection form={form} isNew={isNew} />,
    },
    {
      id: 'location',
      label: t('form.location'),
      content: <AccidentLocationSection form={form} />,
    },
    {
      id: 'photos',
      label: t('form.photos'),
      content: <AccidentImagesSection images={accident.images} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Record a new accident report' : `Accident ID: ${accidentID}`}
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
        title="Delete Accident Report"
        message="Delete this accident report? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
