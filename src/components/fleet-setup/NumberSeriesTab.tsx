'use client'

import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Hash, Lock, Pencil, Plus, Trash2, Wand2 } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useBranchContext } from '@/lib/api/platform/branches'
import { useToastStore } from '@/lib/stores/useToastStore'
import {
  createNumberSeries, deleteNumberSeries, initializeSetup, num, updateNumberSeries,
  useNumberSeries, useSetupCatalogue, useSetupMutation,
  type CreateNumberSeries, type NumberSeries, type UpdateNumberSeries,
} from '@/lib/api/fleet/setup'
import {
  DATE_PART_FORMATS, EXAMPLE_BRANCH_CODE, NUMBER_LENGTH_MAX, NUMBER_LENGTH_MIN, RESET_PERIODS, SEPARATORS,
  datePartsFor, exampleNumber, validateSeries, type SeriesFields,
} from '@/lib/fleet-setup/numberSeries'
import {
  Banner, Button, Chip, EmptyState, Field, inputClass, LoadError, Loading, Panel, ScopeSelect, Section, Toggle,
  useFmt, useScopeLabel, useWriteErrors,
} from './ui'

interface FormState extends SeriesFields {
  seriesCode: string
  branchId: string | null
  description: string
  isGapFreeRequired: boolean
  isActive: boolean
}

type Editing = { mode: 'edit'; row: NumberSeries } | { mode: 'create' }

function fromRow(s: NumberSeries): FormState {
  return {
    seriesCode: s.seriesCode,
    branchId: s.branchId,
    description: s.description ?? '',
    prefix: s.prefix ?? '',
    separator: s.separator ?? '',
    countPerBranch: s.countPerBranch,
    datePartFormat: s.datePartFormat,
    resetPeriod: s.resetPeriod,
    numberLength: num(s.numberLength) ?? 5,
    startNumber: num(s.startNumber) ?? 1,
    isGapFreeRequired: s.isGapFreeRequired,
    isActive: s.isActive,
  }
}

export function NumberSeriesTab() {
  const { t, fmt, label } = useFmt()
  const scopeOf = useScopeLabel()
  const toast = useToastStore()
  const series = useNumberSeries(true)
  const catalogue = useSetupCatalogue()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [removing, setRemoving] = useState<NumberSeries | null>(null)

  const init = useSetupMutation(() => initializeSetup(), 'all')
  const remove = useSetupMutation((s: NumberSeries) => deleteNumberSeries(s.numberSeriesId, s.rowVersion), 'series')

  const seriesName = (code: string, fallback?: string | null) => label(`fleetSetup.seriesName.${code}`, fallback || code)

  const runInit = () =>
    init.mutate(undefined, {
      onSuccess: (r) => toast.success(t('fleetSetup.initDone'), fmt('fleetSetup.initDoneBody', { series: num(r.seriesAdded) ?? 0, settings: num(r.settingsAdded) ?? 0 })),
      onError: (e) => toast.error(t('fleetSetup.initFailed'), e instanceof Error ? e.message : undefined),
    })

  const col = createColumnHelper<NumberSeries>()
  const columns = [
    col.display({
      id: 'series',
      header: t('fleetSetup.colSeries'),
      cell: ({ row: { original: s } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{seriesName(s.seriesCode, s.description)}</span>
          <span className="text-xs text-gray-500 font-mono">{s.seriesCode}</span>
        </div>
      ),
    }),
    col.display({
      id: 'example',
      header: t('fleetSetup.colExample'),
      cell: ({ row: { original: s } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-sm">{s.example}</span>
          <span className="text-xs text-gray-500">
            {t('fleetSetup.prefix')} {s.prefix || '—'} · {t('fleetSetup.separator')} {s.separator || t('fleetSetup.none')}
          </span>
        </div>
      ),
    }),
    col.display({
      id: 'reset',
      header: t('fleetSetup.colReset'),
      cell: ({ row: { original: s } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{t(`fleetSetup.reset.${s.resetPeriod}`)}</span>
          <span className="text-xs text-gray-500">{num(s.numberLength)} {t('fleetSetup.numberLength')} · {t(`fleetSetup.datePartOpt.${s.datePartFormat}`)}</span>
        </div>
      ),
    }),
    col.display({
      id: 'scope',
      header: t('fleetSetup.colScope'),
      cell: ({ row: { original: s } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{scopeOf(s.branchId)}</span>
          {s.countPerBranch && <span className="text-xs text-gray-500">{t('fleetSetup.perBranch')}</span>}
        </div>
      ),
    }),
    col.display({
      id: 'status',
      header: t('fleetSetup.colStatus'),
      cell: ({ row: { original: s } }) => (
        <div className="flex flex-wrap gap-1">
          <Chip tone={s.isActive ? 'green' : 'gray'}>{s.isActive ? t('common.active') : t('common.inactive')}</Chip>
          {s.hasIssuedNumbers && <Chip tone="blue" title={t('fleetSetup.issuedLock')}>{t('fleetSetup.issued')}</Chip>}
          {!s.isKnown && <Chip tone="amber">{t('fleetSetup.unknown')}</Chip>}
        </div>
      ),
    }),
    col.display({
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row: { original: s } }) => (
        <div className="flex gap-1">
          <Button variant="ghost" onClick={() => setEditing({ mode: 'edit', row: s })} title={t('common.edit')}>
            <Pencil size={14} />
          </Button>
          {s.branchId && !s.hasIssuedNumbers && (
            <Button variant="ghost" onClick={() => setRemoving(s)} title={t('fleetSetup.removeOverride')}>
              <Trash2 size={14} className="text-red-500" />
            </Button>
          )}
        </div>
      ),
    }),
  ]

  const rows = series.data ?? []
  return (
    <Section
      title={t('fleetSetup.numberSeries')}
      actions={rows.length > 0 && (
        <>
          <Button onClick={runInit} busy={init.isPending} title={t('fleetSetup.initHint')}>
            <Wand2 size={14} /> {t('fleetSetup.initMissing')}
          </Button>
          <Button variant="primary" onClick={() => setEditing({ mode: 'create' })}>
            <Plus size={14} /> {t('fleetSetup.addOverride')}
          </Button>
        </>
      )}
    >
      {series.isLoading ? (
        <Loading />
      ) : series.error ? (
        <LoadError error={series.error} />
      ) : !rows.length ? (
        <EmptyState
          icon={<Hash size={20} />}
          title={t('fleetSetup.emptySeriesTitle')}
          body={t('fleetSetup.emptySeriesBody')}
          action={<Button variant="primary" onClick={runInit} busy={init.isPending}><Wand2 size={14} /> {t('fleetSetup.initDefaults')}</Button>}
        />
      ) : (
        <DataTable data={rows} columns={columns} pageSize={20} />
      )}

      {editing && (
        <SeriesPanel
          editing={editing}
          rows={rows}
          catalogueCodes={catalogue.data?.series.map((s) => s.seriesCode) ?? [...new Set(rows.map((r) => r.seriesCode))]}
          seriesName={seriesName}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        title={t('fleetSetup.removeOverride')}
        message={removing ? fmt('fleetSetup.removeOverrideBody', { code: removing.seriesCode, scope: scopeOf(removing.branchId) }) : ''}
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          remove.mutate(removing, {
            onSuccess: () => toast.success(t('fleetSetup.removed')),
            onError: (e) => toast.error(t('fleetSetup.removeFailed'), e instanceof Error ? e.message : undefined),
          })
          setRemoving(null)
        }}
      />
    </Section>
  )
}

function SeriesPanel({ editing, rows, catalogueCodes, seriesName, onClose }: {
  editing: Editing
  rows: NumberSeries[]
  catalogueCodes: string[]
  seriesName: (code: string, fallback?: string | null) => string
  onClose: () => void
}) {
  const { t } = useFmt()
  const toast = useToastStore()
  const { branches } = useBranchContext()
  const errors = useWriteErrors()
  const isEdit = editing.mode === 'edit'
  const original = isEdit ? editing.row : null
  const issued = !!original?.hasIssuedNumbers

  const tenantRowOf = (code: string) => rows.find((r) => r.seriesCode === code && !r.branchId)

  const [form, setForm] = useState<FormState>(() => {
    if (original) return fromRow(original)
    const code = catalogueCodes[0] ?? ''
    const base = tenantRowOf(code)
    return base
      ? { ...fromRow(base), branchId: branches[0]?.branchId ?? null }
      : { seriesCode: code, branchId: branches[0]?.branchId ?? null, description: '', prefix: '', separator: '-', countPerBranch: true,
          datePartFormat: 'YYMM', resetPeriod: 'MONTHLY', numberLength: 5, startNumber: 1, isGapFreeRequired: false, isActive: true }
  })
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const pickCode = (code: string) => {
    const base = tenantRowOf(code)
    setForm((f) => (base ? { ...fromRow(base), branchId: f.branchId } : { ...f, seriesCode: code }))
  }

  const setReset = (resetPeriod: string) =>
    setForm((f) => {
      const allowed = datePartsFor(resetPeriod)
      return { ...f, resetPeriod, datePartFormat: allowed.includes(f.datePartFormat) ? f.datePartFormat : allowed[allowed.length - 1] }
    })

  const branchCode = form.branchId ? branches.find((b) => b.branchId === form.branchId)?.branchCode ?? EXAMPLE_BRANCH_CODE : EXAMPLE_BRANCH_CODE
  const example = exampleNumber(form, branchCode)
  const rules = useMemo(
    () => validateSeries(form, original ? { issued, original: { resetPeriod: original.resetPeriod, countPerBranch: original.countPerBranch } } : undefined),
    [form, original, issued],
  )
  const ruleError = (k: keyof SeriesFields) => (rules[k] ? t(rules[k]!) : errors.field(k))
  const duplicate = !isEdit && rows.some((r) => r.seriesCode === form.seriesCode && (r.branchId ?? null) === form.branchId)

  const save = useSetupMutation(async () => {
    const fields = {
      description: form.description.trim() || null,
      prefix: form.prefix.trim().toUpperCase() || null,
      separator: form.separator,
      countPerBranch: form.countPerBranch,
      datePartFormat: form.datePartFormat,
      resetPeriod: form.resetPeriod,
      numberLength: form.numberLength,
      startNumber: form.startNumber,
      isGapFreeRequired: form.isGapFreeRequired,
      isActive: form.isActive,
    }
    if (original) return updateNumberSeries(original.numberSeriesId, { ...fields, rowVersion: original.rowVersion } satisfies UpdateNumberSeries)
    return createNumberSeries({ ...fields, seriesCode: form.seriesCode, branchId: form.branchId } satisfies CreateNumberSeries)
  }, 'series')

  const submit = () => {
    errors.clear()
    save.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('fleetSetup.saved'))
        onClose()
      },
      onError: errors.handle,
    })
  }

  const lockTip = t('fleetSetup.issuedLock')
  const invalid = Object.keys(rules).length > 0 || duplicate || !form.seriesCode

  return (
    <Panel
      open
      title={isEdit ? `${t('fleetSetup.editSeries')} · ${form.seriesCode}` : t('fleetSetup.addOverride')}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={submit} busy={save.isPending} disabled={invalid}>{t('common.save')}</Button>
        </>
      )}
    >
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500">{t('fleetSetup.liveExample')}</p>
        <p className="font-mono text-lg font-semibold text-gray-900 break-all">{example}</p>
        {!form.branchId && form.countPerBranch && <p className="text-xs text-gray-500">{t('fleetSetup.exampleBranchHint')}</p>}
      </div>
      <Banner text={errors.banner} />

      {isEdit ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-500">{t('fleetSetup.colSeries')}</p><p>{seriesName(form.seriesCode, original?.description)}</p></div>
          <div><p className="text-xs text-gray-500">{t('fleetSetup.colScope')}</p><p>{branches.find((b) => b.branchId === form.branchId)?.branchCode ?? t('fleetSetup.tenantWide')}</p></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('fleetSetup.colSeries')} htmlFor="ns-code" error={errors.field('seriesCode')}>
            <select id="ns-code" className={inputClass} value={form.seriesCode} onChange={(e) => pickCode(e.target.value)}>
              {catalogueCodes.map((c) => <option key={c} value={c}>{seriesName(c)} ({c})</option>)}
            </select>
          </Field>
          <Field label={t('fleetSetup.branch')} htmlFor="ns-branch" error={errors.field('branchId') ?? (duplicate ? t('fleetSetup.rule.duplicate') : undefined)}>
            <ScopeSelect id="ns-branch" value={form.branchId} onChange={(v) => set('branchId', v)} allowTenant={!tenantRowOf(form.seriesCode)} />
          </Field>
        </div>
      )}

      <Field label={t('common.description')} htmlFor="ns-desc" error={errors.field('description')}>
        <input id="ns-desc" className={inputClass} maxLength={200} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fleetSetup.prefix')} htmlFor="ns-prefix" error={ruleError('prefix')}>
          <input id="ns-prefix" className={`${inputClass} font-mono uppercase`} maxLength={20} value={form.prefix}
            onChange={(e) => set('prefix', e.target.value.toUpperCase())} />
        </Field>
        <Field label={t('fleetSetup.separator')} htmlFor="ns-sep" error={ruleError('separator')}>
          <select id="ns-sep" className={inputClass} value={form.separator} onChange={(e) => set('separator', e.target.value)}>
            {SEPARATORS.map((s) => <option key={s} value={s}>{s === '' ? t('fleetSetup.none') : s}</option>)}
          </select>
        </Field>
      </div>

      <Field label={t('fleetSetup.countPerBranch')} error={ruleError('countPerBranch')} hint={issued ? lockTip : t('fleetSetup.countPerBranchHint')}>
        <span className="inline-flex items-center gap-2">
          <Toggle checked={form.countPerBranch} onChange={(v) => set('countPerBranch', v)} disabled={issued} title={issued ? lockTip : undefined} />
          {issued && <Lock size={14} className="text-gray-400" aria-label={lockTip} />}
        </span>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fleetSetup.resetPeriod')} htmlFor="ns-reset" error={ruleError('resetPeriod')} hint={issued ? lockTip : undefined}>
          <select id="ns-reset" className={inputClass} value={form.resetPeriod} disabled={issued} title={issued ? lockTip : undefined}
            onChange={(e) => setReset(e.target.value)}>
            {RESET_PERIODS.map((r) => <option key={r} value={r}>{t(`fleetSetup.reset.${r}`)}</option>)}
          </select>
        </Field>
        <Field label={t('fleetSetup.datePart')} htmlFor="ns-date" error={ruleError('datePartFormat')}>
          <select id="ns-date" className={inputClass} value={form.datePartFormat} onChange={(e) => set('datePartFormat', e.target.value)}>
            {DATE_PART_FORMATS.filter((d) => datePartsFor(form.resetPeriod).includes(d)).map((d) => (
              <option key={d} value={d}>{t(`fleetSetup.datePartOpt.${d}`)}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fleetSetup.numberLength')} htmlFor="ns-len" error={ruleError('numberLength')}>
          <input id="ns-len" type="number" className={inputClass} min={NUMBER_LENGTH_MIN} max={NUMBER_LENGTH_MAX}
            value={form.numberLength} onChange={(e) => set('numberLength', Number(e.target.value))} />
        </Field>
        <Field label={t('fleetSetup.startNumber')} htmlFor="ns-start" error={ruleError('startNumber')}>
          <input id="ns-start" type="number" className={inputClass} min={0}
            value={form.startNumber} onChange={(e) => set('startNumber', Number(e.target.value))} />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Toggle checked={form.isGapFreeRequired} onChange={(v) => set('isGapFreeRequired', v)} label={t('fleetSetup.gapFree')} />
        <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label={t('common.active')} />
      </div>
    </Panel>
  )
}
