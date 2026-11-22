'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import {
  deleteSetting, num, saveSetting, useEffectiveSettings, useFleetSettings, useSetupCatalogue, useSetupMutation,
  type EffectiveSetting, type FleetSetting, type SettingCatalogueItem,
} from '@/lib/api/fleet/setup'
import { Button, Chip, EmptyState, inputClass, LoadError, Loading, ScopeSelect, Section, Toggle, useFmt, useScopeLabel, useWriteErrors, type Tone } from './ui'

const SOURCE_TONE: Record<string, Tone> = { BRANCH: 'purple', TENANT: 'blue', DEFAULT: 'gray' }

/** Client check of a value against the catalogue (the API's Normalise). Returns an i18n key or null. */
export function settingValueError(def: SettingCatalogueItem | undefined, raw: string): { key: string; vars?: Record<string, string | number> } | null {
  const value = raw.trim()
  if (!value) return { key: 'fleetSetup.rule.valueRequired' }
  if (!def) return null
  if (def.valueType === 'INT' && !/^-?\d+$/.test(value)) return { key: 'fleetSetup.rule.int' }
  if (def.valueType === 'DECIMAL' && !/^-?\d+(\.\d+)?$/.test(value)) return { key: 'fleetSetup.rule.decimal' }
  if (def.valueType === 'INT' || def.valueType === 'DECIMAL') {
    const n = Number(value)
    const min = num(def.min)
    const max = num(def.max)
    if ((min !== null && n < min) || (max !== null && n > max)) return { key: 'fleetSetup.rule.range', vars: { min: min ?? '', max: max ?? '' } }
  }
  if (def.valueType === 'CODE' && def.allowedValues?.length && !def.allowedValues.includes(value.toUpperCase()))
    return { key: 'fleetSetup.rule.allowed', vars: { values: def.allowedValues.join(', ') } }
  return null
}

export function SettingsTab({ canManage }: { canManage: boolean }) {
  const { t, label } = useFmt()
  const [branchId, setBranchId] = useState<string | null>(null)
  const effective = useEffectiveSettings(branchId)
  const stored = useFleetSettings()
  const catalogue = useSetupCatalogue()

  const defOf = (code: string) => catalogue.data?.settings.find((s) => s.settingCode === code)
  const rowOf = (code: string, scope: string | null) =>
    stored.data?.find((r) => r.settingCode === code && (r.branchId ?? null) === scope)

  const col = createColumnHelper<EffectiveSetting>()
  const columns = [
    col.display({
      id: 'setting',
      header: t('fleetSetup.colSetting'),
      cell: ({ row: { original: s } }) => (
        <div className="flex flex-col gap-0.5 max-w-md">
          <span className="font-medium">{label(`fleetSetup.settingName.${s.settingCode}`, s.settingCode)}</span>
          <span className="text-xs text-gray-500 whitespace-normal">{label(`fleetSetup.settingDesc.${s.settingCode}`, s.description)}</span>
          <span className="text-[11px] text-gray-400 font-mono">{s.settingCode}</span>
        </div>
      ),
    }),
    col.display({
      id: 'value',
      header: t('fleetSetup.colValue'),
      cell: ({ row: { original: s } }) => (
        <SettingEditor
          key={`${s.settingCode}:${branchId}:${s.value}`}
          setting={s}
          def={defOf(s.settingCode)}
          branchId={branchId}
          row={rowOf(s.settingCode, branchId)}
          readOnly={!canManage}
        />
      ),
    }),
    col.display({
      id: 'source',
      header: t('fleetSetup.colSource'),
      cell: ({ row: { original: s } }) => <Chip tone={SOURCE_TONE[s.source] ?? 'gray'}>{t(`fleetSetup.source.${s.source}`)}</Chip>,
    }),
  ]

  const rows = effective.data?.settings ?? []
  return (
    <Section
      title={t('fleetSetup.settings')}
      actions={(
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{t('fleetSetup.showFor')}</span>
          <div className="w-56"><ScopeSelect value={branchId} onChange={setBranchId} /></div>
        </div>
      )}
    >
      {!canManage && <p className="px-4 pt-3 text-xs text-gray-500">{t('fleetSetup.readOnlyHint')}</p>}
      {effective.isLoading ? (
        <Loading />
      ) : effective.error ? (
        <LoadError error={effective.error} />
      ) : !rows.length ? (
        <EmptyState icon={<SlidersHorizontal size={20} />} title={t('fleetSetup.emptySettingsTitle')} body={t('fleetSetup.emptySettingsBody')} />
      ) : (
        <DataTable data={rows} columns={columns} pageSize={25} />
      )}
    </Section>
  )
}

function SettingEditor({ setting, def, branchId, row, readOnly }: {
  setting: EffectiveSetting
  def: SettingCatalogueItem | undefined
  branchId: string | null
  /** The stored row at THIS scope (absent = saving creates it). */
  row: FleetSetting | undefined
  readOnly: boolean
}) {
  const { t, fmt } = useFmt()
  const scopeOf = useScopeLabel()
  const toast = useToastStore()
  const errors = useWriteErrors()
  const initial = setting.value ?? ''
  const [draft, setDraft] = useState(initial)
  const [confirmReset, setConfirmReset] = useState(false)

  const save = useSetupMutation(
    (value: string) => saveSetting(setting.settingCode, { branchId, value, rowVersion: row?.rowVersion ?? null }),
    'settings',
  )
  const reset = useSetupMutation((r: FleetSetting) => deleteSetting(r.fleetSettingId, r.rowVersion), 'settings')

  const commit = (value: string) => {
    errors.clear()
    save.mutate(value, {
      onSuccess: () => toast.success(t('fleetSetup.saved')),
      onError: errors.handle,
    })
  }

  const type = setting.valueType
  const check = settingValueError(def, draft)
  const changed = draft !== initial
  const error = (changed && check ? fmt(check.key, check.vars) : undefined) ?? errors.field('value') ?? errors.banner ?? undefined

  if (readOnly) {
    return <span className="font-mono text-sm">{type === 'BOOL' ? t(initial === 'true' ? 'common.yes' : 'common.no') : initial || '—'}</span>
  }

  return (
    <div className="flex flex-col gap-1 min-w-[14rem]">
      <div className="flex items-center gap-2">
        {type === 'BOOL' ? (
          <Toggle
            checked={draft === 'true'}
            disabled={save.isPending}
            onChange={(v) => { const value = v ? 'true' : 'false'; setDraft(value); commit(value) }}
            label={t(draft === 'true' ? 'common.yes' : 'common.no')}
          />
        ) : type === 'CODE' && def?.allowedValues?.length ? (
          <select className={`${inputClass} w-40`} value={draft} onChange={(e) => setDraft(e.target.value)}>
            {!def.allowedValues.includes(draft) && <option value={draft}>{draft || '—'}</option>}
            {def.allowedValues.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        ) : (
          <input
            className={`${inputClass} w-40`}
            type={type === 'INT' || type === 'DECIMAL' ? 'number' : 'text'}
            step={type === 'INT' ? 1 : 'any'}
            min={num(def?.min) ?? undefined}
            max={num(def?.max) ?? undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        )}
        {type !== 'BOOL' && changed && (
          <>
            <Button variant="primary" busy={save.isPending} disabled={!!check} onClick={() => commit(draft)}>{t('common.save')}</Button>
            <Button variant="ghost" onClick={() => { setDraft(initial); errors.clear() }}>{t('common.cancel')}</Button>
          </>
        )}
        {branchId && setting.source === 'BRANCH' && row && (
          <Button variant="ghost" busy={reset.isPending} onClick={() => setConfirmReset(true)} title={t('fleetSetup.resetToTenant')}>
            <RotateCcw size={14} /> <span className="text-xs">{t('fleetSetup.resetToTenant')}</span>
          </Button>
        )}
      </div>
      {(type === 'INT' || type === 'DECIMAL') && !error && (num(def?.min) !== null || num(def?.max) !== null) && (
        <span className="text-xs text-gray-400">{fmt('fleetSetup.rangeHint', { min: num(def?.min) ?? '', max: num(def?.max) ?? '' })}</span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}

      <ConfirmDialog
        open={confirmReset}
        title={t('fleetSetup.resetToTenant')}
        message={fmt('fleetSetup.resetToTenantBody', { scope: scopeOf(branchId) })}
        confirmLabel={t('fleetSetup.resetToTenant')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false)
          if (row) reset.mutate(row, { onSuccess: () => toast.success(t('fleetSetup.saved')), onError: errors.handle })
        }}
      />
    </div>
  )
}
