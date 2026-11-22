'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/shared/FormLayout'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { Alert, fmtDate, money, useDocActions } from '@/components/docs/DocBits'
import { FuelEntrySection } from '@/components/fuel-logs/sections/FuelEntrySection'
import { CostSummarySection } from '@/components/fuel-logs/sections/CostSummarySection'
import { FuelStatusBadge } from './FuelStatusBadge'
import {
  FUEL_API_TO_FORM, fuelActions, fuelFormSchema, useAssetFuel, useFuelLogAction, useSaveFuelLog,
  type FuelFormValues, type FuelLogDto,
} from '@/lib/api/fleet/fuelLogs'
import type { AssetView } from '@/lib/api/fleet/assets'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useAuth } from '@/lib/contexts/AuthContext'
import { handleSaveError } from '@/lib/api/saveErrors'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

interface Props {
  record: FuelFormValues
  current?: FuelLogDto
  isNew: boolean
}

/** Same two tabs. Save / Save-and-submit; Approve / Reject / Cancel as toolbar actions (status is the API's). */
export function FuelLogFormClient({ record, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const { user } = useAuth()
  const { canAt, canAnywhere } = useFleetAccess()
  const save = useSaveFuelLog()
  const act = useFuelLogAction()
  const docs = useDocActions(act, current?.fuelLogId, current?.rowVersion)
  const [banner, setBanner] = useState<string | null>(null)
  const [asset, setAsset] = useState<AssetView | null>(null)

  const form = useForm<FuelFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(fuelFormSchema) as any,
    defaultValues: record,
  })
  const { handleSubmit, watch, formState: { isDirty } } = form

  const assetId = watch('assetProfileId') || null
  const assetFuel = useAssetFuel(isNew ? assetId : null)
  // A Trucking-linked asset: its fuel is recorded in Trucking (the API answers 409) → read-only rows, no save.
  const linked = isNew && !!assetId && (assetFuel.data?.isLinked ?? asset?.isLinked ?? false)

  const canManage = current ? canAt('fleet.fuel.approve', current.branchId) : canAnywhere('fleet.fuel.approve')
  const allowed = fuelActions(current, canManage, user?.userId)
  const editable = allowed.save && !linked
  const busy = save.isPending || act.isPending

  const doSave = (submit: boolean) =>
    handleSubmit(async (values) => {
      setBanner(null)
      try {
        let saved = await save.mutateAsync({ values, current, submit: submit && !current })
        if (submit && current) saved = await act.mutateAsync({ id: saved.fuelLogId, action: 'submit', body: { reason: null, rowVersion: saved.rowVersion } })
        toast.success(submit ? t(`fuel.status.${saved.status}`) : 'Fuel log saved', `${saved.documentNo} has been saved.`)
        if (isNew) router.push(`/fleet/fuel-logs/${saved.fuelLogId}`)
      } catch (e) {
        handleSaveError(e, { setError: form.setError, apiToForm: FUEL_API_TO_FORM, setBanner, t, toast })
      }
    })()

  const title = isNew ? `${t('common.new')} ${t('nav.fuelLogs')}` : current?.documentNo ?? t('nav.fuelLogs')

  const header = (
    <div className="mb-4 flex flex-col gap-3">
      {banner && <Alert>{banner}</Alert>}
      {current && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <FuelStatusBadge status={current.status} />
          {current.decidedAt && <span>{t('fuel.decidedOn')} {fmtDate(current.decidedAt)}</span>}
          {current.rejectReason && <span className="text-red-600">{t('fuel.rejectReason')}: {current.rejectReason}</span>}
          {current.cancelReason && <span className="text-gray-500">{t('fuel.cancelReason')}: {current.cancelReason}</span>}
          {current.meterReadingId && <span className="text-green-700">{t('fuel.meterRecorded')}</span>}
        </div>
      )}
      {linked && <TruckingFuel rows={assetFuel.data?.truckingRows ?? []} loading={assetFuel.isLoading} />}
    </div>
  )

  const tabs = [
    { id: 'fuel-entry', label: t('form.fuelEntry'), content: <>{header}<FuelEntrySection form={form} editable={allowed.save} isNew={isNew} onAsset={setAsset} /></> },
    { id: 'cost-summary', label: t('form.costSummary'), content: <CostSummarySection form={form} current={current} editable={editable} /> },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new fuel log entry' : `${current?.assetCode} · ${t(`fuel.source.${current?.fuelSource}`)}`}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {allowed.cancel && current && (
              <ToolbarButton tone="danger" disabled={busy} onClick={() => docs.ask('cancel', `${t('fuel.action.cancel')} · ${current.documentNo}`, true)}>
                {t('fuel.action.cancel')}
              </ToolbarButton>
            )}
            {allowed.reject && current && (
              <ToolbarButton tone="danger" disabled={busy} onClick={() => docs.ask('reject', `${t('fuel.action.reject')} · ${current.documentNo}`, true)}>
                {t('fuel.action.reject')}
              </ToolbarButton>
            )}
            {allowed.approve && <ToolbarButton tone="success" disabled={busy} onClick={() => docs.run('approve')}>{t('common.approve')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {allowed.submit && !linked && <ToolbarButton disabled={busy} onClick={() => doSave(true)}>{t('fuel.action.submit')}</ToolbarButton>}
            {allowed.save && !linked && (
              <ToolbarButton tone="primary" disabled={busy || !isDirty} onClick={() => doSave(false)}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>
            )}
          </div>
        }
      />
      {docs.dialogNode}
    </>
  )
}

/** Trucking's fuel transactions of a linked asset (read-only; GET /assets/{id}/fuel). */
function TruckingFuel({ rows, loading }: { rows: NonNullable<ReturnType<typeof useAssetFuel>['data']>['truckingRows']; loading: boolean }) {
  const { t } = useT()
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">{t('fuel.fromTrucking')}</span>
        <span className="text-sm text-blue-800">{t('fuel.linkedHint')}</span>
      </div>
      {loading ? <p className="text-xs text-gray-500">…</p> : rows.length === 0 ? <p className="text-xs text-gray-500">{t('fuel.noTruckingRows')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1 pr-3">Date</th><th className="py-1 pr-3">Type</th><th className="py-1 pr-3">Fuel</th>
                <th className="py-1 pr-3 text-right">Qty</th><th className="py-1 pr-3 text-right">Odometer</th><th className="py-1 pr-3 text-right">Amount</th><th className="py-1">Ref</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.vehicleFuelTxnId} className="border-t border-blue-100">
                  <td className="py-1 pr-3">{fmtDate(r.txnAt)}</td>
                  <td className="py-1 pr-3">{r.txnType}</td>
                  <td className="py-1 pr-3">{r.fuelType}</td>
                  <td className="py-1 pr-3 text-right">{Number(r.quantity).toLocaleString()} {r.quantityUnit}</td>
                  <td className="py-1 pr-3 text-right">{r.odometerKm != null ? Number(r.odometerKm).toLocaleString() : '—'}</td>
                  <td className="py-1 pr-3 text-right">{money(r.amount)}</td>
                  <td className="py-1">{r.sourceDocRef ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
