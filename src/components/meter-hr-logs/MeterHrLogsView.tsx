'use client'

import { MeterReadingsListView } from '@/components/meters/MeterReadingsListView'
import { MeterReadingPage } from '@/components/meters/MeterReadingPage'
import { MeterHrLogFilters } from './MeterHrLogFilters'
import { MeterHrLogListClient } from './MeterHrLogListClient'
import { MeterHrLogFormClient } from './MeterHrLogFormClient'
import { useT } from '@/i18n/I18nContext'

/** Meter HR Logs = hour-meter readings (kind HOUR). */
export function MeterHrLogsListView({ equipment, dateFrom, dateTo }: { equipment: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  return (
    <MeterReadingsListView
      title={t('nav.meterHrLogs')}
      noun="meter hour log"
      newHref="/fleet/meter-hr-logs/new"
      kind="HOUR"
      search={equipment}
      from={dateFrom}
      to={dateTo}
      filters={<MeterHrLogFilters equipmentCode={equipment} dateFrom={dateFrom} dateTo={dateTo} />}
    >
      {(rows) => <MeterHrLogListClient data={rows} />}
    </MeterReadingsListView>
  )
}

export function MeterHrLogView({ id }: { id: string }) {
  if (id === 'new') return <MeterHrLogFormClient />
  return <MeterReadingPage id={id} listHref="/fleet/meter-hr-logs" render={(r) => <MeterHrLogFormClient reading={r} />} />
}
