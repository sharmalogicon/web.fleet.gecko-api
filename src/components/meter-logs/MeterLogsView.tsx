'use client'

import { MeterReadingsListView } from '@/components/meters/MeterReadingsListView'
import { MeterReadingPage } from '@/components/meters/MeterReadingPage'
import { MeterLogFilters } from './MeterLogFilters'
import { MeterLogListClient } from './MeterLogListClient'
import { MeterLogFormClient } from './MeterLogFormClient'
import { useT } from '@/i18n/I18nContext'

interface ListProps {
  equipment: string
  meterType: string
  dateFrom: string
  dateTo: string
}

/** Meter Logs = odometer readings (kind KM). The Meter Type filter HOUR shows the hour readings instead. */
export function MeterLogsListView({ equipment, meterType, dateFrom, dateTo }: ListProps) {
  const { t } = useT()
  return (
    <MeterReadingsListView
      title={t('nav.meterLogs')}
      noun="meter log"
      newHref="/fleet/meter-logs/new"
      kind={meterType === 'HOUR' ? 'HOUR' : 'KM'}
      search={equipment}
      from={dateFrom}
      to={dateTo}
      filters={<MeterLogFilters equipmentCode={equipment} meterType={meterType} dateFrom={dateFrom} dateTo={dateTo} />}
    >
      {(rows) => <MeterLogListClient data={rows} />}
    </MeterReadingsListView>
  )
}

export function MeterLogView({ id }: { id: string }) {
  if (id === 'new') return <MeterLogFormClient />
  return <MeterReadingPage id={id} listHref="/fleet/meter-logs" render={(r) => <MeterLogFormClient reading={r} />} />
}
