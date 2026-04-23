'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { InsuranceClaim, InsuranceClaimFormValues } from '@/types/insurance-claim'
import { insuranceClaimSchema } from '@/types/insurance-claim'
import { useInsuranceClaim } from '@/lib/hooks/useInsuranceClaim'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ClaimHeaderSection } from '@/components/insurance-claims/sections/ClaimHeaderSection'
import { ClaimLinesSection } from '@/components/insurance-claims/sections/ClaimLinesSection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  claim: InsuranceClaim
  claimID: string
  isNew: boolean
}

export function InsuranceClaimFormClient({ claim, claimID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useInsuranceClaim(claimID)
  const { success, error } = useToastStore()

  const form = useForm<InsuranceClaimFormValues>({
    resolver: zodResolver(insuranceClaimSchema) as any,
    defaultValues: claim,
  })

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values, claim.lines)
      success('Insurance claim saved', `${saved.documentNo} has been saved.`)
      form.reset({ ...saved })
      if (isNew) router.push(`/fleet/insurance-claims/${saved.claimID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Insurance claim has been removed.')
      router.push('/fleet/insurance-claims')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const documentNo = watch('documentNo')
  const title = isNew ? 'New Insurance Claim' : documentNo || 'Insurance Claim'

  const tabs = [
    {
      id: 'header',
      label: 'Claim Details',
      content: <ClaimHeaderSection form={form} isNew={isNew} lines={claim.lines} />,
    },
    {
      id: 'lines',
      label: 'Line Items',
      content: <ClaimLinesSection lines={claim.lines} />,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Record a new insurance claim' : `Claim ID: ${claimID}`}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting ? t('common.loading') : t('common.delete')}
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
              disabled={isSaving || !isDirty}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        }
      />
      <ConfirmDialog
        open={showDelete}
        title="Delete Insurance Claim"
        message="Delete this insurance claim? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
