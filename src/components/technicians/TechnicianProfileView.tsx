'use client'

import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useT } from '@/i18n/I18nContext'
import { useTechnician } from '@/lib/api/fleet/technicians'
import { useBranchContext } from '@/lib/api/platform/branches'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { NEW_TECHNICIAN_DEFAULTS } from '@/types/technician'
import { TechnicianProfileClient } from './TechnicianProfileClient'

export function TechnicianProfileView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const tech = useTechnician(isNew ? null : id)
  const { currentBranchId, isLoading: branchesLoading } = useBranchContext()

  const spinner = <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>

  if (isNew) {
    if (branchesLoading) return spinner
    // New = at the header's current branch (changeable on the form).
    return <TechnicianProfileClient key={currentBranchId ?? 'none'} technician={{ ...NEW_TECHNICIAN_DEFAULTS, branchId: currentBranchId ?? '' }} isNew />
  }
  if (tech.isLoading) return spinner
  if (tech.error instanceof ApiError && (tech.error.status === 404 || tech.error.status === 400)) notFound()
  if (tech.error || !tech.data) {
    return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(tech.error, t)}</div>
  }
  // Remount on a new rowVersion: after a save or a 409 the form shows the latest record.
  return <TechnicianProfileClient key={tech.data.rowVersion} technician={tech.data} current={tech.data} isNew={false} />
}
