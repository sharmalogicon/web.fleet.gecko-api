'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/shared/FormLayout'
import { useT } from '@/i18n/I18nContext'
import { mapFieldErrors, useSaveTechnician, type TechnicianView } from '@/lib/api/fleet/technicians'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { technicianSchema, type TechnicianFormValues } from '@/types/technician'
import { GeneralSection } from './sections/GeneralSection'
import { RatesSection } from './sections/RatesSection'
import { SkillsSection } from './sections/SkillsSection'

interface Props {
  technician: TechnicianFormValues
  current?: TechnicianView
  isNew: boolean
}

/** Same layout as the Driver profile (FormLayout sections, header actions). No delete: set INACTIVE instead. */
export function TechnicianProfileClient({ technician, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const save = useSaveTechnician()
  const { success, error, warning } = useToastStore()
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<TechnicianFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(technicianSchema) as any,
    defaultValues: technician,
  })
  const { handleSubmit, formState: { isDirty } } = form

  const handleSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await save.mutateAsync({ values, current })
      success(t('technician.saved'), `${saved.fullName} (${saved.technicianCode})`)
      if (isNew) router.push(`/master/technicians/${saved.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        warning(t('technician.conflict'), errorText(err, t))
        return
      }
      if (err instanceof ApiError && err.status === 400) {
        const { fields, other } = mapFieldErrors(err.fieldMap)
        for (const [name, message] of Object.entries(fields)) form.setError(name as keyof TechnicianFormValues, { message })
        setBanner(other.length ? other.join(' ') : Object.keys(fields).length ? null : errorText(err, t))
        error(t('technician.saveFailed'), t('equipment.checkFields'))
        return
      }
      setBanner(errorText(err, t))
      error(t('technician.saveFailed'), errorText(err, t))
    }
  })

  const fullName = form.watch('fullName')
  const title = isNew ? `${t('common.new')} ${t('nav.technicians')}` : fullName || t('nav.technicians')

  const tabs = [
    {
      id: 'general',
      label: t('form.general'),
      content: (
        <>
          {banner && <div role="alert" className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
          <GeneralSection form={form} current={current} />
        </>
      ),
    },
    { id: 'rates', label: t('technician.rates'), content: <RatesSection form={form} current={current} /> },
    { id: 'skills', label: t('technician.skills'), content: <SkillsSection form={form} /> },
  ]

  return (
    <FormLayout
      title={title}
      subtitle={isNew ? t('technician.newSubtitle') : current?.technicianCode}
      tabs={tabs}
      isNew={isNew}
      actions={
        <div className="flex items-center gap-2">
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
            disabled={save.isPending || !isDirty}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {save.isPending ? t('common.loading') : t('common.save')}
          </button>
        </div>
      }
    />
  )
}
