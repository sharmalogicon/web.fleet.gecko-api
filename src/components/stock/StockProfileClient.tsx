'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { StockFormValues } from '@/types/stock'
import { stockSchema } from '@/types/stock'
import { ITEM_API_TO_FORM, normaliseItemErrors, useSaveItem, type StockView } from '@/lib/api/fleet/items'
import type { WarehouseDto } from '@/lib/api/fleet/warehouses'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { handleSaveError } from '@/lib/api/saveErrors'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FormLayout } from '@/components/shared/FormLayout'
import { GeneralInfoSection } from '@/components/stock/sections/GeneralInfoSection'
import { InventorySection } from '@/components/stock/sections/InventorySection'
import { useT } from '@/i18n/I18nContext'

interface Props {
  stock: StockFormValues
  current?: StockView
  /** The header branch's default store: the reorder fields write its policy (null = none, inputs disabled). */
  warehouse: WarehouseDto | null
  isNew: boolean
}

export function StockProfileClient({ stock, current, warehouse, isNew }: Props) {
  const { t } = useT()
  const router = useRouter()
  const save = useSaveItem()
  const toast = useToastStore()
  const [banner, setBanner] = useState<string | null>(null)
  const canManage = useFleetAccess().canAnywhere('fleet.inventory.manage')

  const form = useForm<StockFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(stockSchema) as any,
    defaultValues: stock,
  })

  const {
    handleSubmit,
    formState: { isDirty },
  } = form

  const handleSave = handleSubmit(async (values) => {
    setBanner(null)
    try {
      const saved = await save.mutateAsync({ values, current, defaultWarehouseId: warehouse?.warehouseId ?? null })
      toast.success('Stock saved', `${saved.itemCode} has been saved.`)
      if (isNew) router.push(`/master/stock/${saved.itemId}`)
    } catch (err) {
      // `stockPolicies[0].minQty` → the Min Stock input.
      const e = err instanceof ApiError ? new ApiError(err.status, err.message, normaliseItemFields(err.fieldErrors), err.code) : err
      handleSaveError(e, { setError: form.setError, apiToForm: ITEM_API_TO_FORM, setBanner, t, toast })
    }
  })

  const code = form.watch('code')
  const title = isNew ? `${t('common.new')} ${t('nav.stock')}` : code || t('nav.stock')

  const tabs = [
    {
      id: 'general',
      label: t('form.general'),
      content: (
        <>
          {banner && <div role="alert" className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
          <GeneralInfoSection form={form} isNew={isNew} warehouse={warehouse} />
        </>
      ),
    },
    {
      id: 'inventory',
      label: t('nav.inventory'),
      content: <InventorySection form={form} warehouse={warehouse} />,
    },
  ]

  return (
    <FormLayout
      title={title}
      subtitle={isNew ? 'Register new stock item' : current?.code}
      tabs={tabs}
      isNew={isNew}
      actions={
        <div className="flex items-center gap-2">
          {/* No delete in the API: switch the item off instead (prompt 07). */}
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

/** ApiError field errors with `[n]` indexes removed (see normaliseItemErrors). */
function normaliseItemFields(fields: Record<string, string[]>): Record<string, string[]> {
  const flat: Record<string, string> = {}
  for (const [k, v] of Object.entries(fields)) flat[k] = v[0]
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(normaliseItemErrors(flat))) out[k] = [v]
  return out
}
