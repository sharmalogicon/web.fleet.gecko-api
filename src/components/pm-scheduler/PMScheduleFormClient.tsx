'use client'

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  activeAssignments, PM_API_TO_FORM, pmFormSchema, useAssignPm, useEndAssignment, useSavePmProgram,
  type PmFormValues, type PmProgramDto,
} from '@/lib/api/fleet/pm'
import { SERVICE_CATEGORY_LIST, useServiceTypes } from '@/lib/api/fleet/serviceTasks'
import { useCodeList } from '@/lib/api/fleet/setup'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { handleSaveError } from '@/lib/api/saveErrors'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { AddEquipmentModal } from './AddEquipmentModal'
import { useT } from '@/i18n/I18nContext'

interface Props {
  schedule: PmFormValues
  current?: PmProgramDto
  isNew: boolean
}

const inputCls = 'px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500'
const labelCls = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

export function PMScheduleFormClient({ schedule, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const save = useSavePmProgram()
  const assign = useAssignPm()
  const endAssignment = useEndAssignment()
  const { canTenantWide } = useFleetAccess()
  const canManage = canTenantWide('fleet.pm.manage')
  const [showAddEquip, setShowAddEquip] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const categories = useCodeList(SERVICE_CATEGORY_LIST)
  const tasks = useServiceTypes({})

  const form = useForm<PmFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pmFormSchema) as any,
    defaultValues: schedule,
  })
  const { handleSubmit, register, watch, control, formState: { isDirty, errors } } = form
  const services = useFieldArray({ control, name: 'services' })
  const err = (m?: string) => (m ? <p className="text-xs text-red-500">{t(m)}</p> : null)

  const handleSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await save.mutateAsync({ values, current })
      toast.success('PM Schedule saved', `${saved.programCode} has been saved.`)
      if (isNew) router.push(`/fleet/pm-scheduler/${saved.pmProgramId}`)
    } catch (e) {
      handleSaveError(e, { setError: form.setError, apiToForm: PM_API_TO_FORM, setBanner, t, toast })
    }
  })

  const equipment = activeAssignments(current)
  const scheduleNo = watch('scheduleNo')
  const title = isNew ? `${t('common.new')} ${t('nav.pmScheduler')}` : scheduleNo || t('nav.pmScheduler')
  const taskOf = (id: string) => tasks.data?.find((x) => x.id === id)

  const tabs = [
    {
      id: 'details',
      label: t('form.schedule'),
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {banner && <div role="alert" className="sm:col-span-2 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Schedule No</label>
            {/* The program code: typed on create (no number series for it), fixed afterwards. */}
            <input {...register('scheduleNo')} readOnly={!isNew}
              className={`${inputCls} uppercase font-mono ${!isNew ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} placeholder="e.g. PM-10K" />
            {err(errors.scheduleNo?.message)}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Schedule Date</label>
            <input {...register('scheduleDate')} type="date" className={inputCls} />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className={labelCls}>Service Type Description</label>
            <input {...register('serviceTypeDescription')} className={inputCls} placeholder="e.g. 10,000 KM Preventive Maintenance" />
            {err(errors.serviceTypeDescription?.message)}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Service Type Code</label>
            <input {...register('serviceType')} list="pm-categories" className={`${inputCls} font-mono uppercase`} placeholder="e.g. SVC-008" />
            <datalist id="pm-categories">
              {categories.data?.filter((c) => c.isActive).map((c) => <option key={c.code} value={c.code}>{c.descriptionEn}</option>)}
            </datalist>
            {err(errors.serviceType?.message)}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Meter / KM Interval</label>
            <input {...register('meterKm')} type="number" className={inputCls} placeholder="e.g. 10000" />
            {err(errors.meterKm?.message)}
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className={labelCls}>Remarks</label>
            <textarea {...register('remarks')} rows={3} className={`${inputCls} resize-none`} placeholder="Additional notes…" />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <input {...register('isActive')} type="checkbox" id="isActive" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active Schedule</label>
          </div>
        </div>
      ),
    },
    {
      id: 'equipment',
      label: `Equipment (${equipment.length})`,
      content: (
        <div>
          <div className="flex justify-end items-center gap-3 mb-3">
            {isNew && <span className="text-xs text-gray-400">{t('pm.saveFirst')}</span>}
            <button
              type="button"
              onClick={() => setShowAddEquip(true)}
              disabled={isNew || assign.isPending}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              + Add Equipment
            </button>
          </div>
          {equipment.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No equipment assigned</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Code', 'Reg No', 'Category', t('pm.from'), t('pm.to'), ''].map((h) => (
                      <th key={h || 'x'} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((eq) => (
                    <tr key={eq.pmAssignmentId} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 font-semibold">{eq.assetCode}</td>
                      <td className="px-3 py-2 text-gray-700">{eq.registrationNo || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{eq.assetClass || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{eq.activeFrom}</td>
                      <td className="px-3 py-2 text-gray-400">{eq.activeTo ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={endAssignment.isPending}
                          onClick={() =>
                            endAssignment.mutate(eq, {
                              onSuccess: () => toast.success(t('pm.removed'), eq.assetCode),
                              onError: (e) => toast.error(t('common.saveFailed'), errorText(e, t)),
                            })
                          }
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          {t('pm.remove')}
                        </button>
                      </td>
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
      label: `${t('form.services')} (${services.fields.length})`,
      content: (
        <LineItemsEditor
          items={services.fields}
          getKey={(f) => f.id}
          columns={[
            {
              id: 'code',
              header: 'Code',
              className: 'w-64',
              cell: (_f, i) => (
                <select {...register(`services.${i}.serviceTaskId`)} aria-label={`Code ${i + 1}`} className={`${inputCls} w-full font-mono`}>
                  <option value="">— Select —</option>
                  {tasks.data?.filter((x) => x.isActive || x.id === watch(`services.${i}.serviceTaskId`)).map((x) => (
                    <option key={x.id} value={x.id}>{x.code}</option>
                  ))}
                </select>
              ),
            },
            {
              id: 'description',
              header: 'Description',
              cell: (_f, i) => <span className="text-gray-700 text-sm">{taskOf(watch(`services.${i}.serviceTaskId`))?.description ?? '—'}</span>,
            },
            {
              id: 'interval',
              header: 'Meter Interval',
              className: 'w-40',
              cell: (_f, i) => <input type="number" {...register(`services.${i}.meterInterval`)} aria-label={`Meter Interval ${i + 1}`} className={`${inputCls} w-full`} placeholder="km" />,
            },
            {
              id: 'remarks',
              header: 'Remarks',
              cell: (_f, i) => <input {...register(`services.${i}.remarks`)} aria-label={`Remarks ${i + 1}`} className={`${inputCls} w-full`} />,
            },
          ]}
          onAdd={() => services.append({ serviceTaskId: '', meterInterval: undefined, remarks: '' })}
          onRemove={services.remove}
          addLabel={t('pm.addService')}
          removeLabel={t('pm.removeService')}
          emptyText="No service lines added"
          rowError={(i) => {
            const m = errors.services?.[i]?.serviceTaskId?.message ?? errors.services?.[i]?.meterInterval?.message
            return m ? t(m) : undefined
          }}
          error={errors.services?.message ? t(errors.services.message) : undefined}
        />
      ),
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new PM schedule' : current?.nameEn}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {/* No delete in the API: untick Active instead (prompt 08). */}
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={save.isPending || !isDirty || !canManage}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {save.isPending ? t('common.loading') : t('common.save')}
            </button>
          </div>
        }
      />
      {current && (
        <AddEquipmentModal
          open={showAddEquip}
          onClose={() => setShowAddEquip(false)}
          onAdd={(eq) =>
            assign.mutate(
              { programId: current.pmProgramId, assetProfileIds: [eq.id] },
              {
                onSuccess: () => toast.success(t('pm.assigned'), eq.code),
                onError: (e) => toast.error(t('common.saveFailed'), errorText(e, t)),
              },
            )
          }
          alreadyAddedCodes={equipment.map((e) => e.assetCode)}
        />
      )}
    </>
  )
}
