'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { Transporter, TransporterFormValues } from '@/types/transporter'
import { transporterSchema } from '@/types/transporter'
import { useTransporter } from '@/lib/hooks/useTransporter'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useT } from '@/i18n/I18nContext'

interface Props {
  transporter: Transporter | TransporterFormValues
  transporterID: string
  isNew: boolean
}

function Field({
  label,
  error,
  children,
  colSpan,
}: {
  label: string
  error?: string
  children: React.ReactNode
  colSpan?: number
}) {
  return (
    <div
      className="flex flex-col gap-1"
      style={colSpan ? { gridColumn: `span ${colSpan}` } : undefined}
    >
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function inputClass(hasError?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  } bg-white`
}

export function TransporterFormClient({ transporter, transporterID, isNew }: Props) {
  const { t } = useT()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useTransporter(transporterID)
  const { success, error } = useToastStore()

  const form = useForm<TransporterFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(transporterSchema) as any,
    defaultValues: transporter as TransporterFormValues,
  })

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = form

  const isActive = watch('isActive')

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Transporter saved', `${saved.transporterName} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/master/transporters/${saved.transporterID}`)
    } catch {
      error('Save failed', 'An error occurred. Please try again.')
    }
  })

  const handleDelete = async () => {
    const name = form.getValues('transporterName')
    try {
      await remove()
      success('Transporter deleted', `${name} has been removed.`)
      router.push('/master/transporters')
    } catch {
      error('Delete failed', 'An error occurred. Please try again.')
    } finally {
      setShowDeleteDialog(false)
    }
  }

  const name = form.watch('transporterName')
  const title = isNew ? 'New Transporter' : name || 'Transporter'

  const registrationContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Transporter Name *" error={errors.transporterName?.message} colSpan={2}>
        <input
          {...register('transporterName')}
          className={inputClass(!!errors.transporterName)}
          placeholder="Company or individual name"
        />
      </Field>

      <Field label="Registration No. *" error={errors.registrationNo?.message}>
        <input
          {...register('registrationNo')}
          className={inputClass(!!errors.registrationNo)}
          placeholder="TR-001"
        />
      </Field>

      <Field label="Mobile No.">
        <input
          {...register('mobileNo')}
          className={inputClass()}
          placeholder="02-000-0000"
        />
      </Field>

      <Field label="Email" error={errors.emailID?.message}>
        <input
          {...register('emailID')}
          type="email"
          className={inputClass(!!errors.emailID)}
          placeholder="contact@company.com"
        />
      </Field>

      <Field label="Active">
        <div className="flex items-center gap-2 h-[38px]">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setValue('isActive', !isActive, { shouldDirty: true })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isActive ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600">{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </Field>

      <Field label="Billing Address" colSpan={3}>
        <textarea
          {...register('billingAddress')}
          rows={3}
          className={`${inputClass()} resize-none`}
          placeholder="Full billing address…"
        />
      </Field>
    </div>
  )

  const tabs = [
    {
      id: 'registration',
      label: 'Registration',
      content: registrationContent,
    },
  ]

  return (
    <>
      <FormLayout
        title={title}
        subtitle={isNew ? 'Register new transporter' : transporterID}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
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
        open={showDeleteDialog}
        title="Delete Transporter"
        message={`Are you sure you want to delete "${form.getValues('transporterName')}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        destructive
      />
    </>
  )
}
