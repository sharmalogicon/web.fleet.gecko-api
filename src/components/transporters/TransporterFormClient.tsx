'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import type { TransporterFormValues } from '@/types/transporter'
import { transporterSchema } from '@/types/transporter'
import { mapFieldErrors, useSaveTransporter, type TransporterView } from '@/lib/api/platform/suppliers'
import { useAuth } from '@/lib/contexts/AuthContext'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { useT } from '@/i18n/I18nContext'

interface Props {
  transporter: TransporterFormValues
  /** The loaded supplier (absent for "new"). */
  current?: TransporterView
  isNew: boolean
}

/** A party with other roles keeps its party fields (read-only here): the required-field rules do not apply. */
const lockedSchema = transporterSchema.extend({ transporterName: z.string(), registrationNo: z.string().optional() })

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
  } bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed`
}

export function TransporterFormClient({ transporter, current, isNew }: Props) {
  const { t } = useT()
  const { can } = useAuth()
  const router = useRouter()
  const saveTransporter = useSaveTransporter()
  const isSaving = saveTransporter.isPending
  const { success, error, warning } = useToastStore()
  const [banner, setBanner] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const canManage = can('mdm.supplier.manage')
  // Other roles (customer, …): the party fields are edited on the party screen. A 403 on save says the same.
  const partyLocked = !!current?.partyLocked || forbidden
  const locked = !canManage || partyLocked

  const form = useForm<TransporterFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(partyLocked ? lockedSchema : transporterSchema) as any,
    defaultValues: transporter,
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
    setBanner(null)
    try {
      const saved = await saveTransporter.mutateAsync({ values, current })
      success('Transporter saved', `${saved.transporterName} has been saved.`)
      if (isNew) router.push(`/master/transporters/${encodeURIComponent(saved.partyCode)}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        warning(t('equipment.conflict'), errorText(err, t))
        return
      }
      if (err instanceof ApiError && err.status === 403) {
        // e.g. "… is also a customer …": the party fields are edited on the party screen.
        setForbidden(true)
        setBanner(errorText(err, t))
        error('Save failed', errorText(err, t))
        return
      }
      if (err instanceof ApiError && err.status === 400) {
        const { fields, other } = mapFieldErrors(err.fieldMap)
        for (const [name, message] of Object.entries(fields)) form.setError(name as keyof TransporterFormValues, { message })
        setBanner(other.length ? other.join(' ') : Object.keys(fields).length ? null : errorText(err, t))
        error('Save failed', t('equipment.checkFields'))
        return
      }
      setBanner(errorText(err, t))
      error('Save failed', errorText(err, t))
    }
  })

  const name = form.watch('transporterName')
  const title = isNew ? `${t('common.new')} ${t('nav.transporters')}` : name || t('nav.transporters')

  const registrationContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div role="alert" className="lg:col-span-3 sm:col-span-2 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
      {partyLocked && !banner && (
        <p className="lg:col-span-3 sm:col-span-2 text-xs text-gray-500">
          {t('transporter.partyLocked').replace('{roles}', current?.otherRoles.join(', ') ?? '')}
        </p>
      )}
      <Field label="Transporter Name *" error={errors.transporterName?.message} colSpan={2}>
        <input
          {...register('transporterName')}
          disabled={locked}
          className={inputClass(!!errors.transporterName)}
          placeholder="Company or individual name"
        />
      </Field>

      <Field label="Registration No. *" error={errors.registrationNo?.message}>
        <input
          {...register('registrationNo')}
          disabled={locked}
          className={inputClass(!!errors.registrationNo)}
          placeholder="TR-001"
        />
      </Field>

      <Field label="Mobile No.">
        <input
          {...register('mobileNo')}
          disabled={locked}
          className={inputClass()}
          placeholder="02-000-0000"
        />
      </Field>

      <Field label="Email" error={errors.emailID?.message}>
        <input
          {...register('emailID')}
          disabled={locked}
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
            disabled={locked}
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
          disabled={locked}
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
        subtitle={isNew ? 'Register new transporter' : current?.partyCode}
        tabs={tabs}
        isNew={isNew}
        actions={
          <div className="flex items-center gap-2">
            {/* No delete here: set the transporter inactive (prompt 06). */}
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
              disabled={isSaving || !isDirty || !canManage}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        }
      />
    </>
  )
}
