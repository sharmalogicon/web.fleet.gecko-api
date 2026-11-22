'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { ServiceTypeFormValues } from '@/types/service-type'
import { serviceTypeSchema } from '@/types/service-type'
import { SERVICE_CATEGORY_LIST, SERVICE_TASK_API_TO_FORM, useSaveServiceType, type ServiceTypeView } from '@/lib/api/fleet/serviceTasks'
import { useCodeList } from '@/lib/api/fleet/setup'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { handleSaveError } from '@/lib/api/saveErrors'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
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
function ic(err?: boolean) { return `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${err ? 'border-red-400' : 'border-gray-300'}` }

interface Props { record: ServiceTypeFormValues; current?: ServiceTypeView; isNew: boolean }

export function ServiceTypeFormClient({ record, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const save = useSaveServiceType()
  const toast = useToastStore()
  const [banner, setBanner] = useState<string | null>(null)
  const categories = useCodeList(SERVICE_CATEGORY_LIST)
  // Writes need fleet.pm.manage tenant-wide (the catalogue is the tenant's).
  const canManage = useFleetAccess().canTenantWide('fleet.pm.manage')

  const form = useForm<ServiceTypeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(serviceTypeSchema) as any,
    defaultValues: record,
  })
  const { register, handleSubmit, formState: { errors, isDirty } } = form

  const handleSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await save.mutateAsync({ values, current })
      toast.success('Saved', `${saved.code} has been saved.`)
      if (isNew) router.push(`/fleet/service-types/${saved.id}`)
    } catch (err) {
      handleSaveError(err, { setError: form.setError, apiToForm: SERVICE_TASK_API_TO_FORM, setBanner, t, toast })
    }
  })

  const code = form.watch('code')
  const category = form.watch('serviceCategory')
  const title = isNew ? `${t('common.new')} ${t('nav.serviceTypes')}` : (code || t('nav.serviceTypes'))
  const options = (categories.data ?? []).filter((c) => c.isActive || c.code === category)

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div role="alert" className="sm:col-span-2 lg:col-span-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
      <Field label="Code *" error={errors.code?.message}>
        <input {...register('code')} disabled={!isNew} className={`${ic(!!errors.code)} ${!isNew ? 'bg-gray-50 text-gray-500' : ''}`} />
      </Field>
      <Field label="Category *" error={errors.serviceCategory?.message}>
        <select {...register('serviceCategory')} className={ic(!!errors.serviceCategory)}>
          <option value="">— Select —</option>
          {category && !options.some((c) => c.code === category) && <option value={category}>{category}</option>}
          {options.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>
      </Field>
      <Field label="Description *" error={errors.description?.message}>
        <input {...register('description')} className={ic(!!errors.description)} />
      </Field>
      <Field label="Est. Duration (hours)" error={errors.estimationDuration?.message}>
        <input type="number" step="0.5" {...register('estimationDuration')} className={ic(!!errors.estimationDuration)} />
      </Field>
      <Field label="Advance Notify (days)" error={errors.advanceNotifyDay?.message}>
        <input type="number" {...register('advanceNotifyDay')} className={ic(!!errors.advanceNotifyDay)} />
      </Field>
      <Field label="Advance Notify (km)" error={errors.advanceNotifyKM?.message}>
        <input type="number" {...register('advanceNotifyKM')} className={ic(!!errors.advanceNotifyKM)} />
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
    <FormLayout
      title={title}
      subtitle={isNew ? 'Define a new service type' : current?.code}
      tabs={[{ id: 'detail', label: t('common.details'), content }]}
      isNew={isNew}
      actions={
        <div className="flex items-center gap-2">
          {/* No delete in the API: untick Active instead (prompt 07). */}
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
          <button type="button" onClick={handleSave} disabled={save.isPending || !isDirty || !canManage} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{save.isPending ? t('common.loading') : t('common.save')}</button>
        </div>
      }
    />
  )
}
