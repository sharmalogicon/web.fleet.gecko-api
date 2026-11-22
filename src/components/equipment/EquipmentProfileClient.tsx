'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { EquipmentFormValues } from '@/types/equipment'
import { equipmentSchema } from '@/types/equipment'
import { mapFieldErrors, useSaveAsset, type AssetView } from '@/lib/api/fleet/assets'
import { useBranchContext } from '@/lib/api/platform/branches'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { GeneralSection } from '@/components/equipment/sections/GeneralSection'
import { SpecSection } from '@/components/equipment/sections/SpecSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  equipment: EquipmentFormValues
  /** The loaded record (absent for "new"). */
  current?: AssetView
  isNew: boolean
}

export function EquipmentProfileClient({ equipment, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const { currentBranchId } = useBranchContext()
  const saveAsset = useSaveAsset()
  const { success, error, warning } = useToastStore()
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<EquipmentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(equipmentSchema) as any,
    defaultValues: equipment,
  })

  const { handleSubmit, formState: { isDirty } } = form
  const isSaving = saveAsset.isPending

  const handleSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await saveAsset.mutateAsync({ values, current, branchId: currentBranchId })
      success('Equipment saved', `${saved.code} has been saved.`)
      if (isNew) router.push(`/master/equipment/${saved.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // The record is refetched (useSaveAsset) and the form remounts with the latest version.
        warning(t('equipment.conflict'), errorText(err, t))
        return
      }
      if (err instanceof ApiError && err.status === 400) {
        const { fields, other } = mapFieldErrors(err.fieldMap)
        for (const [name, message] of Object.entries(fields)) form.setError(name as keyof EquipmentFormValues, { message })
        if (other.length) setBanner(other.join(' '))
        else if (!Object.keys(fields).length) setBanner(errorText(err, t))
        error('Save failed', t('equipment.checkFields'))
        return
      }
      setBanner(errorText(err, t))
      error('Save failed', errorText(err, t))
    }
  })

  const code = form.watch('code')
  const title = isNew ? `${t('common.new')} ${t('nav.equipment')}` : code || t('nav.equipment')
  const linked = !!current?.isLinked

  const tabs = [
    {
      id: 'general',
      label: t('form.general'),
      content: (
        <>
          {banner && (
            <div role="alert" className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>
          )}
          <GeneralSection form={form} isNew={isNew} linked={linked} />
        </>
      ),
    },
    { id: 'spec', label: t('form.specifications'), content: <SpecSection form={form} /> },
  ]

  return (
    <FormLayout
      title={title}
      subtitle={isNew ? 'Register new equipment' : current?.registrationNo || current?.code}
      tabs={tabs}
      isNew={isNew}
      actions={
        <div className="flex items-center gap-2">
          {!isNew && (
            // The asset register has no delete: an asset is switched off (Inactive / Disposed) instead.
            <button
              type="button"
              disabled
              title={t('equipment.noDelete')}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 opacity-40 cursor-not-allowed"
            >
              {t('common.delete')}
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
  )
}
