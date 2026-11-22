'use client'

import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useT } from '@/i18n/I18nContext'
import { useAsset } from '@/lib/api/fleet/assets'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { NEW_EQUIPMENT_DEFAULTS } from '@/types/equipment'
import { EquipmentProfileClient } from './EquipmentProfileClient'

export function EquipmentProfileView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const asset = useAsset(isNew ? null : id)

  if (isNew) return <EquipmentProfileClient equipment={NEW_EQUIPMENT_DEFAULTS} isNew />
  if (asset.isLoading) {
    return <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>
  }
  if (asset.error instanceof ApiError && (asset.error.status === 404 || asset.error.status === 400)) notFound()
  if (asset.error || !asset.data) {
    return (
      <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
        {errorText(asset.error, t)}
      </div>
    )
  }
  // Remount on a new rowVersion: after a save or a 409 the form shows the latest record.
  return <EquipmentProfileClient key={asset.data.rowVersion} equipment={asset.data} current={asset.data} isNew={false} />
}
