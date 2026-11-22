'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FormLayout } from '@/components/shared/FormLayout'
import { ReasonDialog, ToolbarButton } from '@/components/shared/ReasonDialog'
import { PartyCodeInput, SupplierCodeInput } from '@/components/shared/PartyInputs'
import { AssetCodeInput } from '@/components/meters/MeterBits'
import {
  PRIORITIES, WR_API_TO_FORM, viewWrStatus, wrActions, wrFormSchema, useConvertWorkRequest, useSaveWorkRequest, useWorkRequestAction,
  type WorkRequestDto, type WrAction, type WrFormValues,
} from '@/lib/api/fleet/workRequests'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { handleSaveError } from '@/lib/api/saveErrors'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  const { t } = useT()
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{t(error)}</p>}
    </div>
  )
}

function ic(err?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
    err ? 'border-red-400' : 'border-gray-300'
  }`
}

const WO_TYPES = ['CORRECTIVE', 'BREAKDOWN', 'PM', 'ACCIDENT', 'TYRE', 'INSPECTION', 'CAMPAIGN'] as const
const REPAIR_SITES = ['IN_HOUSE', 'VENDOR', 'MIXED', 'ROADSIDE'] as const

interface Props {
  record: WrFormValues
  current?: WorkRequestDto
  isNew: boolean
}

type Dialog = { kind: 'reject' | 'cancel' } | { kind: 'convert' } | null

/** Same fields and layout; status read-only (the API's); status changes are toolbar actions. */
export function WorkRequestFormClient({ record, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const save = useSaveWorkRequest()
  const act = useWorkRequestAction()
  const convert = useConvertWorkRequest()
  const { canAt, canAnywhere } = useFleetAccess()
  const [banner, setBanner] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [vendorName, setVendorName] = useState<string | null>(null)
  const [woType, setWoType] = useState<string>('CORRECTIVE')
  const [repairSite, setRepairSite] = useState<string>('IN_HOUSE')
  const [takesOos, setTakesOos] = useState(false)

  const form = useForm<WrFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(wrFormSchema) as any,
    defaultValues: record,
  })
  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = form

  const branchId = current?.branchId
  const can = {
    create: branchId ? canAt('fleet.workrequest.create', branchId) : canAnywhere('fleet.workrequest.create'),
    approve: !!branchId && canAt('fleet.workrequest.approve', branchId),
    convert: !!branchId && canAt('fleet.workorder.manage', branchId),
  }
  const allowed = wrActions(current, can)
  const editable = allowed.save
  const status = current ? viewWrStatus(current) : { status: 'DRAFT' as const, approved: false, rejected: false }
  const busy = save.isPending || act.isPending || convert.isPending

  const doSave = (submit: boolean) =>
    handleSubmit(async (values) => {
      setBanner(null)
      try {
        let saved = await save.mutateAsync({ values, current, submit: submit && !current })
        // An existing draft: save, then submit.
        if (submit && current) saved = await act.mutateAsync({ id: saved.workRequestId, action: 'submit', rowVersion: saved.rowVersion })
        toast.success(submit ? t('wr.submitted') : 'Saved', `${saved.documentNo} has been saved.`)
        if (isNew) router.push(`/fleet/work-requests/${saved.workRequestId}`)
      } catch (e) {
        handleSaveError(e, { setError: form.setError, apiToForm: WR_API_TO_FORM, setBanner, t, toast })
      }
    })()

  const runAction = (action: WrAction, reason?: string) => {
    if (!current) return
    setDialogError(null)
    act.mutate(
      { id: current.workRequestId, action, reason, rowVersion: current.rowVersion },
      { onSuccess: () => { toast.success(t(`wr.done.${action}`)); setDialog(null) }, onError: (e) => { setDialogError(errorText(e, t)); if (!dialog) toast.error(t('common.saveFailed'), errorText(e, t)) } },
    )
  }

  const runConvert = () => {
    if (!current) return
    setDialogError(null)
    convert.mutate(
      { id: current.workRequestId, woType, repairSite, takesAssetOos: takesOos, rowVersion: current.rowVersion },
      { onSuccess: (wo) => { toast.success(t('wr.converted'), wo.documentNo); router.push(`/fleet/work-orders/${wo.workOrderId}`) }, onError: (e) => setDialogError(errorText(e, t)) },
    )
  }

  const documentNo = watch('documentNo')
  const title = isNew ? `${t('common.new')} ${t('nav.workRequests')}` : documentNo || t('nav.workRequests')

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {banner && <div role="alert" className="sm:col-span-2 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
      <Field label="Document No" error={errors.documentNo?.message}>
        <input {...register('documentNo')} disabled className={`${ic(!!errors.documentNo)} bg-gray-50 text-gray-500`} placeholder="Auto-generated" />
      </Field>

      <Field label="Order Date" error={errors.orderDate?.message}>
        <input type="date" {...register('orderDate')} disabled={!editable} className={ic(!!errors.orderDate)} />
      </Field>

      <Field label="Status">
        {/* The API's status (read-only): changed by the toolbar actions. */}
        <div className="flex items-center gap-2">
          <input value={status.status} disabled className={`${ic()} bg-gray-50 text-gray-500`} />
          {status.approved && status.status === 'SUBMITTED' && <span className="text-xs text-green-700 whitespace-nowrap">{t('wr.approved')}</span>}
          {status.rejected && <span title={current?.rejectReason ?? undefined} className="text-xs text-red-600 whitespace-nowrap">{t('wr.rejected')}</span>}
          {current?.workOrderId && (
            <Link href={`/fleet/work-orders/${current.workOrderId}`} className="text-xs text-blue-600 hover:underline font-mono whitespace-nowrap">{current.workOrderNo}</Link>
          )}
        </div>
      </Field>

      <Field label="Priority" error={errors.priorityType?.message}>
        <select {...register('priorityType')} disabled={!editable} className={ic(!!errors.priorityType)}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <Field label="Equipment Code" error={errors.equipmentCode?.message ?? errors.assetProfileId?.message}>
        {editable ? (
          <AssetCodeInput
            id="wr-assets"
            value={watch('equipmentCode') ?? ''}
            onChange={(v) => setValue('equipmentCode', v, { shouldDirty: true })}
            onResolve={(a) => setValue('assetProfileId', a?.id ?? '', { shouldDirty: true })}
            className={ic(!!errors.equipmentCode)}
            placeholder="e.g. EQ-001"
          />
        ) : (
          <input value={watch('equipmentCode') ?? ''} disabled className={ic()} />
        )}
      </Field>

      <Field label="Billing Customer" error={errors.billingCustomerName?.message}>
        <PartyCodeInput id="wr-parties" value={watch('billingCustomerName') ?? ''} onChange={(v) => setValue('billingCustomerName', v, { shouldDirty: true })}
          disabled={!editable} className={ic(!!errors.billingCustomerName)} placeholder="Customer name" />
      </Field>

      <Field label="Vendor Name">
        <input value={vendorName ?? ''} readOnly disabled className={`${ic()} bg-gray-50 text-gray-500`} placeholder="Vendor name" />
      </Field>

      <Field label="Vendor Code" error={errors.vendorCode?.message}>
        <SupplierCodeInput id="wr-suppliers" value={watch('vendorCode') ?? ''} onChange={(v) => setValue('vendorCode', v, { shouldDirty: true })}
          onName={setVendorName} disabled={!editable} className={ic(!!errors.vendorCode)} placeholder="e.g. VND-001" />
      </Field>

      <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
        <textarea {...register('description')} disabled={!editable} rows={3} className={ic(!!errors.description)} placeholder="Describe the work to be performed…" />
      </Field>

      <Field label="Remarks" error={errors.remarks?.message} className="sm:col-span-2">
        <textarea {...register('remarks')} disabled={!editable} rows={2} className={ic(!!errors.remarks)} placeholder="Additional remarks or notes…" />
      </Field>

      <div className="sm:col-span-2">
        {/* Cancelling is the "Cancel request" action. */}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={status.status === 'CANCELLED'} disabled readOnly className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          <span className="text-sm text-gray-700">Cancelled</span>
        </label>
      </div>
    </div>
  )

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new work request' : `${current?.assetCode} · ${current?.source}`}
        tabs={[{ id: 'detail', label: t('common.details'), content }]}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {allowed.cancel && <ToolbarButton tone="danger" disabled={busy} onClick={() => setDialog({ kind: 'cancel' })}>{t('wr.action.cancel')}</ToolbarButton>}
            {allowed.reject && <ToolbarButton tone="danger" disabled={busy} onClick={() => setDialog({ kind: 'reject' })}>{t('wr.action.reject')}</ToolbarButton>}
            {allowed.approve && <ToolbarButton tone="success" disabled={busy} onClick={() => runAction('approve')}>{t('wr.action.approve')}</ToolbarButton>}
            {allowed.convert && <ToolbarButton tone="primary" disabled={busy} onClick={() => setDialog({ kind: 'convert' })}>{t('wr.action.convert')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {allowed.submit && <ToolbarButton disabled={busy} onClick={() => doSave(true)}>{t('wr.action.submit')}</ToolbarButton>}
            {allowed.save && <ToolbarButton tone="primary" disabled={busy || !isDirty} onClick={() => doSave(false)}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>}
          </div>
        }
      />
      {dialog && dialog.kind !== 'convert' && (
        <ReasonDialog
          title={`${t(`wr.action.${dialog.kind}`)} · ${current?.documentNo}`}
          confirmLabel={t(`wr.action.${dialog.kind}`)}
          reasonRequired={dialog.kind === 'reject'}
          danger
          busy={act.isPending}
          error={dialogError}
          onConfirm={(reason) => runAction(dialog.kind as WrAction, reason)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'convert' && (
        <ReasonDialog
          title={`${t('wr.action.convert')} · ${current?.documentNo}`}
          confirmLabel={t('wr.action.convert')}
          busy={convert.isPending}
          error={dialogError}
          hint={t('wr.convertHint')}
          onConfirm={() => runConvert()}
          onClose={() => setDialog(null)}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('wo.woType')}
              <select value={woType} onChange={(e) => setWoType(e.target.value)} className={ic()}>
                {WO_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('wo.repairSite')}
              <select value={repairSite} onChange={(e) => setRepairSite(e.target.value)} className={ic()}>
                {REPAIR_SITES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={takesOos} onChange={(e) => setTakesOos(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            {t('wo.takesAssetOos')}
          </label>
        </ReasonDialog>
      )}
    </>
  )
}
