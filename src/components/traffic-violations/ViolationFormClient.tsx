'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { AssetCodeInput, DriverCodeInput } from '@/components/meters/MeterBits'
import { ReasonDialog, ToolbarButton } from '@/components/shared/ReasonDialog'
import { Alert, fmtDate, money, useDocActions } from '@/components/docs/DocBits'
import {
  VIOLATION_API_TO_FORM, VIOLATION_STATUS_TONE, violationActions, violationFormSchema, useSaveTrafficViolation, useTrafficViolationAction,
  type TrafficViolationDto, type ViolationFormValues,
} from '@/lib/api/fleet/trafficViolations'
import { useLookup } from '@/lib/api/fleet/lookups'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { handleSaveError } from '@/lib/api/saveErrors'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

interface Props {
  record: ViolationFormValues
  current?: TrafficViolationDto
  isNew: boolean
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-1">
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

function Readonly({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 border-gray-200 min-h-[38px]">{value ?? '—'}</div>
    </div>
  )
}

const input = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/** Same layout + a read-only "Payment + deduction" block (owner Q6). Status changes are toolbar actions; no Delete. */
export function ViolationFormClient({ record, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const types = useLookup('violation-types')
  const { canAt, canAnywhere } = useFleetAccess()
  const save = useSaveTrafficViolation()
  const act = useTrafficViolationAction()
  const docs = useDocActions(act, current?.trafficViolationId, current?.rowVersion)
  const [banner, setBanner] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'pay' | 'deduct' | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [pay, setPay] = useState({ paidBy: 'COMPANY', paidAt: new Date().toISOString().slice(0, 10) })
  const [deductAmount, setDeductAmount] = useState('')

  const form = useForm<ViolationFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(violationFormSchema) as any,
    defaultValues: record,
  })
  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = form

  const canManage = current ? canAt('fleet.incident.manage', current.branchId) : canAnywhere('fleet.incident.manage')
  const allowed = violationActions(current, canManage)
  const editable = allowed.save
  const ro = !editable
  const busy = save.isPending || act.isPending

  const doSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await save.mutateAsync({ values, current })
      toast.success('Traffic violation saved', `${saved.ticketNo} has been saved.`)
      if (isNew) router.push(`/fleet/traffic-violations/${saved.trafficViolationId}`)
    } catch (e) {
      handleSaveError(e, { setError: form.setError, apiToForm: VIOLATION_API_TO_FORM, setBanner, t, toast })
    }
  })

  const run = (action: string, body: object) => {
    if (!current) return
    setDialogError(null)
    act.mutate(
      { id: current.trafficViolationId, action, body: { ...body, rowVersion: current.rowVersion } },
      { onSuccess: () => { toast.success(t('docs.done')); setDialog(null) }, onError: (e) => setDialogError(errorText(e, t)) },
    )
  }

  const title = isNew ? `${t('common.new')} ${t('nav.trafficViolations')}` : current?.ticketNo ?? t('nav.trafficViolations')

  return (
    <>
      <div className="flex flex-col gap-0 min-h-full">
        <div className="flex items-start justify-between gap-4 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
              {isNew ? 'Record a new traffic violation' : current?.documentNo}
              {current && (
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${VIOLATION_STATUS_TONE[current.status] ?? ''}`}>{t(`violation.status.${current.status}`)}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {allowed.cancel && current && (
              <ToolbarButton tone="danger" disabled={busy} onClick={() => docs.ask('cancel', `${t('violation.action.cancel')} · ${current.ticketNo}`, true)}>{t('violation.action.cancel')}</ToolbarButton>
            )}
            {allowed.dispute && current && (
              <ToolbarButton disabled={busy} onClick={() => docs.ask('dispute', `${t('violation.action.dispute')} · ${current.ticketNo}`, true)}>{t('violation.action.dispute')}</ToolbarButton>
            )}
            {allowed.reopen && <ToolbarButton disabled={busy} onClick={() => docs.run('reopen')}>{t('violation.action.reopen')}</ToolbarButton>}
            {allowed.takeBack && current && (
              <ToolbarButton tone="danger" disabled={busy} onClick={() => docs.ask('deduction/cancel', `${t('violation.action.takeBack')} · ${current.ticketNo}`, true)}>{t('violation.action.takeBack')}</ToolbarButton>
            )}
            {allowed.refresh && <ToolbarButton disabled={busy} onClick={() => docs.run('deduction/refresh')}>{t('violation.action.refresh')}</ToolbarButton>}
            {allowed.deduct && (
              <ToolbarButton tone="primary" disabled={busy || isDirty} onClick={() => { setDialogError(null); setDeductAmount(String(current?.fineAmount ?? '')); setDialog('deduct') }}>
                {t('violation.action.deduct')}
              </ToolbarButton>
            )}
            {allowed.pay && (
              <ToolbarButton tone="success" disabled={busy || isDirty} onClick={() => { setDialogError(null); setDialog('pay') }}>{t('violation.action.pay')}</ToolbarButton>
            )}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {allowed.save && (
              <ToolbarButton tone="primary" disabled={busy || !isDirty} onClick={() => doSave()}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>
            )}
          </div>
        </div>

        {banner && <div className="mb-4"><Alert>{banner}</Alert></div>}

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Violation Details</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Ticket No. *" error={errors.ticketNo?.message}>
                <input {...register('ticketNo')} disabled={ro} className={ic(ro, !!errors.ticketNo)} placeholder="e.g. TV-2024-001" />
              </Field>

              <Field label="Violation Date *" error={errors.violationDate?.message}>
                <input type="datetime-local" {...register('violationDate')} disabled={ro} className={ic(ro, !!errors.violationDate)} />
              </Field>

              <Field label="Equipment Code *" error={errors.equipmentCode?.message ?? errors.assetProfileId?.message}>
                {editable && isNew ? (
                  <AssetCodeInput id="tv-assets" value={watch('equipmentCode') ?? ''} onChange={(v) => setValue('equipmentCode', v, { shouldDirty: true })}
                    onResolve={(a) => setValue('assetProfileId', a?.id ?? '', { shouldDirty: true })} className={ic(false, !!errors.equipmentCode)} placeholder="e.g. EQ-001" />
                ) : (
                  <input value={watch('equipmentCode') ?? ''} disabled className={ic(true)} />
                )}
              </Field>

              <Field label="Driver Name">
                <input value={watch('driverName') ?? ''} disabled className={ic(true)} placeholder={t('violation.driverFromId')} />
              </Field>

              <Field label="Driver ID" error={errors.driverID?.message}>
                {editable ? (
                  <DriverCodeInput id="tv-drivers" value={watch('driverID') ?? ''} onChange={(v) => setValue('driverID', v, { shouldDirty: true })}
                    onResolve={(d) => { setValue('driverId', d?.id ?? '', { shouldDirty: true }); setValue('driverName', d?.driverName ?? '') }}
                    className={ic()} placeholder="e.g. DRV-001" />
                ) : (
                  <input value={watch('driverID') ?? ''} disabled className={ic(true)} />
                )}
              </Field>

              <Field label="Violation Type *" error={errors.violationType?.message}>
                <select {...register('violationType')} disabled={ro} className={ic(ro)}>
                  {types.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  {!types.options.length && <option value={watch('violationType')}>{watch('violationType')}</option>}
                </select>
              </Field>

              <Field label="Type Description" error={errors.violationTypeDescription?.message}>
                <input {...register('violationTypeDescription')} disabled={ro} className={ic(ro)} placeholder="Brief description of the violation" />
              </Field>

              <Field label="Violation Amount (฿) *" error={errors.violationAmount?.message}>
                <input type="number" step="0.01" min="0" {...register('violationAmount')} disabled={ro} className={ic(ro, !!errors.violationAmount)} placeholder="0" />
              </Field>

              <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Remarks</label>
                <textarea {...register('remarks')} rows={3} disabled={ro} className={`${ic(ro)} resize-none`} placeholder="Additional remarks…" />
              </div>
            </div>
          </div>
        </section>

        {current && (
          <section className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('violation.paymentBlock')}</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Readonly label={t('violation.paidBy')} value={current.paidBy ? t(`violation.paidByOpt.${current.paidBy}`) : '—'} />
              <Readonly label={t('violation.paidAt')} value={fmtDate(current.paidAt)} />
              <Readonly label={t('violation.paymentRef')} value={current.paymentRef} />
              <Readonly label={t('violation.deductionMode')} value={current.deductionMode ? t(`violation.mode.${current.deductionMode}`) : '—'} />
              <Readonly label={t('violation.deductionAmount')} value={money(current.deductionAmount)} />
              <Readonly label={t('violation.deductionParty')} value={current.deductionPartyCode} />
              <Readonly label={t('violation.deductionRef')} value={current.deductionRef} />
              <Readonly label={t('violation.deductedAt')} value={fmtDate(current.deductedAt)} />
              <Readonly label={t('violation.payrollExportedAt')} value={fmtDate(current.payrollExportedAt)} />
              {current.driverEmployment && <Readonly label={t('violation.employment')} value={current.driverEmployment} />}
              {current.disputeReason && <Readonly label={t('violation.disputeReason')} value={current.disputeReason} />}
              {current.cancelReason && <Readonly label={t('fuel.cancelReason')} value={current.cancelReason} />}
            </div>
          </section>
        )}
      </div>

      {docs.dialogNode}
      {dialog === 'pay' && current && (
        <ReasonDialog title={`${t('violation.action.pay')} · ${current.ticketNo}`} confirmLabel={t('violation.action.pay')} busy={act.isPending} error={dialogError}
          reasonLabel={t('violation.paymentRef')}
          onConfirm={(ref) => run('pay', { paidBy: pay.paidBy, paidAt: pay.paidAt || null, paymentRef: ref.trim() || null })}
          onClose={() => setDialog(null)}>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('violation.paidBy')}
              <select value={pay.paidBy} onChange={(e) => setPay({ ...pay, paidBy: e.target.value })} className={input}>
                <option value="COMPANY">{t('violation.paidByOpt.COMPANY')}</option>
                <option value="DRIVER">{t('violation.paidByOpt.DRIVER')}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('violation.paidAt')}
              <input type="date" value={pay.paidAt} onChange={(e) => setPay({ ...pay, paidAt: e.target.value })} className={input} />
            </label>
          </div>
        </ReasonDialog>
      )}
      {dialog === 'deduct' && current && (
        <ReasonDialog title={`${t('violation.action.deduct')} · ${current.ticketNo}`} confirmLabel={t('violation.action.deduct')} busy={act.isPending} error={dialogError}
          hint={current.driverEmployment === 'SUBCON' ? t('violation.deductSubconHint') : t('violation.deductPayrollHint')}
          hideReason
          onConfirm={() => run('deduct', { amount: deductAmount.trim() === '' ? null : Number(deductAmount) })}
          onClose={() => setDialog(null)}>
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('violation.deductionAmount')} (≤ {money(current.fineAmount)})
            <input type="number" step="0.01" min="0" max={Number(current.fineAmount)} value={deductAmount} onChange={(e) => setDeductAmount(e.target.value)} className={input} />
          </label>
        </ReasonDialog>
      )}
    </>
  )
}
