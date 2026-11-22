'use client'

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { FormLayout } from '@/components/shared/FormLayout'
import { TransferTargetsTab } from '@/components/stores/TransferTargetsTab'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { Field, inputClass } from '@/components/shared/FormField'
import { useT } from '@/i18n/I18nContext'
import {
  STORE_API_TO_FORM, WAREHOUSE_KINDS, storeSchema, useSaveStore, type StoreFormValues, type WarehouseDto,
} from '@/lib/api/fleet/warehouses'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { handleSaveError } from '@/lib/api/saveErrors'
import { useToastStore } from '@/lib/stores/useToastStore'

interface Props {
  values: StoreFormValues
  current?: WarehouseDto
  isNew: boolean
}

/** Store form in the Master form pattern; bins as the shared inline table (prompt 04). No deletes: inactive. */
export function StoreFormClient({ values, current, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const save = useSaveStore()
  const { branches } = useBranchContext()
  const { canAt } = useFleetAccess()
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<StoreFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(storeSchema) as any,
    defaultValues: values,
  })
  const { register, control, handleSubmit, watch, formState: { errors, isDirty } } = form
  const bins = useFieldArray({ control, name: 'bins' })
  const branchId = watch('branchId')
  const canManage = canAt('fleet.inventory.manage', branchId)

  const handleSave = handleSubmit(async (v) => {
    setBanner(null)
    try {
      const saved = await save.mutateAsync({ values: v, current })
      toast.success(t('store.saved'), `${saved.warehouseCode} · ${saved.nameEn}`)
      if (isNew) router.push(`/master/stores/${saved.warehouseId}`)
    } catch (err) {
      handleSaveError(err, { setError: form.setError, apiToForm: STORE_API_TO_FORM, setBanner, t, toast })
    }
  })

  const title = isNew ? `${t('common.new')} ${t('nav.stores')}` : `${current?.warehouseCode} · ${current?.nameEn}`

  const general = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div role="alert" className="sm:col-span-2 lg:col-span-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
      <Field label={`${t('store.code')} *`} error={errors.warehouseCode?.message}>
        <input {...register('warehouseCode')} className={`${inputClass(!!errors.warehouseCode)} uppercase`} placeholder="MAIN01" />
      </Field>
      <Field label={`${t('store.nameEn')} *`} error={errors.nameEn?.message}>
        <input {...register('nameEn')} className={inputClass(!!errors.nameEn)} />
      </Field>
      <Field label={t('store.nameLocal')} error={errors.nameLocal?.message}>
        <input {...register('nameLocal')} className={inputClass(!!errors.nameLocal)} />
      </Field>
      <Field label={`${t('technician.branch')} *`} error={errors.branchId?.message} hint={isNew ? undefined : t('store.branchFixed')}>
        <select {...register('branchId')} disabled={!isNew} className={inputClass(!!errors.branchId, !isNew)}>
          <option value="">— Select —</option>
          {branches.map((b) => <option key={b.branchId} value={b.branchId}>{b.branchCode} · {b.displayName}</option>)}
        </select>
      </Field>
      <Field label={`${t('store.kindLabel')} *`} error={errors.warehouseKind?.message}>
        <select {...register('warehouseKind')} className={inputClass(!!errors.warehouseKind)}>
          {WAREHOUSE_KINDS.map((k) => <option key={k} value={k}>{t(`store.kind.${k}`)}</option>)}
        </select>
      </Field>
      <Field label={t('store.flags')} hint={t('store.defaultHint')}>
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('isDefault')} className="w-4 h-4 rounded border-gray-300 text-blue-600" /> {t('store.isDefault')}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('isActive')} className="w-4 h-4 rounded border-gray-300 text-blue-600" /> {t('common.active')}
          </label>
        </div>
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <Field label={t('common.remarks')} error={errors.remarks?.message}>
          <textarea {...register('remarks')} rows={2} className={`${inputClass(!!errors.remarks)} resize-none`} />
        </Field>
      </div>
    </div>
  )

  const binsTable = (
    <LineItemsEditor
      items={bins.fields}
      getKey={(f) => f.id}
      columns={[
        {
          id: 'code',
          header: `${t('store.binCode')} *`,
          className: 'w-48',
          cell: (f, i) => (
            <input
              {...register(`bins.${i}.binCode`)}
              aria-label={`${t('store.binCode')} ${i + 1}`}
              className={`${inputClass(!!errors.bins?.[i]?.binCode)} uppercase`}
              placeholder="A-01-01"
            />
          ),
        },
        {
          id: 'description',
          header: t('common.description'),
          cell: (_f, i) => <input {...register(`bins.${i}.description`)} aria-label={`${t('common.description')} ${i + 1}`} className={inputClass()} />,
        },
        {
          id: 'active',
          header: t('common.active'),
          className: 'w-24',
          cell: (_f, i) => <input type="checkbox" {...register(`bins.${i}.isActive`)} aria-label={`${t('common.active')} ${i + 1}`} className="mt-2 w-4 h-4 rounded border-gray-300 text-blue-600" />,
        },
      ]}
      onAdd={() => bins.append({ binCode: '', description: '', isActive: true })}
      // Only bins not yet saved can be removed; saved bins are switched off instead.
      onRemove={(i) => (bins.fields[i].binId ? form.setValue(`bins.${i}.isActive`, false, { shouldDirty: true }) : bins.remove(i))}
      addLabel={t('store.addBin')}
      removeLabel={t('store.removeBin')}
      emptyText={t('store.noBins')}
      rowError={(i) => {
        const m = errors.bins?.[i]?.binCode?.message ?? errors.bins?.[i]?.description?.message
        return m ? t(m) : undefined
      }}
      error={errors.bins?.message ? t(errors.bins.message) : undefined}
    />
  )

  return (
    <FormLayout
      title={title}
      subtitle={isNew ? t('store.newSubtitle') : undefined}
      tabs={[
        { id: 'general', label: t('form.general'), content: general },
        { id: 'bins', label: t('store.bins'), content: binsTable },
        // Saved stores only: the list is its own endpoint and save (owner-approved 2026-11-22).
        ...(current ? [{ id: 'targets', label: t('store.targets.tab'), content: <TransferTargetsTab store={current} canManage={canManage} /> }] : []),
      ]}
      isNew={isNew}
      actions={
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={save.isPending || !isDirty || !canManage}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {save.isPending ? t('common.loading') : t('common.save')}
          </button>
        </div>
      }
    />
  )
}
