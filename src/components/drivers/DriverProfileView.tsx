'use client'

import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useT } from '@/i18n/I18nContext'
import { personalValues, useDriver, useDriverPersonal } from '@/lib/api/fleet/drivers'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { NEW_DRIVER_DEFAULTS } from '@/types/driver'
import { DriverProfileClient } from './DriverProfileClient'

export function DriverProfileView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const driver = useDriver(isNew ? null : id)
  const { canAt, canTenantWide, isLoading: accessLoading } = useFleetAccess()
  const { currentBranchId } = useBranchContext()

  // Personal data: only with fleet.people.manage at the driver's branch (a pool driver: tenant-wide), only on this form.
  const d = driver.data
  const mayManage = !!d && (d.branchId ? canAt('fleet.people.manage', d.branchId) : canTenantWide('fleet.people.manage'))
  const mayReadPersonal = !!d && d.isTrucking && mayManage
  const personal = useDriverPersonal(isNew ? null : id, mayReadPersonal)

  const spinner = <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>

  if (isNew) return <DriverProfileClient driver={NEW_DRIVER_DEFAULTS} isNew branchId={currentBranchId} />
  if (driver.isLoading || accessLoading || (mayReadPersonal && personal.isLoading)) return spinner
  if (driver.error instanceof ApiError && (driver.error.status === 404 || driver.error.status === 400)) notFound()
  if (driver.error || !d) {
    return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(driver.error, t)}</div>
  }

  const note = personal.error
    ? `${t('driver.personalFailed')} ${errorText(personal.error, t)}`
    : d.isTrucking && !mayReadPersonal
      ? t('driver.personalHidden')
      : null

  return (
    <DriverProfileClient
      key={d.rowVersion}
      driver={{ ...d, ...personalValues(personal.data, t('driver.onFileInTrucking')) }}
      current={d}
      isNew={false}
      personalNote={note}
    />
  )
}
