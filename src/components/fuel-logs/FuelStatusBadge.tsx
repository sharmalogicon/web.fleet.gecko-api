'use client'

import { FUEL_STATUS_TONE } from '@/lib/api/fleet/fuelLogs'
import { useT } from '@/i18n/I18nContext'

/** The API's fuel log status in the list / form status spot. */
export function FuelStatusBadge({ status }: { status: string }) {
  const { t } = useT()
  const label = t(`fuel.status.${status}`)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${FUEL_STATUS_TONE[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label.startsWith('fuel.') ? status : label}
    </span>
  )
}
