'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { TireMaintenance, TireMaintenanceFormValues } from '@/types/tire-maintenance'
import { tireMaintenanceSchema } from '@/types/tire-maintenance'
import { useTireMaintenance } from '@/lib/hooks/useTireMaintenance'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MaintenanceHeaderSection } from '@/components/tire-maintenance/sections/MaintenanceHeaderSection'
import { MaintenanceLinesSection } from '@/components/tire-maintenance/sections/MaintenanceLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  tireMaintenance: TireMaintenance
  maintenanceID: string
  isNew: boolean
}

export function TireMaintenanceFormClient({ tireMaintenance, maintenanceID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useTireMaintenance(maintenanceID)
  const { success, error } = useToastStore()

  const form = useForm<TireMaintenanceFormValues>({
    resolver: zodResolver(tireMaintenanceSchema) as any,
    defaultValues: tireMaintenance,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, tireMaintenance.lines)
      success('Maintenance record saved', `${saved.documentNo} has been saved.`)
      form.reset({ ...saved })
      if (isNew) router.push(`/fleet/tires/maintenance/${saved.maintenanceID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Maintenance record has been removed.')
      router.push('/fleet/tires/maintenance')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const title = isNew ? 'New Tire Maintenance' : documentNo || 'Tire Maintenance'

  const tabs = [
    {
      id: 'header',
      label: 'Maintenance Details',
      content: <MaintenanceHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: 'Maintenance Lines',
      content: <MaintenanceLinesSection lines={tireMaintenance.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Record a new maintenance' : `Maintenance ID: ${maintenanceID}`}
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
        title="Delete Maintenance Record"
        message="Delete this maintenance record? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
