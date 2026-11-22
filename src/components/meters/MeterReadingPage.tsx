'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useT } from '@/i18n/I18nContext'
import { useCachedMeterReading, type MeterReadingView } from '@/lib/api/fleet/meters'

/**
 * A saved reading opens from the list's cached row: the API has no GET /meter-readings/{id} yet
 * (asked in replies/08). Opened directly (bookmark, reload), it asks to go through the list.
 */
export function MeterReadingPage({ id, listHref, render }: { id: string; listHref: string; render: (r: MeterReadingView) => ReactNode }) {
  const { t } = useT()
  const cached = useCachedMeterReading(id)
  if (cached.data) return <>{render(cached.data)}</>
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-sm text-gray-600">
      <p>{t('meter.openFromList')}</p>
      <Link href={listHref} className="text-blue-600 hover:underline">{t('meter.backToList')}</Link>
    </div>
  )
}
