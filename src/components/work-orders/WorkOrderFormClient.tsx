'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/shared/FormLayout'
import { ReasonDialog, ToolbarButton } from '@/components/shared/ReasonDialog'
import { WOGeneralSection } from '@/components/work-orders/sections/WOGeneralSection'
import { WOLaborGrid, WOPartsGrid, WOServicesGrid } from '@/components/work-orders/sections/WOLineGrids'
import { WOPhotosTab } from '@/components/work-orders/sections/WOPhotosTab'
import {
  EDITABLE_STATUSES, HOLD_REASONS, WO_API_TO_FORM, woFormSchema, woMoves, useSaveWorkOrder, useWorkOrderApproval, useWorkOrderLog, useWorkOrderMove,
  type WoFormValues, type WoMove, type WorkOrderDto,
} from '@/lib/api/fleet/workOrders'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { canReleaseWo } from '@/lib/api/fleet/recharges'
import { RechargePreviewDialog } from '@/components/recharges/RechargePreviewDialog'
import { useBranchContext } from '@/lib/api/platform/branches'
import { ApiError } from '@/lib/api/problem'
import { handleSaveError } from '@/lib/api/saveErrors'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

interface Props {
  workOrder: WoFormValues
  current?: WorkOrderDto
  isNew: boolean
}

type Dialog = { kind: 'move'; move: WoMove } | { kind: 'approval'; decision: 'APPROVED' | 'REJECTED' } | null
const ic = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Same tabs; status moves are toolbar actions (the API owns the status). Lines editable while DRAFT / OPEN / IN PROGRESS / ON HOLD. */
export function WorkOrderFormClient({ workOrder, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const save = useSaveWorkOrder()
  const move = useWorkOrderMove()
  const approval = useWorkOrderApproval()
  const log = useWorkOrderLog(current?.workOrderId ?? null)
  const { canAt, canAnywhere } = useFleetAccess()
  const { currentBranchId } = useBranchContext()
  const [banner, setBanner] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [recharging, setRecharging] = useState(false)
  const [holdReason, setHoldReason] = useState<string>('WAITING_PARTS')
  const [outKm, setOutKm] = useState(current?.meterOutKm != null ? String(current.meterOutKm) : '')
  const [outHours, setOutHours] = useState(current?.meterOutHours != null ? String(current.meterOutHours) : '')

  const form = useForm<WoFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(woFormSchema) as any,
    defaultValues: workOrder,
  })
  const { handleSubmit, formState: { isDirty } } = form

  const branchId = current?.branchId ?? currentBranchId
  const canManage = current ? canAt('fleet.workorder.manage', current.branchId) : canAnywhere('fleet.workorder.manage')
  const canClose = !!current && canAt('fleet.workorder.close', current.branchId)
  const canRecharge = !!current && canReleaseWo(current) && canAt('fleet.recharge.release', current.branchId)
  const canApprove = !!current && current.approvalStatus === 'PENDING' && canAt('fleet.workorder.approve', current.branchId)
  const editable = canManage && (!current || EDITABLE_STATUSES.includes(current.status))
  const moves = woMoves(current, { manage: canManage, close: canClose })
  const busy = save.isPending || move.isPending || approval.isPending

  const warn = (d: WorkOrderDto) => { if (d.warning) toast.warning(t('wo.warning'), d.warning) }

  const handleSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await save.mutateAsync({ values, current, branchId })
      warn(saved)
      toast.success('Work order saved', `${saved.documentNo} has been saved.`)
      if (isNew) router.push(`/fleet/work-orders/${saved.workOrderId}`)
    } catch (e) {
      handleSaveError(e, { setError: form.setError, apiToForm: WO_API_TO_FORM, setBanner, t, toast })
    }
  })

  const runMove = async (m: WoMove, reason: string) => {
    if (!current) return
    setDialogError(null)
    try {
      let rowVersion = current.rowVersion
      // Completion needs the meter-out values: saved on the header first.
      if (m === 'COMPLETED') {
        const v = { ...form.getValues(), meterOutKm: outKm.trim() === '' ? undefined : Number(outKm) }
        const saved = await save.mutateAsync({
          values: v,
          current: { ...current, meterOutHours: outHours.trim() === '' ? null : Number(outHours) },
          branchId,
        })
        rowVersion = saved.rowVersion
      }
      const toStatus = m === 'REOPEN' ? 'COMPLETED' : m
      const done = await move.mutateAsync({
        id: current.workOrderId, toStatus, reasonCode: m === 'ON_HOLD' ? holdReason : null, reasonText: reason, rowVersion,
      })
      warn(done)
      toast.success(t(`wo.done.${m}`), done.documentNo)
      setDialog(null)
    } catch (e) {
      // DRAFT → OPEN may need approval: the WO is now PENDING (the refetch shows Approve / Reject).
      if (e instanceof ApiError && e.status === 409 && m === 'OPEN') {
        toast.warning(t('wo.needsApproval'), errorText(e, t))
        setDialog(null)
        return
      }
      setDialogError(errorText(e, t))
    }
  }

  const runApproval = (decision: 'APPROVED' | 'REJECTED', reason: string) => {
    if (!current) return
    setDialogError(null)
    approval.mutate(
      { id: current.workOrderId, decision, reason, rowVersion: current.rowVersion },
      { onSuccess: (d) => { warn(d); toast.success(t(`wo.done.${decision}`)); setDialog(null) }, onError: (e) => setDialogError(errorText(e, t)) },
    )
  }

  const documentNo = form.watch('documentNo')
  const title = isNew ? `${t('common.new')} ${t('nav.workOrders')}` : documentNo || t('nav.workOrders')
  const counts = { tasks: form.watch('tasks').length, parts: form.watch('parts').length, labor: form.watch('labor').length }

  const tabs = [
    {
      id: 'general',
      label: t('form.general'),
      content: (
        <>
          {banner && <div role="alert" className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
          <WOGeneralSection form={form} isNew={isNew} current={current} editable={editable} />
        </>
      ),
    },
    { id: 'services', label: `${t('form.services')} (${counts.tasks})`, content: <WOServicesGrid form={form} current={current} editable={editable} /> },
    { id: 'parts', label: `Parts (${counts.parts})`, content: <WOPartsGrid form={form} current={current} editable={editable} /> },
    { id: 'labor', label: `Labor (${counts.labor})`, content: <WOLaborGrid form={form} current={current} editable={editable} /> },
    ...(current ? [{ id: 'photos', label: t('wo.photo.tab'), content: <WOPhotosTab woId={current.workOrderId} branchId={current.branchId} /> }] : []),
    ...(current
      ? [{
          id: 'log',
          label: t('wo.statusLog'),
          content: log.data?.length ? (
            <ol className="flex flex-col gap-2 text-sm">
              {log.data.map((l, i) => (
                <li key={i} className="flex flex-wrap gap-x-3 text-gray-700">
                  <span className="text-gray-400 w-40">{fmtDateTime(l.changedAt)}</span>
                  <span className="font-medium">{l.fromStatus ?? '—'} → {l.toStatus}</span>
                  {l.reasonCode && <span className="text-amber-700">{l.reasonCode}</span>}
                  {l.reasonText && <span className="text-gray-500">“{l.reasonText}”</span>}
                  {l.changedBy && <span className="text-gray-400">{l.changedBy}</span>}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-gray-400">{log.isLoading ? '…' : t('wo.noLog')}</p>,
        }]
      : []),
  ]

  const moveTone = (m: WoMove) => (m === 'CANCELLED' ? 'danger' : m === 'COMPLETED' || m === 'CLOSED' ? 'success' : 'secondary') as 'danger' | 'success' | 'secondary'
  const openMove = (m: WoMove) => { setDialogError(null); setDialog({ kind: 'move', move: m }) }

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new work order' : `${current?.assetCode} · ${current?.woType} · ${current?.repairSite}`}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {canApprove && (
              <>
                <ToolbarButton tone="danger" disabled={busy} onClick={() => { setDialogError(null); setDialog({ kind: 'approval', decision: 'REJECTED' }) }}>{t('wo.action.REJECTED')}</ToolbarButton>
                <ToolbarButton tone="success" disabled={busy} onClick={() => { setDialogError(null); setDialog({ kind: 'approval', decision: 'APPROVED' }) }}>{t('wo.action.APPROVED')}</ToolbarButton>
              </>
            )}
            {moves.map((m) => (
              <ToolbarButton key={m} tone={moveTone(m)} disabled={busy || (isDirty && m !== 'CANCELLED')} onClick={() => openMove(m)}>{t(`wo.action.${m}`)}</ToolbarButton>
            ))}
            {canRecharge && <ToolbarButton disabled={busy || isDirty} onClick={() => setRecharging(true)}>{t('recharge.previewRelease')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {editable && (
              <ToolbarButton tone="primary" disabled={busy || !isDirty} onClick={handleSave}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>
            )}
          </div>
        }
      />
      {recharging && current && <RechargePreviewDialog workOrderId={current.workOrderId} workOrderNo={current.documentNo} onClose={() => setRecharging(false)} />}
      {dialog?.kind === 'move' && (
        <ReasonDialog
          title={`${t(`wo.action.${dialog.move}`)} · ${current?.documentNo}`}
          confirmLabel={t(`wo.action.${dialog.move}`)}
          reasonRequired={dialog.move === 'CANCELLED' || dialog.move === 'REOPEN'}
          danger={dialog.move === 'CANCELLED'}
          busy={busy}
          error={dialogError}
          hint={t(`wo.hint.${dialog.move}`)}
          onConfirm={(reason) => runMove(dialog.move, reason)}
          onClose={() => setDialog(null)}
        >
          {dialog.move === 'ON_HOLD' && (
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('wo.holdReason')}
              <select value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className={ic}>
                {HOLD_REASONS.map((r) => <option key={r} value={r}>{t(`wo.hold.${r}`)}</option>)}
              </select>
            </label>
          )}
          {dialog.move === 'COMPLETED' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('wo.meterOut')}
                <input type="number" value={outKm} onChange={(e) => setOutKm(e.target.value)} className={ic} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('wo.meterOutHours')}
                <input type="number" step="0.1" value={outHours} onChange={(e) => setOutHours(e.target.value)} className={ic} />
              </label>
            </div>
          )}
        </ReasonDialog>
      )}
      {dialog?.kind === 'approval' && (
        <ReasonDialog
          title={`${t(`wo.action.${dialog.decision}`)} · ${current?.documentNo}`}
          confirmLabel={t(`wo.action.${dialog.decision}`)}
          reasonRequired={dialog.decision === 'REJECTED'}
          danger={dialog.decision === 'REJECTED'}
          busy={approval.isPending}
          error={dialogError}
          onConfirm={(reason) => runApproval(dialog.decision, reason)}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
