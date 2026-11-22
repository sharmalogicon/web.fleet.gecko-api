'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/shared/FormLayout'
import { ReasonDialog, ToolbarButton } from '@/components/shared/ReasonDialog'
import { Alert, useDocActions } from '@/components/docs/DocBits'
import { ClaimHeaderSection } from '@/components/insurance-claims/sections/ClaimHeaderSection'
import { ClaimLinesSection } from '@/components/insurance-claims/sections/ClaimLinesSection'
import {
  CLAIM_API_TO_FORM, CLAIM_STATUS_TONE, claimActions, claimFormSchema, useInsuranceClaimAction, useSaveInsuranceClaim,
  type ClaimFormValues, type InsuranceClaimDto,
} from '@/lib/api/fleet/insuranceClaims'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { handleSaveError } from '@/lib/api/saveErrors'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

interface Props {
  record: ClaimFormValues
  current?: InsuranceClaimDto
  isNew: boolean
}

const input = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

type Dialog = 'approve' | 'reject' | 'settle' | 'revise' | null

/** Same two tabs. DRAFT editable; Copy from WOs / Submit / Decision / Settle / Revise / Cancel as toolbar actions. */
export function InsuranceClaimFormClient({ record, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const { canAt, canAnywhere } = useFleetAccess()
  const save = useSaveInsuranceClaim()
  const act = useInsuranceClaimAction()
  const docs = useDocActions(act, current?.insuranceClaimId, current?.rowVersion)
  const [banner, setBanner] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [amounts, setAmounts] = useState({ approved: '', deductible: '', insurerClaimNo: '', settled: '', settledAt: new Date().toISOString().slice(0, 10), ref: '' })

  const form = useForm<ClaimFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(claimFormSchema) as any,
    defaultValues: record,
  })
  const { handleSubmit, formState: { isDirty, dirtyFields } } = form

  const branchId = current?.branchId
  const can = {
    manage: branchId ? canAt('fleet.incident.manage', branchId) : canAnywhere('fleet.incident.manage'),
    approve: !!branchId && canAt('fleet.claim.approve', branchId),
  }
  const allowed = claimActions(current, can)
  const busy = save.isPending || act.isPending

  /** Save; then (optionally) run an action on the saved version. */
  const doSave = (then?: 'submit' | 'lines/from-work-orders') =>
    handleSubmit(async (values) => {
      setBanner(null)
      try {
        let saved = current && !isDirty ? current : await save.mutateAsync({ values, current, linesChanged: !!dirtyFields.lines })
        if (then) saved = await act.mutateAsync({ id: saved.insuranceClaimId, action: then, body: { reason: null, rowVersion: saved.rowVersion } })
        toast.success(then === 'submit' ? t('claim.done.submit') : then ? t('claim.done.copy') : 'Insurance claim saved', saved.documentNo)
        if (isNew) router.push(`/fleet/insurance-claims/${saved.insuranceClaimId}`)
      } catch (e) {
        handleSaveError(e, { setError: form.setError, apiToForm: CLAIM_API_TO_FORM, setBanner, t, toast })
      }
    })()

  const run = (action: string, body: object, after?: (c: InsuranceClaimDto) => void) => {
    if (!current) return
    setDialogError(null)
    act.mutate(
      { id: current.insuranceClaimId, action, body: { ...body, rowVersion: current.rowVersion } },
      {
        onSuccess: (c) => { toast.success(t('docs.done'), c.documentNo); setDialog(null); after?.(c) },
        onError: (e) => setDialogError(errorText(e, t)),
      },
    )
  }
  const open = (d: Dialog) => {
    setDialogError(null)
    if (d === 'approve') setAmounts((a) => ({ ...a, approved: String(current?.totalAmount ?? ''), insurerClaimNo: current?.insurerClaimNo ?? '' }))
    if (d === 'settle') setAmounts((a) => ({ ...a, settled: String(Number(current?.approvedAmount ?? 0) - Number(current?.deductibleAmount ?? 0)) }))
    setDialog(d)
  }

  const title = isNew ? `${t('common.new')} ${t('nav.insuranceClaims')}` : current?.documentNo ?? t('nav.insuranceClaims')

  const tabs = [
    {
      id: 'header',
      label: t('form.header'),
      content: (
        <>
          {banner && <div className="mb-4"><Alert>{banner}</Alert></div>}
          {current && (
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CLAIM_STATUS_TONE[current.status] ?? ''}`}>{t(`claim.status.${current.status}`)}</span>
              {current.decisionReason && <span>{t('claim.decisionReason')}: {current.decisionReason}</span>}
              {current.cancelReason && <span>{t('fuel.cancelReason')}: {current.cancelReason}</span>}
            </div>
          )}
          <ClaimHeaderSection form={form} isNew={isNew} editable={allowed.save} current={current} />
        </>
      ),
    },
    { id: 'lines', label: t('form.lineItems'), content: <ClaimLinesSection form={form} editable={allowed.save} /> },
  ]

  const amountInput = (label: string, key: keyof typeof amounts, type = 'number') => (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{label}
      <input type={type} step="0.01" min="0" value={amounts[key]} onChange={(e) => setAmounts({ ...amounts, [key]: e.target.value })} className={input} />
    </label>
  )
  const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v))

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Record a new insurance claim' : `${current?.accidentNo} · ${current?.assetCode}`}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {allowed.cancel && current && (
              <ToolbarButton tone="danger" disabled={busy} onClick={() => docs.ask('cancel', `${t('claim.action.cancel')} · ${current.documentNo}`, true)}>{t('claim.action.cancel')}</ToolbarButton>
            )}
            {allowed.revise && <ToolbarButton disabled={busy} onClick={() => open('revise')}>{t('claim.action.revise')}</ToolbarButton>}
            {allowed.decision && <ToolbarButton tone="danger" disabled={busy} onClick={() => open('reject')}>{t('claim.action.reject')}</ToolbarButton>}
            {allowed.decision && <ToolbarButton tone="success" disabled={busy} onClick={() => open('approve')}>{t('claim.action.approve')}</ToolbarButton>}
            {allowed.settle && <ToolbarButton tone="success" disabled={busy} onClick={() => open('settle')}>{t('claim.action.settle')}</ToolbarButton>}
            {allowed.copyFromWos && <ToolbarButton disabled={busy} onClick={() => doSave('lines/from-work-orders')}>{t('claim.action.copy')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {allowed.submit && <ToolbarButton disabled={busy} onClick={() => doSave('submit')}>{t('claim.action.submit')}</ToolbarButton>}
            {allowed.save && (
              <ToolbarButton tone="primary" disabled={busy || !isDirty} onClick={() => doSave()}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>
            )}
          </div>
        }
      />
      {docs.dialogNode}
      {dialog === 'approve' && current && (
        <ReasonDialog title={`${t('claim.action.approve')} · ${current.documentNo}`} confirmLabel={t('claim.action.approve')} busy={act.isPending} error={dialogError}
          reasonLabel={t('claim.decisionNote')}
          onConfirm={(reason) => run('decision', {
            decision: 'APPROVED', approvedAmount: numOrNull(amounts.approved), deductibleAmount: numOrNull(amounts.deductible),
            insurerClaimNo: amounts.insurerClaimNo.trim() || null, reason: reason.trim() || null,
          })}
          onClose={() => setDialog(null)}>
          <div className="grid grid-cols-2 gap-3">
            {amountInput(`${t('claim.approvedAmount')} *`, 'approved')}
            {amountInput(t('claim.deductible'), 'deductible')}
            <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-700">{t('form.claimNo')}
              <input value={amounts.insurerClaimNo} onChange={(e) => setAmounts({ ...amounts, insurerClaimNo: e.target.value })} className={input} />
            </label>
          </div>
        </ReasonDialog>
      )}
      {dialog === 'reject' && current && (
        <ReasonDialog title={`${t('claim.action.reject')} · ${current.documentNo}`} confirmLabel={t('claim.action.reject')} reasonRequired danger busy={act.isPending}
          error={dialogError} onConfirm={(reason) => run('decision', { decision: 'REJECTED', reason: reason.trim() })} onClose={() => setDialog(null)} />
      )}
      {dialog === 'settle' && current && (
        <ReasonDialog title={`${t('claim.action.settle')} · ${current.documentNo}`} confirmLabel={t('claim.action.settle')} busy={act.isPending} error={dialogError}
          reasonLabel={t('claim.settlementRef')}
          onConfirm={(ref) => run('settle', { settledAmount: Number(amounts.settled || 0), settledAt: amounts.settledAt || null, settlementRef: ref.trim() || null })}
          onClose={() => setDialog(null)}>
          <div className="grid grid-cols-2 gap-3">
            {amountInput(`${t('claim.settledAmount')} *`, 'settled')}
            {amountInput(t('claim.settledAt'), 'settledAt', 'date')}
          </div>
        </ReasonDialog>
      )}
      {dialog === 'revise' && current && (
        <ReasonDialog title={`${t('claim.action.revise')} · ${current.documentNo}`} confirmLabel={t('claim.action.revise')} busy={act.isPending} error={dialogError}
          hint={t('claim.reviseHint')}
          onConfirm={(reason) => run('revise', { reason: reason.trim() || null }, (c) => router.push(`/fleet/insurance-claims/${c.insuranceClaimId}`))}
          onClose={() => setDialog(null)} />
      )}
    </>
  )
}
