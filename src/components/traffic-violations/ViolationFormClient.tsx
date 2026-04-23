'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { TrafficViolation, TrafficViolationFormValues, ViolationType } from '@/types/traffic-violation'
import { trafficViolationSchema, VIOLATION_TYPE_MAP } from '@/types/traffic-violation'
import { useTrafficViolation } from '@/lib/hooks/useTrafficViolation'
import { useToastStore } from '@/lib/stores/useToastStore'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useT } from '@/i18n/I18nContext'

const VIOLATION_TYPES: ViolationType[] = ['SPEEDING', 'PARKING', 'RED_LIGHT', 'NO_SEATBELT', 'OTHER']

interface Props {
  violation: TrafficViolation
  violationID: string
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

export function ViolationFormClient({ violation, violationID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useTrafficViolation(violationID)
  const { success, error } = useToastStore()

  const form = useForm<TrafficViolationFormValues>({
    resolver: zodResolver(trafficViolationSchema) as any,
    defaultValues: violation,
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Traffic violation saved', `${saved.ticketNo} has been saved.`)
      form.reset({ ...saved })
      if (isNew) router.push(`/fleet/traffic-violations/${saved.violationID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Traffic violation has been removed.')
      router.push('/fleet/traffic-violations')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const ticketNo = watch('ticketNo')
  const title = isNew ? `${t('common.new')} ${t('nav.trafficViolations')}` : ticketNo || t('nav.trafficViolations')

  return (
    <>
      <div className="flex flex-col gap-0 min-h-full">
        <div className="flex items-start justify-between gap-4 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isNew ? 'Record a new traffic violation' : `Violation ID: ${violationID}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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
        </div>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Violation Details
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Ticket No. *" error={errors.ticketNo?.message}>
                <input
                  {...register('ticketNo')}
                  disabled={!isNew}
                  className={ic(!isNew)}
                  placeholder="e.g. TV-2024-001"
                />
              </Field>

              <Field label="Violation Date *" error={errors.violationDate?.message}>
                <input
                  type="date"
                  {...register('violationDate')}
                  className={ic()}
                />
              </Field>

              <Field label="Equipment Code">
                <input
                  {...register('equipmentCode')}
                  className={ic()}
                  placeholder="e.g. EQ-001"
                />
              </Field>

              <Field label="Driver Name">
                <input
                  {...register('driverName')}
                  className={ic()}
                  placeholder="Driver name"
                />
              </Field>

              <Field label="Driver ID">
                <input
                  {...register('driverID')}
                  className={ic()}
                  placeholder="e.g. DRV-001"
                />
              </Field>

              <Field label="Violation Type *" error={errors.violationType?.message}>
                <select {...register('violationType')} className={ic()}>
                  {VIOLATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {VIOLATION_TYPE_MAP[t]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Type Description">
                <input
                  {...register('violationTypeDescription')}
                  className={ic()}
                  placeholder="Brief description of the violation"
                />
              </Field>

              <Field label="Violation Amount (฿) *" error={errors.violationAmount?.message}>
                <input
                  type="number"
                  step="0.01"
                  {...register('violationAmount', { valueAsNumber: true })}
                  className={ic()}
                  placeholder="0"
                />
              </Field>

              <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Remarks</label>
                <textarea
                  {...register('remarks')}
                  rows={3}
                  className={`${ic()} resize-none`}
                  placeholder="Additional remarks…"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete Traffic Violation"
        message="Delete this traffic violation record? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
