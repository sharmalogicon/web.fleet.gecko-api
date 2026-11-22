'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/shared/FormLayout'
import { ReasonDialog, ToolbarButton } from '@/components/shared/ReasonDialog'
import { PartyCodeInput } from '@/components/shared/PartyInputs'
import { AttachmentsTab } from '@/components/shared/AttachmentsTab'
import { Alert, useDocActions } from '@/components/docs/DocBits'
import { AccidentGeneralSection } from '@/components/accidents/sections/AccidentGeneralSection'
import { AccidentLocationSection } from '@/components/accidents/sections/AccidentLocationSection'
import {
  ACCIDENT_API_TO_FORM, ACCIDENT_STATUS_TONE, accidentActions, accidentFormSchema, useAccidentAction, useSaveAccident,
  type AccidentDto, type AccidentFormValues,
} from '@/lib/api/fleet/accidents'
import { ACCIDENT_STAGES } from '@/lib/api/fleet/woAttachments'
import { PRIORITIES } from '@/lib/api/fleet/workRequests'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { handleSaveError } from '@/lib/api/saveErrors'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

interface Props {
  record: AccidentFormValues
  current?: AccidentDto
  isNew: boolean
}

const input = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/** Same three tabs. Status is the API's; Raise work request / Close / Cancel are toolbar actions; no Delete. */
export function AccidentFormClient({ record, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const { canAt, canAnywhere } = useFleetAccess()
  const save = useSaveAccident()
  const act = useAccidentAction()
  const docs = useDocActions(act, current?.accidentId, current?.rowVersion)
  const [banner, setBanner] = useState<string | null>(null)
  const [wrOpen, setWrOpen] = useState(false)
  const [wrError, setWrError] = useState<string | null>(null)
  const [wr, setWr] = useState({ priority: 'HIGH', meterKm: '', billTo: '' })

  const form = useForm<AccidentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(accidentFormSchema) as any,
    defaultValues: record,
  })
  const { handleSubmit, formState: { isDirty } } = form

  const branchId = current?.branchId
  const can = {
    manage: branchId ? canAt('fleet.incident.manage', branchId) : canAnywhere('fleet.incident.manage'),
    raiseWr: !!branchId && canAt('fleet.workrequest.create', branchId),
  }
  const allowed = accidentActions(current, can)
  const busy = save.isPending || act.isPending

  const doSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await save.mutateAsync({ values, current })
      toast.success('Accident report saved', `${saved.documentNo} has been saved.`)
      if (isNew) router.push(`/fleet/accidents/${saved.accidentId}`)
    } catch (e) {
      handleSaveError(e, { setError: form.setError, apiToForm: ACCIDENT_API_TO_FORM, setBanner, t, toast })
    }
  })

  const raiseWr = (problem: string) => {
    if (!current) return
    setWrError(null)
    act.mutate(
      {
        id: current.accidentId,
        action: 'work-request',
        body: {
          priority: wr.priority, problem: problem.trim() || null, meterKm: wr.meterKm ? Number(wr.meterKm) : null,
          billToPartyCode: wr.billTo.trim() || null, rowVersion: current.rowVersion,
        },
      },
      {
        onSuccess: (a) => { toast.success(t('accident.done.workRequest'), a.workRequestNo ?? ''); setWrOpen(false) },
        onError: (e) => setWrError(errorText(e, t)),
      },
    )
  }

  const title = isNew ? `${t('common.new')} ${t('nav.accidents')}` : current?.documentNo ?? t('nav.accidents')

  const tabs = [
    {
      id: 'general',
      label: t('form.accidentInfo'),
      content: (
        <>
          {banner && <div className="mb-4"><Alert>{banner}</Alert></div>}
          {current && (
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ACCIDENT_STATUS_TONE[current.status] ?? ''}`}>{t(`accident.status.${current.status}`)}</span>
              {current.cancelReason && <span>{t('fuel.cancelReason')}: {current.cancelReason}</span>}
            </div>
          )}
          <AccidentGeneralSection form={form} isNew={isNew} editable={allowed.save} current={current} />
        </>
      ),
    },
    { id: 'location', label: t('form.location'), content: <AccidentLocationSection form={form} editable={allowed.save} /> },
    {
      id: 'photos',
      label: t('form.photos'),
      content: current ? (
        <AttachmentsTab owner={{ kind: 'accidents', id: current.accidentId }} stages={ACCIDENT_STAGES} defaultStage="DAMAGE"
          stageKey="accident.photo.stage" canManage={can.manage} />
      ) : (
        <p className="text-sm text-gray-500">{t('accident.photosAfterSave')}</p>
      ),
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Record a new accident report' : `${current?.assetCode}${current?.registrationNo ? ` · ${current.registrationNo}` : ''}`}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {allowed.cancel && current && (
              <ToolbarButton tone="danger" disabled={busy} onClick={() => docs.ask('cancel', `${t('accident.action.cancel')} · ${current.documentNo}`, true)}>
                {t('accident.action.cancel')}
              </ToolbarButton>
            )}
            {allowed.close && (
              <span title={allowed.closeBlocked ? t('accident.closeBlocked') : undefined}>
                <ToolbarButton tone="success" disabled={busy || allowed.closeBlocked} onClick={() => docs.run('close')}>{t('accident.action.close')}</ToolbarButton>
              </span>
            )}
            {allowed.raiseWr && (
              <ToolbarButton tone="primary" disabled={busy || isDirty} onClick={() => { setWrError(null); setWrOpen(true) }}>{t('accident.action.workRequest')}</ToolbarButton>
            )}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {allowed.save && (
              <ToolbarButton tone="primary" disabled={busy || !isDirty} onClick={() => doSave()}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>
            )}
          </div>
        }
      />
      {docs.dialogNode}
      {wrOpen && current && (
        <ReasonDialog
          title={`${t('accident.action.workRequest')} · ${current.documentNo}`}
          confirmLabel={t('accident.action.workRequest')}
          busy={act.isPending}
          error={wrError}
          hint={t('accident.workRequestHint')}
          reasonLabel={t('accident.problem')}
          onConfirm={raiseWr}
          onClose={() => setWrOpen(false)}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">Priority
              <select value={wr.priority} onChange={(e) => setWr({ ...wr, priority: e.target.value })} className={input}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">{t('form.odometer')}
              <input type="number" min="0" value={wr.meterKm} onChange={(e) => setWr({ ...wr, meterKm: e.target.value })} className={input} />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-700">{t('accident.billTo')}
              <PartyCodeInput id="acc-wr-billto" value={wr.billTo} onChange={(v) => setWr({ ...wr, billTo: v })} className={input} placeholder={t('accident.billToHint')} />
            </label>
          </div>
        </ReasonDialog>
      )}
    </>
  )
}
