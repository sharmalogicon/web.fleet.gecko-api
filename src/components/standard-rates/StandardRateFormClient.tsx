'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { StandardRate, StandardRateFormValues } from '@/types/standard-rate'
import { standardRateSchema } from '@/types/standard-rate'
import { useStandardRate } from '@/lib/hooks/useStandardRate'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StandardRateHeaderSection } from '@/components/standard-rates/sections/StandardRateHeaderSection'
import { StandardRateLinesSection } from '@/components/standard-rates/sections/StandardRateLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  rate: StandardRate
  rateID: string
  isNew: boolean
}

export function StandardRateFormClient({ rate, rateID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [isApproved, setIsApproved] = useState(rate.isApproved)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useStandardRate(rateID)
  const { success, error } = useToastStore()

  const form = useForm<StandardRateFormValues>({
    resolver: zodResolver(standardRateSchema) as any,
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
      success('Standard rate saved', `${saved.rateCode} has been saved.`)
      form.reset({ ...saved })
      if (isNew) router.push(`/tariff/standard-rates/${saved.standardRateID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleApprove = handleSubmit(async (values) => {
    try {
      const saved = await save(values, rate.lines, true)
      setIsApproved(true)
      success('Rate approved', `${saved.rateCode} has been approved.`)
      form.reset({ ...saved })
      if (isNew) router.push(`/tariff/standard-rates/${saved.standardRateID}`)
    } catch {
      error('Approve failed', 'An error occurred.')
    } finally {
      setShowApprove(false)
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Standard rate has been removed.')
      router.push('/tariff/standard-rates')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const rateCode = watch('rateCode')
  const title = isNew ? `${t('common.new')} ${t('nav.standardRates')}` : rateCode || t('nav.standardRates')

  const tabs = [
    {
      id: 'header',
      label: t('form.rateHeader'),
      content: <StandardRateHeaderSection form={form} isNew={isNew} />,
    },
    {
      id: 'lines',
      label: t('form.rateLines'),
      content: <StandardRateLinesSection lines={rate.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Create a new standard rate' : `Rate ID: ${rateID}`}
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
        title="Delete Standard Rate"
        message="Delete this standard rate? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
      <ConfirmDialog
        open={showApprove}
        title="Approve Standard Rate"
        message={`Approve rate "${watch('rateCode')}"? Once approved it cannot be deleted.`}
        confirmLabel="Approve"
        onConfirm={handleApprove}
        onCancel={() => setShowApprove(false)}
        destructive={false}
      />
    </>
  )
}
