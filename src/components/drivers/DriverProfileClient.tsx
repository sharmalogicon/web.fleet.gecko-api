'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { DriverFormValues } from '@/types/driver'
import { driverSchema } from '@/types/driver'
import { mapFieldErrors, PERSONAL_FIELDS, TRUCKING_OWNED_FIELDS, useSaveDriver, type DriverView } from '@/lib/api/fleet/drivers'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { GeneralSection } from '@/components/drivers/sections/GeneralSection'
import { LicenseSection } from '@/components/drivers/sections/LicenseSection'
import { EmergencyContactSection } from '@/components/drivers/sections/EmergencyContactSection'
import { useT } from '@/i18n/I18nContext'

const STRINGS = {
  saveSuccess: 'Driver saved',
  saveSuccessMsg: (name: string) => `${name} has been saved.`,
  saveError: 'Save failed',
} as const

interface DriverProfileClientProps {
  driver: DriverFormValues
  /** The loaded record (absent for "new"). */
  current?: DriverView
  isNew: boolean
  /** New FLEET driver: the header's current branch. */
  branchId?: string | null
  /** Why the personal fields are empty (no permission, Trucking unreachable). */
  personalNote?: string | null
}

export function DriverProfileClient({ driver, current, isNew, branchId, personalNote }: DriverProfileClientProps) {
  const { t } = useT()
  const router = useRouter()
  const saveDriver = useSaveDriver()
  const isSaving = saveDriver.isPending
  const { success, error, warning } = useToastStore()
  const [banner, setBanner] = useState<string | null>(null)
  const driverID = current?.id ?? 'new'

  // Personal data is Trucking's (always read-only); a TRUCKING driver's identity too; rates when hidden.
  const locked = new Set<string>([
    ...PERSONAL_FIELDS,
    ...(current?.isTrucking ? TRUCKING_OWNED_FIELDS : []),
    ...(current?.ratesHidden ? ['standardRate', 'overtimeRate'] : []),
  ])

  // zodResolver with a .refine() schema produces a branded output type;
  // casting to DriverFormValues here is safe because the schema's base shape matches.
  const form = useForm<DriverFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(driverSchema) as any,
    defaultValues: driver,
  })

  const { handleSubmit, formState: { isDirty } } = form

  const handleSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await saveDriver.mutateAsync({ values, current, branchId })
      success(STRINGS.saveSuccess, STRINGS.saveSuccessMsg(saved.driverName))
      if (isNew) router.push(`/master/drivers/${saved.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // A stale rowVersion (the record is reloaded) or a fuel card that belongs to another driver.
        warning(t('equipment.conflict'), errorText(err, t))
        return
      }
      if (err instanceof ApiError && err.status === 400) {
        const { fields, other } = mapFieldErrors(err.fieldMap)
        for (const [name, message] of Object.entries(fields)) form.setError(name as keyof DriverFormValues, { message })
        setBanner(other.length ? other.join(' ') : Object.keys(fields).length ? null : errorText(err, t))
        error(STRINGS.saveError, t('equipment.checkFields'))
        return
      }
      setBanner(errorText(err, t))
      error(STRINGS.saveError, errorText(err, t))
    }
  })

  const driverName = form.watch('driverName')
  const title = isNew ? `${t('common.new')} ${t('nav.drivers')}` : driverName || t('nav.drivers')

  const tabs = [
    {
      id: 'general',
      label: t('form.general'),
      content: (
        <>
          {banner && <div role="alert" className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
          {personalNote && <p className="mb-4 text-xs text-gray-500">{personalNote}</p>}
          <GeneralSection form={form} locked={locked} />
        </>
      ),
    },
    { id: 'license', label: t('form.license'), content: <LicenseSection form={form} locked={locked} /> },
    { id: 'emergency', label: t('form.emergency'), content: <EmergencyContactSection form={form} locked={locked} /> },
  ]

  return (
    <FormLayout
      title={title}
      subtitle={isNew ? 'Create a new driver record' : current?.driverCode}
      titleBadge={current?.isTrucking && (
        <span title={t('driver.fromTruckingHint')} className="inline-flex px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium">
          {t('driver.fromTrucking')}
        </span>
      )}
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
          {/* No delete in the API: a driver who leaves is set Inactive (prompt 05). */}
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
