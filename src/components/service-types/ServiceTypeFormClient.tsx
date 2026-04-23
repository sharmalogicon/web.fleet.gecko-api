'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { ServiceType, ServiceTypeFormValues } from '@/types/service-type'
import { serviceTypeSchema, SERVICE_CATEGORIES } from '@/types/service-type'
import { useServiceType } from '@/lib/hooks/useServiceType'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useT } from '@/i18n/I18nContext'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
function ic(err?: boolean) { return `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-400' : 'border-gray-300'}` }

interface Props { record: ServiceType | ServiceTypeFormValues; recordID: string; isNew: boolean }

export function ServiceTypeFormClient({ record, recordID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useServiceType(recordID)
  const { success, error } = useToastStore()

  const form = useForm<ServiceTypeFormValues>({
    resolver: zodResolver(serviceTypeSchema) as any,
    defaultValues: record,
  })
  const { register, handleSubmit, formState: { errors, isDirty } } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Saved', `${saved.code} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/service-types/${saved.serviceTypeID}`)
    } catch { error('Save failed', 'An error occurred.') }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Service type has been removed.')
      router.push('/fleet/service-types')
    } catch { error('Delete failed', 'An error occurred.') }
    finally { setShowDelete(false) }
  }

  const code = form.watch('code')
  const title = isNew ? `${t('common.new')} ${t('nav.serviceTypes')}` : (code || t('nav.serviceTypes'))

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Code *" error={errors.code?.message}>
        <input {...register('code')} disabled={!isNew} className={`${ic(!!errors.code)} ${!isNew ? 'bg-gray-50 text-gray-500' : ''}`} />
      </Field>
      <Field label="Category *" error={errors.serviceCategory?.message}>
        <select {...register('serviceCategory')} className={ic(!!errors.serviceCategory)}>
          <option value="">— Select —</option>
          {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Description *" error={errors.description?.message}>
        <input {...register('description')} className={ic(!!errors.description)} />
      </Field>
      <Field label="Est. Duration (hours)">
        <input type="number" step="0.5" {...register('estimationDuration')} className={ic()} />
      </Field>
      <Field label="Advance Notify (days)">
        <input type="number" {...register('advanceNotifyDay')} className={ic()} />
      </Field>
      <Field label="Advance Notify (km)">
        <input type="number" {...register('advanceNotifyKM')} className={ic()} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('isActive')} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          <span className="text-sm text-gray-700">Active</span>
        </label>
      </div>
    </div>
  )

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Define a new service type' : recordID}
        tabs={[{ id: 'detail', label: t('common.details'), content }]}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && <button type="button" onClick={() => setShowDelete(true)} disabled={isDeleting} className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">{isDeleting ? t('common.loading') : t('common.delete')}</button>}
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
            <button type="button" onClick={handleSave} disabled={isSaving || !isDirty} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? t('common.loading') : t('common.save')}</button>
          </div>
        }
      />
      <ConfirmDialog open={showDelete} title="Delete Service Type" message={`Delete "${code}"? This cannot be undone.`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setShowDelete(false)} destructive />
    </>
  )
}
