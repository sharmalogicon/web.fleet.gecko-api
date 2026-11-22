'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/shared/FormLayout'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { Alert, useDocActions } from '@/components/docs/DocBits'
import { VendorCreditNoteHeaderSection } from '@/components/credit-notes/sections/VendorCreditNoteHeaderSection'
import { VendorCreditNoteLinesSection } from '@/components/credit-notes/sections/VendorCreditNoteLinesSection'
import {
  CN_API_TO_FORM, CN_STATUS_TONE, cnActions, cnFormSchema, useSaveVendorCreditNote, useVendorCreditNoteAction,
  type CnFormValues, type VendorCreditNoteDto,
} from '@/lib/api/fleet/vendorCreditNotes'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { handleSaveError } from '@/lib/api/saveErrors'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

interface Props {
  record: CnFormValues
  current?: VendorCreditNoteDto
  isNew: boolean
}

/** Same two tabs. DRAFT editable; Approve (fleet.vendorinvoice.approve) / Cancel as toolbar actions; no Delete. */
export function VendorCreditNoteFormClient({ record, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const { canAt } = useFleetAccess()
  const save = useSaveVendorCreditNote()
  const act = useVendorCreditNoteAction()
  const docs = useDocActions(act, current?.vendorCreditNoteId, current?.rowVersion)
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<CnFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(cnFormSchema) as any,
    defaultValues: record,
  })
  const { handleSubmit, watch, formState: { isDirty } } = form

  const branchId = current?.branchId ?? watch('branchId')
  const allowed = cnActions(current, { manage: canAt('fleet.vendorinvoice.manage', branchId), approve: !!current && canAt('fleet.vendorinvoice.approve', branchId) })
  const busy = save.isPending || act.isPending

  const doSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await save.mutateAsync({ values, current })
      toast.success('Vendor credit note saved', saved.documentNo)
      if (isNew) router.push(`/invoice/credit-notes/vendor/${saved.vendorCreditNoteId}`)
    } catch (e) {
      handleSaveError(e, { setError: form.setError, apiToForm: CN_API_TO_FORM, setBanner, t, toast })
    }
  })

  const tabs = [
    {
      id: 'header',
      label: t('form.header'),
      content: (
        <>
          {banner && <div className="mb-4"><Alert>{banner}</Alert></div>}
          {current && (
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CN_STATUS_TONE[current.status] ?? ''}`}>{t(`vcn.status.${current.status}`)}</span>
              {current.cancelReason && <span>{t('fuel.cancelReason')}: {current.cancelReason}</span>}
              {current.erpDocNum && <span className="font-mono">ERP {current.erpDocNum}</span>}
              {current.erpError && <span className="text-red-600">{current.erpError}</span>}
            </div>
          )}
          <VendorCreditNoteHeaderSection form={form} isNew={isNew} editable={allowed.save} current={current} />
        </>
      ),
    },
    { id: 'lines', label: `${t('form.lineItems')} (${watch('lines').length})`, content: <VendorCreditNoteLinesSection form={form} editable={allowed.save} /> },
  ]

  return (
    <>
      <FormLayout
        title={isNew ? `${t('common.new')} ${t('nav.creditNotesVendor')}` : current?.documentNo ?? ''}
        subtitle={isNew ? 'Create a new vendor credit note' : `${current?.supplierName} · ${current?.vendorCreditNoteNo ?? ''}`}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {allowed.cancel && current && (
              <ToolbarButton tone="danger" disabled={busy} onClick={() => docs.ask('cancel', `${t('vcn.action.cancel')} · ${current.documentNo}`, true)}>{t('vcn.action.cancel')}</ToolbarButton>
            )}
            {allowed.approve && (
              <ToolbarButton tone="success" disabled={busy || isDirty} onClick={() => docs.run('approve')}>{t('vcn.action.approve')}</ToolbarButton>
            )}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {allowed.save && (
              <ToolbarButton tone="primary" disabled={busy || !isDirty} onClick={() => doSave()}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>
            )}
          </div>
        }
      />
      {docs.dialogNode}
    </>
  )
}
