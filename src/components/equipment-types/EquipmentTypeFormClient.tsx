'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { EquipmentTypeRecord, EquipmentTypeFormValues } from '@/types/equipment-type'
import { equipmentTypeSchema } from '@/types/equipment-type'
import { useEquipmentType } from '@/lib/hooks/useEquipmentType'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useT } from '@/i18n/I18nContext'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function ic(err?: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-400' : 'border-gray-300'}`
}

interface Props {
  record: EquipmentTypeRecord | EquipmentTypeFormValues
  recordID: string
  isNew: boolean
}

export function EquipmentTypeFormClient({ record, recordID, isNew }: Props) {
  const { t } = useT()
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const { isSaving, isDeleting, save, remove } = useEquipmentType(recordID)
  const { success, error } = useToastStore()

  const form = useForm<EquipmentTypeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(equipmentTypeSchema) as any,
    defaultValues: record,
  })
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Saved', `${saved.equipmentTypeSize} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/master/equipment-types/${saved.equipmentTypeSizeID}`)
    } catch {
      error('Save failed', 'An error occurred.')
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Deleted', 'Equipment type has been removed.')
      router.push('/master/equipment-types')
    } catch {
      error('Delete failed', 'An error occurred.')
    } finally {
      setShowDelete(false)
    }
  }

  const size = watch('equipmentSize')
  const type = watch('equipmentType')
  const preview = size && type ? `${type}-${size}` : '—'

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Equipment Size *" error={errors.equipmentSize?.message}>
        <input
          {...register('equipmentSize')}
          disabled={!isNew}
          className={`${ic(!!errors.equipmentSize)} ${!isNew ? 'bg-gray-50 text-gray-500' : ''}`}
          placeholder="20, 40, 6W…"
        />
      </Field>
      <Field label="Equipment Type *" error={errors.equipmentType?.message}>
        <input
          {...register('equipmentType')}
          disabled={!isNew}
          className={`${ic(!!errors.equipmentType)} ${!isNew ? 'bg-gray-50 text-gray-500' : ''}`}
          placeholder="GP, HC, TRUCK…"
        />
      </Field>
      <Field label="Type-Size Code">
        <input
          value={preview}
          readOnly
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono"
        />
      </Field>
      <Field label="Description *" error={errors.description?.message}>
        <input {...register('description')} className={ic(!!errors.description)} />
      </Field>
      <Field label="Height">
        <input {...register('height')} className={ic()} placeholder="STD, HC…" />
      </Field>
      <Field label="ISO Code">
        <input {...register('isoCode')} className={ic()} />
      </Field>
      <Field label="TEU">
        <input {...register('teu')} className={ic()} placeholder="1, 2, 2.25…" />
      </Field>
      <Field label="Mapping Code">
        <input {...register('mappingCode')} className={ic()} />
      </Field>
      <Field label="Tare Weight (kg)">
        <input type="number" {...register('tareWeight')} className={ic()} />
      </Field>
      <Field label="Gross Weight (kg)">
        <input type="number" {...register('grossWeight')} className={ic()} />
      </Field>
      <Field label="Max Gross Weight (kg)">
        <input type="number" {...register('maxGrossWeight')} className={ic()} />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isContainer')}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">Is Container</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isReefer')}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">Is Reefer</span>
        </label>
      </div>
    </div>
  )

  return (
    <>
      <FormLayout
        title={isNew ? `${t('common.new')} ${t('nav.equipmentTypes')}` : preview}
        subtitle={isNew ? 'Define a new equipment type and size' : recordID}
        tabs={[{ id: 'detail', label: t('common.details'), content }]}
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
        title="Delete Equipment Type"
        message={`Delete "${preview}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        destructive
      />
    </>
  )
}
