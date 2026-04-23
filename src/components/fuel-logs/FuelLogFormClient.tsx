'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { FuelLog, FuelLogFormValues } from '@/types/fuel-log'
import { fuelLogSchema } from '@/types/fuel-log'
import { useFuelLog } from '@/lib/hooks/useFuelLog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FuelEntrySection } from '@/components/fuel-logs/sections/FuelEntrySection'
import { CostSummarySection } from '@/components/fuel-logs/sections/CostSummarySection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  fuelLog: FuelLog | FuelLogFormValues
  fuelLogID: string
  isNew: boolean
}

export function FuelLogFormClient({ fuelLog, fuelLogID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useFuelLog(fuelLogID)
  const { success, error } = useToastStore()

  const form = useForm<FuelLogFormValues>({
    resolver: zodResolver(fuelLogSchema) as any,
    defaultValues: fuelLog,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Fuel log saved', `${saved.voucherNo || `FL-${saved.fuelLogID}`} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/fuel-logs/${saved.fuelLogID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    const label =
      (fuelLog as FuelLog).fuelLogID
        ? (fuelLog as FuelLog).voucherNo || `FL-${(fuelLog as FuelLog).fuelLogID}`
        : 'this fuel log'
    try {
      await remove()
      success('Deleted', `${label} has been removed.`)
      router.push('/fleet/fuel-logs')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const voucherNo = watch('voucherNo')
  const equipmentCode = watch('equipmentCode')
  const title = isNew
    ? 'New Fuel Log'
    : voucherNo || equipmentCode || 'Fuel Log'

  const tabs = [
    {
      id: 'fuel-entry',
      label: 'Fuel Entry',
      content: <FuelEntrySection form={form} />,
    },
    {
      id: 'cost-summary',
      label: 'Cost Summary',
      content: <CostSummarySection form={form} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new fuel log entry' : fuelLogID}
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
        title="Delete Fuel Log"
        message={`Delete this fuel log? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
