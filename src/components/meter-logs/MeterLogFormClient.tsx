'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { MeterLog, MeterLogFormValues } from '@/types/meter-log'
import { meterLogSchema, METER_TYPE_OPTIONS } from '@/types/meter-log'
import { useMeterLog } from '@/lib/hooks/useMeterLog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useT } from '@/i18n/I18nContext'

interface Props {
  meterLog: MeterLog | MeterLogFormValues
  meterLogID: string
  isNew: boolean
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function ic(ro?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${
    ro
      ? 'bg-gray-50 text-gray-500 border-gray-200'
      : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
  }`
}

export function MeterLogFormClient({ meterLog, meterLogID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useMeterLog(meterLogID)
  const { success, error } = useToastStore()

  const form = useForm<MeterLogFormValues>({
    resolver: zodResolver(meterLogSchema) as any,
    defaultValues: meterLog,
  })

  const {
    handleSubmit,
    register,
    watch,
    formState: { errors, isDirty },
  } = form

  const meterType = watch('meterType')
  const equipmentCode = watch('equipmentCode')
  const showHourMeter = meterType === 'HOUR' || meterType === 'BOTH'

  const title = isNew
    ? `${t('common.new')} ${t('nav.meterLogs')}`
    : equipmentCode || t('nav.meterLogs')

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Meter log saved', `${saved.equipmentCode} meter log has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/meter-logs/${saved.meterLogID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    const label = (meterLog as MeterLog).meterLogID
      ? `ML-${(meterLog as MeterLog).meterLogID}`
      : 'this meter log'
    try {
      await remove()
      success('Deleted', `${label} has been removed.`)
      router.push('/fleet/meter-logs')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const tabs = [
    {
      id: 'meter-reading',
      label: t('form.meterReading'),
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Equipment Code *" error={errors.equipmentCode?.message}>
            <input
              {...register('equipmentCode')}
              className={ic()}
              placeholder="e.g. EQ-001"
            />
          </Field>

          <Field label="Meter Update Date *" error={errors.meterUpdateDate?.message}>
            <input type="date" {...register('meterUpdateDate')} className={ic()} />
          </Field>

          <Field label="Meter Type *" error={errors.meterType?.message}>
            <select {...register('meterType')} className={ic()}>
              {METER_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Meter Reading (km) *" error={errors.meterRead?.message}>
            <input
              type="number"
              step="1"
              min="0"
              {...register('meterRead')}
              className={ic()}
              placeholder="odometer km"
            />
          </Field>

          {showHourMeter && (
            <Field label="Hour Meter (hrs)" error={errors.hourMeter?.message}>
              <input
                type="number"
                step="0.1"
                min="0"
                {...register('hourMeter')}
                className={ic()}
                placeholder="engine hours"
              />
            </Field>
          )}

          <Field label="Driver Name">
            <input {...register('driverName')} className={ic()} placeholder="Driver full name" />
          </Field>

          <Field label="Total Distance (km)">
            <input
              type="number"
              step="1"
              min="0"
              {...register('totalDistance')}
              className={ic()}
              placeholder="total km"
            />
          </Field>

          <Field label="Remarks">
            <textarea
              {...register('remarks')}
              rows={3}
              className={`${ic()} resize-none`}
              placeholder="Optional notes…"
            />
          </Field>
        </div>
      ),
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new meter log entry' : meterLogID}
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
        title="Delete Meter Log"
        message="Delete this meter log? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
