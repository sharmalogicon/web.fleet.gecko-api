'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Driver, DriverFormValues } from '@/types/driver'
import { driverSchema } from '@/types/driver'
import { useDriver } from '@/lib/hooks/useDriver'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { GeneralSection } from '@/components/drivers/sections/GeneralSection'
import { LicenseSection } from '@/components/drivers/sections/LicenseSection'
import { EmergencyContactSection } from '@/components/drivers/sections/EmergencyContactSection'
import { useT } from '@/i18n/I18nContext'

const STRINGS = {
  newTitle: 'New Driver',
  editTitle: (name: string) => name || 'Driver Profile',
  saveSuccess: 'Driver saved',
  saveSuccessMsg: (name: string) => `${name} has been saved.`,
  saveError: 'Save failed',
  saveErrorMsg: 'An error occurred. Please try again.',
  deleteTitle: 'Delete Driver',
  deleteMessage: (name: string) => `Are you sure you want to delete "${name}"? This action cannot be undone.`,
  deleteSuccess: 'Driver deleted',
  deleteSuccessMsg: (name: string) => `${name} has been removed.`,
  deleteFailed: 'Delete failed',
  deleteFailedMsg: 'An error occurred. Please try again.',
} as const

interface DriverProfileClientProps {
  driver: Driver | DriverFormValues
  driverID: string
  isNew: boolean
}

export function DriverProfileClient({ driver, driverID, isNew }: DriverProfileClientProps) {
  const { t } = useT()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useDriver(driverID)
  const { success, error } = useToastStore()

  // zodResolver with a .refine() schema produces a branded output type;
  // casting to DriverFormValues here is safe because the schema's base shape matches.
  const form = useForm<DriverFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(driverSchema) as any,
    defaultValues: driver as DriverFormValues,
  })

  const { handleSubmit, formState: { isDirty } } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success(STRINGS.saveSuccess, STRINGS.saveSuccessMsg(saved.driverName))
      form.reset(saved)
      if (isNew) router.push(`/master/drivers/${saved.driverID}`)
    } catch {
      error(STRINGS.saveError, STRINGS.saveErrorMsg)
    }
  })

  const handleDelete = async () => {
    const name = form.getValues('driverName')
    try {
      await remove()
      success(STRINGS.deleteSuccess, STRINGS.deleteSuccessMsg(name))
      router.push('/master/drivers')
    } catch {
      error(STRINGS.deleteFailed, STRINGS.deleteFailedMsg)
    } finally {
      setShowDeleteDialog(false)
    }
  }

  const driverName = form.watch('driverName')
  const title = isNew ? STRINGS.newTitle : STRINGS.editTitle(driverName)

  const tabs = [
    { id: 'general', label: 'General', content: <GeneralSection form={form} /> },
    { id: 'license', label: 'License', content: <LicenseSection form={form} /> },
    { id: 'emergency', label: 'Emergency Contact', content: <EmergencyContactSection form={form} /> },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new driver record' : driverID}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && (
              <Link
                href={`/master/drivers/${driverID}/images`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline px-2 py-2"
              >
                📷 View Photos
              </Link>
            )}
            {!isNew && (
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
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
        open={showDeleteDialog}
        title={STRINGS.deleteTitle}
        message={STRINGS.deleteMessage(form.getValues('driverName'))}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        destructive
      />
    </>
  )
}
