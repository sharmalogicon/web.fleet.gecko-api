'use client'

import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useT } from '@/i18n/I18nContext'
import { useTransporter } from '@/lib/api/platform/suppliers'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { NEW_TRANSPORTER_DEFAULTS } from '@/types/transporter'
import { TransporterFormClient } from './TransporterFormClient'

export function TransporterProfileView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const tr = useTransporter(isNew ? null : id)

  if (isNew) return <TransporterFormClient transporter={NEW_TRANSPORTER_DEFAULTS} isNew />
  if (tr.isLoading) return <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>
  if (tr.error instanceof ApiError && tr.error.status === 404) notFound()
  if (tr.error || !tr.data) {
    return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(tr.error, t)}</div>
  }
  return <TransporterFormClient key={`${tr.data.dto.rowVersion}:${tr.data.dto.partyRowVersion}`} transporter={tr.data} current={tr.data} isNew={false} />
}
