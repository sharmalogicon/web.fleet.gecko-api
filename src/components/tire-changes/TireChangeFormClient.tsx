'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { TireChange, TireChangeFormValues } from '@/types/tire-change'
import { tireChangeSchema } from '@/types/tire-change'
import { useTireChange } from '@/lib/hooks/useTireChange'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ChangeHeaderSection } from '@/components/tire-changes/sections/ChangeHeaderSection'
import { ChangeLinesSection } from '@/components/tire-changes/sections/ChangeLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  tireChange: TireChange
  tireChangeID: string
  isNew: boolean
}

export function TireChangeFormClient({ tireChange, tireChangeID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useTireChange(tireChangeID)
  const { success, error } = useToastStore()

  const form = useForm<TireChangeFormValues>({
    resolver: zodResolver(tireChangeSchema) as any,
    defaultValues: tireChange,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, tireChange.lines)
      success('Tire change saved', `${saved.documentNo} has been saved.`)
      form.reset({ ...saved })
      if (isNew) router.push(`/fleet/tires/changes/${saved.tireChangeID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Tire change has been removed.')
      router.push('/fleet/tires/changes')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const title = isNew ? `${t('common.new')} ${t('nav.tireChanges')}` : documentNo || t('nav.tireChanges')

  const tabs = [
    {
      id: 'header',
      label: t('form.header'),
      content: <ChangeHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: t('form.lineItems'),
      content: <ChangeLinesSection lines={tireChange.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Record a new tire change' : `Change ID: ${tireChangeID}`}
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
        title="Delete Tire Change"
        message="Delete this tire change record? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
