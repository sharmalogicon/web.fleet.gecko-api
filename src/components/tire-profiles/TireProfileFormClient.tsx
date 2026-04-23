'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { TireProfile, TireProfileFormValues } from '@/types/tire-profile'
import { tireProfileSchema } from '@/types/tire-profile'
import { useTireProfile } from '@/lib/hooks/useTireProfile'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { GeneralSection } from '@/components/tire-profiles/sections/GeneralSection'
import { MileageSection } from '@/components/tire-profiles/sections/MileageSection'
import { PurchaseSection } from '@/components/tire-profiles/sections/PurchaseSection'
import { EquipmentSection } from '@/components/tire-profiles/sections/EquipmentSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  tireProfile: TireProfile
  tireProfileID: string
  isNew: boolean
}

export function TireProfileFormClient({ tireProfile, tireProfileID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useTireProfile(tireProfileID)
  const { success, error } = useToastStore()

  const form = useForm<TireProfileFormValues>({
    resolver: zodResolver(tireProfileSchema) as any,
    defaultValues: tireProfile,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, tireProfile)
      success('Tire profile saved', `${saved.serialNo} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/fleet/tires/profiles/${saved.tireProfileID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Tire profile has been removed.')
      router.push('/fleet/tires/profiles')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const serialNo = watch('serialNo')
  const title = isNew ? 'New Tire Profile' : serialNo || 'Tire Profile'

  const tabs = [
    {
      id: 'general',
      label: 'General',
      content: <GeneralSection form={form} isNew={isNew} />,
    },
    {
      id: 'mileage',
      label: 'Mileage & Recap',
      content: <MileageSection form={form} existing={tireProfile} />,
    },
    {
      id: 'purchase',
      label: 'Purchase Info',
      content: <PurchaseSection form={form} />,
    },
    {
      id: 'equipment',
      label: 'Equipment Installation',
      content: <EquipmentSection form={form} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Register a new tire' : `Profile ID: ${tireProfileID}`}
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
        title="Delete Tire Profile"
        message="Delete this tire profile? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
