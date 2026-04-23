'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { WorkOrder, WorkOrderFormValues } from '@/types/work-order'
import { workOrderSchema } from '@/types/work-order'
import { useWorkOrder } from '@/lib/hooks/useWorkOrder'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { WOGeneralSection } from '@/components/work-orders/sections/WOGeneralSection'
import { WOServicesSection } from '@/components/work-orders/sections/WOServicesSection'
import { WOPartsSection } from '@/components/work-orders/sections/WOPartsSection'
import { WOLaborSection } from '@/components/work-orders/sections/WOLaborSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  workOrder: WorkOrder | WorkOrderFormValues
  woID: string
  isNew: boolean
}

export function WorkOrderFormClient({ workOrder, woID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useWorkOrder(woID)
  const { success, error } = useToastStore()

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema) as any,
    defaultValues: workOrder,
  })
  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Work Order saved', `${saved.documentNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/work-orders/${saved.woID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    const docNo = form.getValues('documentNo') || 'this work order'
    try {
      await remove()
      success('Deleted', `${docNo} has been removed.`)
      router.push('/fleet/work-orders')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const docNo = watch('documentNo')
  const title = isNew ? `${t('common.new')} ${t('nav.workOrders')}` : docNo || t('nav.workOrders')

  // services/parts/labor come from initial data (read-only display)
  const wo = workOrder as WorkOrder
  const tabs = [
    {
      id: 'general',
      label: t('form.general'),
      content: <WOGeneralSection form={form} isNew={isNew} />,
    },
    {
      id: 'services',
      label: `${t('form.services')} (${wo.services?.length ?? 0})`,
      content: <WOServicesSection services={wo.services} />,
    },
    {
      id: 'parts',
      label: `Parts (${wo.parts?.length ?? 0})`,
      content: <WOPartsSection parts={wo.parts} />,
    },
    {
      id: 'labor',
      label: `Labor (${wo.labor?.length ?? 0})`,
      content: <WOLaborSection labor={wo.labor} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new work order' : woID}
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
        title="Delete Work Order"
        message={`Delete "${docNo}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
