'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { VendorPayment, VendorPaymentFormValues } from '@/types/vendor-payment'
import { vendorPaymentSchema } from '@/types/vendor-payment'
import { useVendorPayment } from '@/lib/hooks/useVendorPayment'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PaymentHeaderSection } from '@/components/vendor-payments/sections/PaymentHeaderSection'
import { PaymentLinesSection } from '@/components/vendor-payments/sections/PaymentLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  vendorPayment: VendorPayment
  vendorPaymentID: string
  isNew: boolean
}

export function VendorPaymentFormClient({ vendorPayment, vendorPaymentID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [currentPayment, setCurrentPayment] = useState<VendorPayment>(vendorPayment)
  const router = useRouter()
  const { isSaving, isDeleting, isApproving, save, approve, remove } = useVendorPayment(vendorPaymentID)
  const { success, error } = useToastStore()

  const form = useForm<VendorPaymentFormValues>({
    resolver: zodResolver(vendorPaymentSchema) as any,
    defaultValues: vendorPayment,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, currentPayment)
      success('Vendor payment saved', `${saved.receiptNo} has been saved.`)
      setCurrentPayment(saved)
      form.reset(saved)
      if (isNew) router.push(`/invoice/vendor-payments/${saved.vendorPaymentID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleApprove = async () => {
    try {
      const updated = await approve(currentPayment)
      success('Payment approved', `${updated.receiptNo} has been approved.`)
      setCurrentPayment(updated)
      form.reset(updated)
    } catch {
      error('Approval failed', 'An error occurred.')
    } finally {
      setShowApprove(false)
    }
  }

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Vendor payment has been removed.')
      router.push('/invoice/vendor-payments')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const receiptNo = watch('receiptNo')
  const title = isNew ? `${t('common.new')} ${t('nav.vendorPayments')}` : receiptNo || t('nav.vendorPayments')
  const isApproved = currentPayment.isApproved

  const tabs = [
    {
      id: 'header',
      label: t('form.header'),
      content: <PaymentHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: `${t('form.lineItems')} (${currentPayment.lines.length})`,
      content: <PaymentLinesSection lines={currentPayment.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={
          isNew
            ? 'Create a new vendor payment'
            : `${vendorPaymentID} · ${isApproved ? 'Approved' : 'Pending'}`
        }
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && !isApproved && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting ? t('common.loading') : t('common.delete')}
              </button>
            )}
            {!isNew && !isApproved && (
              <button
                type="button"
                onClick={() => setShowApprove(true)}
                disabled={isApproving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isApproving ? t('common.loading') : t('common.approve')}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty || isApproved}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        }
      />
      <ConfirmDialog
        open={showDelete}
        title="Delete Vendor Payment"
        message="Delete this vendor payment? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
      <ConfirmDialog
        open={showApprove}
        title="Approve Vendor Payment"
        message={`Approve payment ${currentPayment.receiptNo}? This will mark it as approved and lock further edits.`}
        confirmLabel="Approve"
        onConfirm={handleApprove}
        onCancel={() => setShowApprove(false)}
      />
    </>
  )
}
