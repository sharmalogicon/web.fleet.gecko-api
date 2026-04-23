'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { CustomerRate, CustomerRateFormValues } from '@/types/customer-rate'
import { customerRateSchema } from '@/types/customer-rate'
import { useCustomerRate } from '@/lib/hooks/useCustomerRate'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RateHeaderSection } from '@/components/customer-rates/sections/RateHeaderSection'
import { RateLinesSection } from '@/components/customer-rates/sections/RateLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  rate: CustomerRate
  rateID: string
  isNew: boolean
}

export function CustomerRateFormClient({ rate, rateID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [isApproved, setIsApproved] = useState(rate.isApproved)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useCustomerRate(rateID)
  const { success, error } = useToastStore()

  const form = useForm<CustomerRateFormValues>({
    resolver: zodResolver(customerRateSchema) as any,
    defaultValues: rate,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, rate.lines, isApproved)
      success('Customer rate saved', `${saved.quotationNo} has been saved.`)
      form.reset({ ...saved })
      if (isNew) router.push(`/tariff/customer-rates/${saved.customerRateID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleApprove = handleSubmit(async (values) => {
    try {
      const saved = await save(values, rate.lines, true)
      setIsApproved(true)
      success('Rate approved', `${saved.quotationNo} has been approved.`)
      form.reset({ ...saved })
      if (isNew) router.push(`/tariff/customer-rates/${saved.customerRateID}`)
    } catch {
      error('Approve failed', 'An error occurred.')
    } finally {
      setShowApprove(false)
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Customer rate has been removed.')
      router.push('/tariff/customer-rates')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const quotationNo = watch('quotationNo')
  const title = isNew ? 'New Customer Rate' : quotationNo || 'Customer Rate'

  const tabs = [
    {
      id: 'header',
      label: 'Rate Details',
      content: <RateHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: 'Charge Details',
      content: <RateLinesSection lines={rate.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new customer rate quotation' : `Rate ID: ${rateID}`}
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
            {!isApproved && (
              <button
                type="button"
                onClick={() => setShowApprove(true)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-green-400 text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                {t('common.approve')}
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
              disabled={isSaving || (!isDirty && !isNew)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        }
      />
      <ConfirmDialog
        open={showDelete}
        title="Delete Customer Rate"
        message="Delete this customer rate? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
      <ConfirmDialog
        open={showApprove}
        title="Approve Customer Rate"
        message={`Approve quotation "${watch('quotationNo')}"? Once approved it cannot be deleted.`}
        confirmLabel="Approve"
        onConfirm={handleApprove}
        onCancel={() => setShowApprove(false)}
        destructive={false}
      />
    </>
  )
}
