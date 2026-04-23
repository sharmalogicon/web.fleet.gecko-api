'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { PMSchedule, PMSchedulerFormValues, PMEquipment } from '@/types/pm-scheduler'
import { pmSchedulerSchema } from '@/types/pm-scheduler'
import { usePMSchedule } from '@/lib/hooks/usePMSchedule'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AddEquipmentModal } from './AddEquipmentModal'
import type { Equipment } from '@/types/equipment'
import { useT } from '@/i18n/I18nContext'

interface Props {
  schedule: PMSchedule | PMSchedulerFormValues
  pmID: string
  isNew: boolean
}

export function PMScheduleFormClient({ schedule, pmID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const [showAddEquip, setShowAddEquip] = useState(false)
  const [localEquipment, setLocalEquipment] = useState<PMEquipment[]>(
    (schedule as PMSchedule).equipment ?? [],
  )
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = usePMSchedule(pmID)
  const { success, error } = useToastStore()

  const form = useForm<PMSchedulerFormValues>({
    resolver: zodResolver(pmSchedulerSchema) as any,
    defaultValues: schedule,
  })
  const {
    handleSubmit,
    register,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('PM Schedule saved', `${saved.scheduleNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/pm-scheduler/${saved.pmID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    const label = form.getValues('scheduleNo') || 'this schedule'
    try {
      await remove()
      success('Deleted', `${label} has been removed.`)
      router.push('/fleet/pm-scheduler')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const handleAddEquipment = (eq: Equipment) => {
    const nextID = Date.now()
    const newEntry: PMEquipment = {
      pmEquipmentID: nextID,
      equipmentCode: eq.code,
      registrationNo: eq.registrationNo,
      category: eq.category,
      brand: eq.brand,
      customerName: eq.customerName,
    }
    setLocalEquipment((prev) => [...prev, newEntry])
  }

  const scheduleNo = watch('scheduleNo')
  const title = isNew ? `${t('common.new')} ${t('nav.pmScheduler')}` : scheduleNo || t('nav.pmScheduler')

  const pm = schedule as PMSchedule

  const tabs = [
    {
      id: 'details',
      label: t('form.schedule'),
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Schedule No
            </label>
            <input
              {...register('scheduleNo')}
              readOnly
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="Auto-generated"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Schedule Date
            </label>
            <input
              {...register('scheduleDate')}
              type="date"
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Service Type Description
            </label>
            <input
              {...register('serviceTypeDescription')}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 10,000 KM Preventive Maintenance"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Service Type Code
            </label>
            <input
              {...register('serviceType')}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="e.g. SVC-008"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Meter / KM Interval
            </label>
            <input
              {...register('meterKm')}
              type="number"
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 10000"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Remarks
            </label>
            <textarea
              {...register('remarks')}
              rows={3}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Additional notes…"
            />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              {...register('isActive')}
              type="checkbox"
              id="isActive"
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active Schedule
            </label>
          </div>
        </div>
      ),
    },
    {
      id: 'equipment',
      label: `Equipment (${localEquipment.length})`,
      content: (
        <div>
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => setShowAddEquip(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + Add Equipment
            </button>
          </div>
          {localEquipment.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No equipment assigned</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Code', 'Reg No', 'Category', 'Brand', 'Customer'].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {localEquipment.map((eq) => (
                    <tr key={eq.pmEquipmentID} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 font-semibold">
                        {eq.equipmentCode}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{eq.registrationNo || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{eq.category || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{eq.brand || '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{eq.customerName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'services',
      label: `${t('form.services')} (${pm.services?.length ?? 0})`,
      content:
        !pm.services || pm.services.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No service lines added</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Code', 'Description', 'Meter Interval', 'Remarks'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pm.services.map((s) => (
                  <tr key={s.pmServiceLineID} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{s.serviceType}</td>
                    <td className="px-3 py-2 text-gray-700">{s.serviceTypeDescription}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {s.meterInterval != null ? `${s.meterInterval.toLocaleString()} km` : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-400">{s.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new PM schedule' : pmID}
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
        title="Delete PM Schedule"
        message={`Delete "${scheduleNo}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
      <AddEquipmentModal
        open={showAddEquip}
        onClose={() => setShowAddEquip(false)}
        onAdd={handleAddEquipment}
        alreadyAddedCodes={localEquipment.map((e) => e.equipmentCode)}
      />
    </>
  )
}
