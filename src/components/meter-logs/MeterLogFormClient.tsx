'use client'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/shared/FormLayout'
import { AssetCodeInput, DriverCodeInput, MeterReadingActions, MeterSourceBadge, MeterStatusBadge } from '@/components/meters/MeterBits'
import { useMeterEntry } from '@/components/meters/useMeterEntry'
import { useAssetMeters, type MeterReadingView } from '@/lib/api/fleet/meters'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useT } from '@/i18n/I18nContext'

interface Props {
  /** A saved reading (opened from the list): shown read-only. Absent = record a new one. */
  reading?: MeterReadingView | null
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function ic(ro?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${
    ro ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
  }`
}

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Meter Logs (KM). New = record a reading; a saved reading is read-only (readings are never edited or deleted). */
export function MeterLogFormClient({ reading }: Props) {
  const { t } = useT()
  const router = useRouter()
  const isNew = !reading
  const e = useMeterEntry('KM', '/fleet/meter-logs')
  const meters = useAssetMeters(isNew ? e.asset?.id ?? null : null)
  const canRecord = useFleetAccess().canAnywhere('fleet.meter.record')
  const showHourMeter = isNew ? e.meterType === 'HOUR' || e.meterType === 'BOTH' : reading.meterType === 'HOUR'

  const title = isNew ? `${t('common.new')} ${t('nav.meterLogs')}` : reading.equipmentCode
  const current = meters.data
    ? [meters.data.currentKm != null && `${Number(meters.data.currentKm).toLocaleString()} km`, meters.data.currentHours != null && `${Number(meters.data.currentHours).toLocaleString()} hrs`].filter(Boolean).join(' · ')
    : ''

  const content = isNew ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {e.banner && <div role="alert" className="sm:col-span-2 lg:col-span-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{e.banner}</div>}
      <Field label="Equipment Code *" error={e.fieldErrors.equipmentCode ?? (e.equipmentCode && !e.asset ? t('meter.rule.asset') : undefined)}>
        <AssetCodeInput value={e.equipmentCode} onChange={e.setEquipmentCode} onResolve={e.setAsset} className={ic()} placeholder="e.g. EQ-001" />
        {current && <p className="text-xs text-gray-400">{t('meter.current')} {current}</p>}
      </Field>

      <Field label="Meter Update Date *" error={e.fieldErrors.meterUpdateDate}>
        <input type="datetime-local" value={e.readingAt} onChange={(x) => e.setReadingAt(x.target.value)} className={ic()} />
      </Field>

      <Field label="Meter Type *">
        <select value={e.meterType} onChange={(x) => e.setMeterType(x.target.value as typeof e.meterType)} className={ic()}>
          {e.allowed.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>

      <Field label="Meter Reading (km) *" error={e.fieldErrors.meterRead}>
        <input type="number" step="1" min="0" value={e.km} onChange={(x) => e.setKm(x.target.value)} disabled={e.meterType === 'HOUR'}
          className={ic(e.meterType === 'HOUR')} placeholder="odometer km" />
      </Field>

      {showHourMeter && (
        <Field label="Hour Meter (hrs)" error={e.fieldErrors.hourMeter}>
          <input type="number" step="0.1" min="0" value={e.hours} onChange={(x) => e.setHours(x.target.value)} className={ic()} placeholder="engine hours" />
        </Field>
      )}

      <Field label="Driver Name" error={e.fieldErrors.driverName}>
        <DriverCodeInput value={e.driverText} onChange={e.setDriverText} onResolve={e.setDriver} className={ic()} placeholder="Driver full name" />
      </Field>

      <Field label="Total Distance (km)">
        {/* Read-only: the API works it out from the previous reading. */}
        <input readOnly value="" placeholder={t('meter.afterSave')} className={ic(true)} />
      </Field>

      <Field label="Remarks">
        <textarea value={e.remarks} onChange={(x) => e.setRemarks(x.target.value)} rows={3} className={`${ic()} resize-none`} placeholder="Optional notes…" />
      </Field>
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 text-xs text-gray-500">
        <MeterStatusBadge status={reading.status} reason={reading.suspectReason} />
        <MeterSourceBadge source={reading.source} />
        <span>{reading.suspectReason ?? t('meter.readOnlyHint')}</span>
      </div>
      <Field label="Equipment Code *"><input readOnly value={`${reading.equipmentCode}${reading.registrationNo ? ` · ${reading.registrationNo}` : ''}`} className={ic(true)} /></Field>
      <Field label="Meter Update Date *"><input readOnly value={fmtDateTime(reading.meterUpdateDate)} className={ic(true)} /></Field>
      <Field label="Meter Type *"><input readOnly value={reading.meterType} className={ic(true)} /></Field>
      <Field label="Meter Reading (km) *"><input readOnly value={reading.meterType === 'KM' ? reading.value.toLocaleString() : '—'} className={ic(true)} /></Field>
      {showHourMeter && <Field label="Hour Meter (hrs)"><input readOnly value={reading.value.toLocaleString()} className={ic(true)} /></Field>}
      <Field label="Driver Name"><input readOnly value={reading.driverName ?? '—'} className={ic(true)} /></Field>
      <Field label="Total Distance (km)"><input readOnly value={reading.sinceLast != null ? reading.sinceLast.toLocaleString() : '—'} className={ic(true)} /></Field>
      <Field label="Remarks"><textarea readOnly value={reading.remarks ?? ''} rows={3} className={`${ic(true)} resize-none`} /></Field>
    </div>
  )

  return (
    <FormLayout
      title={title}
      subtitle={isNew ? 'Create a new meter log entry' : `${reading.source} · ${fmtDateTime(reading.meterUpdateDate)}`}
      tabs={[{ id: 'meter-reading', label: t('form.meterReading'), content }]}
      isNew={isNew}
      actions={
        <div className="flex items-center gap-2">
          {!isNew && <MeterReadingActions reading={reading} variant="button" />}
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
            {isNew ? t('common.cancel') : t('common.close')}
          </button>
          {isNew && (
            <button
              type="button"
              onClick={e.submit}
              disabled={e.saving || !e.dirty || !canRecord}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {e.saving ? t('common.loading') : t('common.save')}
            </button>
          )}
        </div>
      }
    />
  )
}
