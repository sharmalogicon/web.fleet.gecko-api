'use client'
import Link from 'next/link'
import type { UseFormReturn } from 'react-hook-form'
import { AssetCodeInput, DriverCodeInput } from '@/components/meters/MeterBits'
import { PartyCodeInput } from '@/components/shared/PartyInputs'
import { fmtDate, money } from '@/components/docs/DocBits'
import type { AccidentDto, AccidentFormValues } from '@/lib/api/fleet/accidents'
import { useLookup } from '@/lib/api/fleet/lookups'
import { useT } from '@/i18n/I18nContext'

interface Props {
  form: UseFormReturn<AccidentFormValues>
  isNew: boolean
  editable: boolean
  current?: AccidentDto
}

function Field({ label, error, children, fullWidth }: { label: string; error?: string; children: React.ReactNode; fullWidth?: boolean }) {
  const { t } = useT()
  return (
    <div className={`flex flex-col gap-1${fullWidth ? ' sm:col-span-2 lg:col-span-3' : ''}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{t(error)}</p>}
    </div>
  )
}

function ic(ro?: boolean, err?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${err ? 'border-red-400' : ''} ${
    ro ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
  }`
}

/** Same fields; type + responsibility from the lookups; claim no read-only (latest claim); one third party (owner Q5). */
export function AccidentGeneralSection({ form, isNew, editable, current }: Props) {
  const { t } = useT()
  const types = useLookup('accident-types')
  const resp = useLookup('accident-responsibilities')
  const { register, watch, setValue, formState: { errors } } = form
  const ro = !editable

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={t('form.documentNo')}>
        <input {...register('documentNo')} disabled className={ic(true)} placeholder="Auto-generated" />
      </Field>

      <Field label={`${t('form.date')} *`} error={errors.accidentDate?.message}>
        <input type="datetime-local" {...register('accidentDate')} disabled={ro} className={ic(ro, !!errors.accidentDate)} />
      </Field>

      <Field label={`${t('form.equipmentCode')} *`} error={errors.equipmentCode?.message ?? errors.assetProfileId?.message}>
        {editable && isNew ? (
          <AssetCodeInput id="acc-assets" value={watch('equipmentCode') ?? ''} onChange={(v) => setValue('equipmentCode', v, { shouldDirty: true })}
            onResolve={(a) => setValue('assetProfileId', a?.id ?? '', { shouldDirty: true })} className={ic(false, !!errors.equipmentCode)} placeholder="e.g. EQ-001" />
        ) : (
          <input value={watch('equipmentCode') ?? ''} disabled className={ic(true)} />
        )}
      </Field>

      <Field label={t('form.driverName')} error={errors.driverName?.message}>
        <input {...register('driverName')} disabled={ro || !!watch('driverId')} className={ic(ro || !!watch('driverId'))} placeholder={t('accident.driverFreeHint')} />
      </Field>

      <Field label="Driver ID" error={errors.driverID?.message}>
        {editable ? (
          <DriverCodeInput id="acc-drivers" value={watch('driverID') ?? ''} onChange={(v) => setValue('driverID', v, { shouldDirty: true })}
            onResolve={(d) => {
              setValue('driverId', d?.id ?? '', { shouldDirty: true })
              if (d) setValue('driverName', d.driverName, { shouldDirty: true })
            }}
            className={ic()} placeholder="e.g. DRV-001" />
        ) : (
          <input value={watch('driverID') ?? ''} disabled className={ic(true)} />
        )}
      </Field>

      <Field label={`${t('form.accidentType')} *`} error={errors.accidentType?.message}>
        <select {...register('accidentType')} disabled={ro} className={ic(ro)}>
          {types.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          {!types.options.length && <option value={watch('accidentType')}>{watch('accidentType')}</option>}
        </select>
      </Field>

      <Field label="Responsibility *" error={errors.responsibility?.message}>
        <select {...register('responsibility')} disabled={ro} className={ic(ro)}>
          {resp.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          {!resp.options.length && <option value={watch('responsibility')}>{watch('responsibility')}</option>}
        </select>
      </Field>

      <Field label="Police Station" error={errors.policeStation?.message}>
        <input {...register('policeStation')} disabled={ro} className={ic(ro)} placeholder="Police station name" />
      </Field>

      <Field label="Police Report No." error={errors.policeReportNo?.message}>
        <input {...register('policeReportNo')} disabled={ro} className={ic(ro)} placeholder="e.g. PR-2024-0110" />
      </Field>

      <Field label="Insurance Policy No." error={errors.insPolicyNo?.message}>
        <input {...register('insPolicyNo')} disabled={ro} className={ic(ro)} placeholder="e.g. INS-TH-20241" />
      </Field>

      <Field label="Claim Reference No.">
        {/* The latest insurance claim (read-only): claims are made on the Insurance Claims page. */}
        <div className="flex items-center gap-2">
          <input value={current?.claimNo ?? ''} disabled className={ic(true)} placeholder="—" />
          {current?.claimId && (
            <Link href={`/fleet/insurance-claims/${current.claimId}`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
              {current.claimStatus}
            </Link>
          )}
        </div>
      </Field>

      <Field label="Accident Location" error={errors.accidentLocation?.message}>
        <input {...register('accidentLocation')} disabled={ro} className={ic(ro)} placeholder="Street / area description" />
      </Field>

      <div className="flex items-center gap-3 pt-5">
        <input type="checkbox" id="insClaimable" {...register('insClaimable')} disabled={ro} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <label htmlFor="insClaimable" className="text-sm font-medium text-gray-700">Insurance Claimable</label>
      </div>

      <Field label="About the Accident" fullWidth error={errors.aboutAccident?.message}>
        <textarea {...register('aboutAccident')} rows={3} disabled={ro} className={`${ic(ro)} resize-none`} placeholder="Describe what happened…" />
      </Field>

      <Field label="Damage Details" fullWidth error={errors.damageDetails?.message}>
        <textarea {...register('damageDetails')} rows={3} disabled={ro} className={`${ic(ro)} resize-none`} placeholder="Describe the damage…" />
      </Field>

      {/* Third party (owner Q5): one per accident on this screen. */}
      <div className="sm:col-span-2 lg:col-span-3 mt-2 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{t('accident.thirdParty')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={t('accident.tp.name')} error={errors.tpName?.message}>
            <input {...register('tpName')} disabled={ro} className={ic(ro, !!errors.tpName)} />
          </Field>
          <Field label={t('accident.tp.partyCode')}>
            <PartyCodeInput id="acc-tp-parties" value={watch('tpPartyCode') ?? ''} onChange={(v) => setValue('tpPartyCode', v, { shouldDirty: true })}
              onName={(name) => { if (name && !form.getValues('tpName')) setValue('tpName', name, { shouldDirty: true }) }}
              disabled={ro} className={ic(ro)} placeholder={t('accident.tp.partyCodeHint')} />
          </Field>
          <Field label={t('accident.tp.plate')}>
            <input {...register('tpPlate')} disabled={ro} className={ic(ro)} />
          </Field>
          <Field label={t('accident.tp.vehicle')}>
            <input {...register('tpVehicle')} disabled={ro} className={ic(ro)} />
          </Field>
          <Field label={t('accident.tp.insurer')}>
            <input {...register('tpInsurer')} disabled={ro} className={ic(ro)} />
          </Field>
          <Field label={t('accident.tp.insurerPolicy')}>
            <input {...register('tpInsurerPolicy')} disabled={ro} className={ic(ro)} />
          </Field>
          <Field label={t('accident.tp.contact')}>
            <input {...register('tpContact')} disabled={ro} className={ic(ro)} />
          </Field>
          <Field label={t('accident.tp.phone')}>
            <input {...register('tpPhone')} disabled={ro} className={ic(ro)} />
          </Field>
          <Field label={t('accident.tp.statement')} fullWidth>
            <textarea {...register('tpStatement')} rows={2} disabled={ro} className={`${ic(ro)} resize-none`} />
          </Field>
        </div>
      </div>

      {current && (
        <div className="sm:col-span-2 lg:col-span-3 mt-2 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{t('accident.repairs')}</p>
          <div className="flex flex-col gap-2 text-sm">
            {current.workRequestId ? (
              <div>
                {t('accident.workRequest')}:{' '}
                <Link href={`/fleet/work-requests/${current.workRequestId}`} className="text-blue-600 hover:underline font-mono">{current.workRequestNo}</Link>
              </div>
            ) : (
              <p className="text-gray-400 text-xs">{t('accident.noWorkRequest')}</p>
            )}
            {current.workOrders.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500"><th className="py-1 pr-3">WO</th><th className="py-1 pr-3">Status</th><th className="py-1 pr-3">Date</th><th className="py-1 text-right">Total cost</th></tr>
                </thead>
                <tbody>
                  {current.workOrders.map((w) => (
                    <tr key={w.workOrderId} className="border-t border-gray-100">
                      <td className="py-1 pr-3"><Link href={`/fleet/work-orders/${w.workOrderId}`} className="text-blue-600 hover:underline font-mono">{w.documentNo}</Link></td>
                      <td className="py-1 pr-3">{w.status}</td>
                      <td className="py-1 pr-3">{fmtDate(w.documentDate)}</td>
                      <td className="py-1 text-right">{money(w.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
