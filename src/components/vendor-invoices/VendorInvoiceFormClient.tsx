'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/shared/FormLayout'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { Alert, useDocActions } from '@/components/docs/DocBits'
import { InvoiceHeaderSection } from '@/components/vendor-invoices/sections/InvoiceHeaderSection'
import { InvoiceLinesSection } from '@/components/vendor-invoices/sections/InvoiceLinesSection'
import { CostCorrections } from '@/components/docs/CostCorrections'
import {
  INVOICE_API_TO_FORM, INVOICE_STATUS_TONE, invoiceActions, invoiceFormSchema, useSaveVendorInvoice, useVendorInvoiceAction,
  type InvoiceFormValues, type VendorInvoiceDto,
} from '@/lib/api/fleet/vendorInvoices'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useAuth } from '@/lib/contexts/AuthContext'
import { handleSaveError } from '@/lib/api/saveErrors'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

interface Props {
  record: InvoiceFormValues
  current?: VendorInvoiceDto
  isNew: boolean
}

/**
 * Same two tabs. Save (DRAFT) / Save & submit: all lines matched → APPROVED at once, else PENDING_APPROVAL.
 * Approve / Send back (not by the person who keyed it), Cancel (not once exported / paid), Record payment.
 */
export function VendorInvoiceFormClient({ record, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const { user } = useAuth()
  const { canAt } = useFleetAccess()
  const save = useSaveVendorInvoice()
  const act = useVendorInvoiceAction()
  const docs = useDocActions(act, current?.vendorInvoiceId, current?.rowVersion)
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<InvoiceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: record,
  })
  const { handleSubmit, watch, formState: { isDirty } } = form

  const branchId = current?.branchId ?? watch('branchId')
  const can = { manage: canAt('fleet.vendorinvoice.manage', branchId), approve: !!current && canAt('fleet.vendorinvoice.approve', branchId) }
  const allowed = invoiceActions(current, can, user?.userId)
  const busy = save.isPending || act.isPending

  const doSave = (submit: boolean) =>
    handleSubmit(async (values) => {
      setBanner(null)
      try {
        let saved = current && !isDirty ? current : await save.mutateAsync({ values, current, submit: submit && !current })
        if (submit && current) saved = await act.mutateAsync({ id: saved.vendorInvoiceId, action: 'submit', body: { reason: null, rowVersion: saved.rowVersion } })
        toast.success(submit ? t(`vinv.status.${saved.status}`) : 'Vendor invoice saved', `${saved.documentNo} · ${saved.vendorInvoiceNo}`)
        if (isNew) router.push(`/invoice/vendor/${saved.vendorInvoiceId}`)
      } catch (e) {
        handleSaveError(e, { setError: form.setError, apiToForm: INVOICE_API_TO_FORM, setBanner, t, toast })
      }
    })()

  const title = isNew ? `${t('common.new')} ${t('nav.vendorInvoices')}` : current?.documentNo ?? t('nav.vendorInvoices')
  const lineCount = watch('lines').length

  const tabs = [
    {
      id: 'header',
      label: t('form.invoiceHeader'),
      content: (
        <>
          {banner && <div className="mb-4"><Alert>{banner}</Alert></div>}
          {current && (
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${INVOICE_STATUS_TONE[current.status] ?? ''}`}>{t(`vinv.status.${current.status}`)}</span>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${current.matchStatus === 'MATCHED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {t(`vinv.match.${current.matchStatus}`)}
              </span>
              {current.approvalNote && <span className="text-amber-700">{t('vinv.approvalNote')}: {current.approvalNote}</span>}
              {current.cancelReason && <span>{t('fuel.cancelReason')}: {current.cancelReason}</span>}
              {current.erpDocNum && <span className="font-mono">ERP {current.erpDocNum}</span>}
              {current.erpError && <span className="text-red-600">{current.erpError}</span>}
            </div>
          )}
          <InvoiceHeaderSection form={form} isNew={isNew} editable={allowed.save} current={current} />
          {/* Stock cost corrections from price variance (prompt 20), once approved. */}
          {current && ['APPROVED', 'EXPORTED', 'PAID', 'CANCELLED'].includes(current.status) && (
            <div className="mt-6"><CostCorrections vendorInvoiceId={current.vendorInvoiceId} hideEmpty /></div>
          )}
        </>
      ),
    },
    { id: 'lines', label: `${t('form.lineItems')} (${lineCount})`, content: <InvoiceLinesSection form={form} editable={allowed.save} /> },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new vendor invoice' : `${current?.supplierName} · ${current?.vendorInvoiceNo}`}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {allowed.cancel && current && (
              <ToolbarButton tone="danger" disabled={busy} onClick={() => docs.ask('cancel', `${t('vinv.action.cancel')} · ${current.documentNo}`, true)}>{t('vinv.action.cancel')}</ToolbarButton>
            )}
            {allowed.sendBack && current && (
              <ToolbarButton tone="danger" disabled={busy}
                onClick={() => docs.ask('approval', `${t('vinv.action.sendBack')} · ${current.documentNo}`, true, (reason) => ({ decision: 'REJECTED', reason }))}>
                {t('vinv.action.sendBack')}
              </ToolbarButton>
            )}
            {allowed.approve && current && (
              <ToolbarButton tone="success" disabled={busy}
                onClick={() => docs.ask('approval', `${t('vinv.action.approve')} · ${current.documentNo}`, false, (reason) => ({ decision: 'APPROVED', reason: reason || null }))}>
                {t('vinv.action.approve')}
              </ToolbarButton>
            )}
            {allowed.pay && current && (
              <ToolbarButton disabled={busy} onClick={() => router.push(`/invoice/vendor-payments/new?invoiceId=${current.vendorInvoiceId}`)}>{t('vpay.record')}</ToolbarButton>
            )}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {allowed.submit && <ToolbarButton disabled={busy} onClick={() => doSave(true)}>{t('vinv.action.submit')}</ToolbarButton>}
            {allowed.save && (
              <ToolbarButton tone="primary" disabled={busy || !isDirty} onClick={() => doSave(false)}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>
            )}
          </div>
        }
      />
      {docs.dialogNode}
    </>
  )
}
