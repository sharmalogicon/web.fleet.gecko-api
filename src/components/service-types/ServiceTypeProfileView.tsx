'use client'

import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useT } from '@/i18n/I18nContext'
import { useServiceTypeRecord } from '@/lib/api/fleet/serviceTasks'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { NEW_SERVICE_TYPE_DEFAULTS } from '@/types/service-type'
import { ServiceTypeFormClient } from './ServiceTypeFormClient'

export function ServiceTypeProfileView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const rec = useServiceTypeRecord(isNew ? null : id)
  if (isNew) return <ServiceTypeFormClient record={NEW_SERVICE_TYPE_DEFAULTS} isNew />
  if (rec.isLoading) return <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>
  if (rec.error instanceof ApiError && (rec.error.status === 404 || rec.error.status === 400)) notFound()
  if (rec.error || !rec.data) {
    return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(rec.error, t)}</div>
  }
  return <ServiceTypeFormClient key={rec.data.rowVersion} record={rec.data} current={rec.data} isNew={false} />
}
