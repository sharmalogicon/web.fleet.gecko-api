'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { CalendarPlus, Pencil, Trash2, Wrench } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import {
  createLaborCostRate, deleteLaborCostRate, FLEET_TRADE, num, updateLaborCostRate, useCodeList, useLaborCostRates, useSetupMutation,
  type LaborCostRate,
} from '@/lib/api/fleet/setup'
import {
  Banner, Button, Chip, EmptyState, Field, inputClass, LoadError, Loading, Panel, ScopeSelect, Section,
  useFmt, useScopeLabel, useWriteErrors,
} from './ui'

const sameScope = (a: string | null | undefined, b: string | null | undefined) => (a ?? null) === (b ?? null)

/** The day after an ISO date (yyyy-MM-dd), for "the next rate starts after the latest". */
export function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Latest rate of a trade in one scope (tenant, or one branch). */
export function latestOf(rates: LaborCostRate[], tradeCode: string, branchId: string | null) {
  return rates
    .filter((r) => r.tradeCode === tradeCode && sameScope(r.branchId, branchId))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
}

/** Client rules of a rate (the API's checks). Values are i18n keys. */
export function laborRateErrors(f: { costPerHour: string; otCostPerHour: string; currencyCode?: string; effectiveFrom?: string; effectiveTo?: string },
  ctx: { latestFrom?: string; ownFrom?: string; nextFrom?: string }) {
  const e: Record<string, string> = {}
  const cost = Number(f.costPerHour)
  if (f.costPerHour.trim() === '' || Number.isNaN(cost) || cost < 0 || cost > 1_000_000) e.costPerHour = 'fleetSetup.rule.cost'
  if (f.otCostPerHour.trim() !== '') {
    const ot = Number(f.otCostPerHour)
    if (Number.isNaN(ot) || ot < 0 || ot > 1_000_000) e.otCostPerHour = 'fleetSetup.rule.cost'
    else if (!e.costPerHour && ot < cost) e.otCostPerHour = 'fleetSetup.rule.otBelow'
  }
  if (f.currencyCode !== undefined && !/^[A-Za-z]{3}$/.test(f.currencyCode.trim())) e.currencyCode = 'fleetSetup.rule.currency'
  if (f.effectiveFrom !== undefined) {
    if (!f.effectiveFrom) e.effectiveFrom = 'fleetSetup.rule.dateRequired'
    else if (ctx.latestFrom && f.effectiveFrom <= ctx.latestFrom) e.effectiveFrom = 'fleetSetup.rule.afterLatest'
  }
  if (f.effectiveTo) {
    if (ctx.ownFrom && f.effectiveTo < ctx.ownFrom) e.effectiveTo = 'fleetSetup.rule.endBeforeStart'
    else if (ctx.nextFrom && f.effectiveTo >= ctx.nextFrom) e.effectiveTo = 'fleetSetup.rule.endBeforeNext'
  } else if (f.effectiveTo !== undefined && ctx.nextFrom) e.effectiveTo = 'fleetSetup.rule.endBeforeNext'
  return e
}

type Editing = { mode: 'edit'; row: LaborCostRate } | { mode: 'create'; tradeCode: string }

export function LaborRatesTab() {
  const { t, fmt, lang } = useFmt()
  const scopeOf = useScopeLabel()
  const toast = useToastStore()
  const rates = useLaborCostRates(true)
  const trades = useCodeList(FLEET_TRADE)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [removing, setRemoving] = useState<LaborCostRate | null>(null)
  const remove = useSetupMutation((r: LaborCostRate) => deleteLaborCostRate(r.laborCostRateId, r.rowVersion), 'labor')

  const rows = rates.data ?? []
  const tradeList = trades.data ?? []
  const tradeName = (code: string) => {
    const v = tradeList.find((x) => x.code === code)
    return v ? (lang === 'th' && v.descriptionLocal ? v.descriptionLocal : v.descriptionEn) : code
  }
  // Code-list order; a trade that has rates but left the list still shows.
  const groups = [...tradeList.map((x) => x.code), ...new Set(rows.map((r) => r.tradeCode).filter((c) => !tradeList.some((x) => x.code === c)))]
  const today = new Date().toISOString().slice(0, 10)

  const col = createColumnHelper<LaborCostRate>()
  const columns = [
    col.display({
      id: 'scope',
      header: t('fleetSetup.colScope'),
      cell: ({ row: { original: r } }) => <span className="text-sm">{scopeOf(r.branchId)}</span>,
    }),
    col.display({
      id: 'cost',
      header: t('fleetSetup.colCost'),
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{(num(r.costPerHour) ?? 0).toLocaleString()} {r.currencyCode} / {t('fleetSetup.hour')}</span>
          <span className="text-xs text-gray-500">
            {t('fleetSetup.ot')} {r.otCostPerHour === null ? '—' : `${(num(r.otCostPerHour) ?? 0).toLocaleString()} ${r.currencyCode}`}
          </span>
        </div>
      ),
    }),
    col.display({
      id: 'period',
      header: t('fleetSetup.colEffective'),
      cell: ({ row: { original: r } }) => {
        const current = r.effectiveFrom <= today && (!r.effectiveTo || r.effectiveTo >= today)
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="text-sm">{r.effectiveFrom} → {r.effectiveTo ?? t('fleetSetup.open')}</span>
            {current ? <Chip tone="green">{t('fleetSetup.current')}</Chip>
              : r.effectiveFrom > today ? <Chip tone="blue">{t('fleetSetup.upcoming')}</Chip>
              : <Chip tone="gray">{t('fleetSetup.history')}</Chip>}
          </div>
        )
      },
    }),
    col.display({
      id: 'remarks',
      header: t('common.remarks'),
      cell: ({ row: { original: r } }) => <span className="text-sm text-gray-600 whitespace-normal">{r.remarks || '—'}</span>,
    }),
    col.display({
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row: { original: r } }) => (
        <div className="flex gap-1">
          <Button variant="ghost" onClick={() => setEditing({ mode: 'edit', row: r })} title={t('common.edit')}><Pencil size={14} /></Button>
          {latestOf(rows, r.tradeCode, r.branchId)?.laborCostRateId === r.laborCostRateId && (
            <Button variant="ghost" onClick={() => setRemoving(r)} title={t('common.delete')}><Trash2 size={14} className="text-red-500" /></Button>
          )}
        </div>
      ),
    }),
  ]

  if (rates.isLoading || trades.isLoading) return <Section title={t('fleetSetup.labor')}><Loading /></Section>
  if (rates.error) return <Section title={t('fleetSetup.labor')}><LoadError error={rates.error} /></Section>

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">{t('fleetSetup.laborHint')}</p>
      {trades.error && (
        <div role="alert" className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
          {t('fleetSetup.tradesFailed')} {errorText(trades.error, t)}
        </div>
      )}
      {groups.map((code) => {
        const list = rows
          .filter((r) => r.tradeCode === code)
          .sort((a, b) => (a.branchId ?? '').localeCompare(b.branchId ?? '') || b.effectiveFrom.localeCompare(a.effectiveFrom))
        return (
          <Section
            key={code}
            title={`${tradeName(code)} (${code})`}
            actions={<Button onClick={() => setEditing({ mode: 'create', tradeCode: code })}><CalendarPlus size={14} /> {t('fleetSetup.newRateFrom')}</Button>}
          >
            {list.length ? (
              <DataTable data={list} columns={columns} pageSize={20} />
            ) : (
              <p className="px-4 py-4 text-sm text-gray-500">{t('fleetSetup.noRate')}</p>
            )}
          </Section>
        )
      })}
      {!groups.length && <EmptyState icon={<Wrench size={20} />} title={t('fleetSetup.labor')} body={t('fleetSetup.noRate')} />}

      {editing && <RateModal editing={editing} rows={rows} tradeName={tradeName} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!removing}
        title={t('fleetSetup.deleteRate')}
        message={removing ? fmt('fleetSetup.deleteRateBody', { trade: tradeName(removing.tradeCode), from: removing.effectiveFrom }) : ''}
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) remove.mutate(removing, {
            onSuccess: () => toast.success(t('fleetSetup.removed')),
            onError: (e) => toast.error(t('fleetSetup.removeFailed'), e instanceof Error ? e.message : undefined),
          })
          setRemoving(null)
        }}
      />
    </div>
  )
}

function RateModal({ editing, rows, tradeName, onClose }: {
  editing: Editing
  rows: LaborCostRate[]
  tradeName: (code: string) => string
  onClose: () => void
}) {
  const { t } = useFmt()
  const toast = useToastStore()
  const errors = useWriteErrors()
  const original = editing.mode === 'edit' ? editing.row : null
  const tradeCode = original?.tradeCode ?? (editing.mode === 'create' ? editing.tradeCode : '')

  const [form, setForm] = useState(() => {
    if (original) return {
      branchId: original.branchId,
      costPerHour: String(num(original.costPerHour) ?? ''),
      otCostPerHour: original.otCostPerHour === null ? '' : String(num(original.otCostPerHour)),
      currencyCode: original.currencyCode,
      effectiveFrom: original.effectiveFrom,
      effectiveTo: original.effectiveTo ?? '',
      remarks: original.remarks ?? '',
    }
    const latest = latestOf(rows, tradeCode, null)
    const today = new Date().toISOString().slice(0, 10)
    return {
      branchId: null as string | null,
      costPerHour: latest ? String(num(latest.costPerHour)) : '',
      otCostPerHour: latest?.otCostPerHour != null ? String(num(latest.otCostPerHour)) : '',
      currencyCode: latest?.currencyCode ?? 'THB',
      effectiveFrom: latest && latest.effectiveFrom >= today ? nextDay(latest.effectiveFrom) : today,
      effectiveTo: '',
      remarks: '',
    }
  })
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const latest = latestOf(rows, tradeCode, form.branchId)
  const next = original
    ? rows.filter((r) => r.tradeCode === tradeCode && sameScope(r.branchId, original.branchId) && r.effectiveFrom > original.effectiveFrom)
        .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0]
    : undefined

  const rules = original
    ? laborRateErrors({ costPerHour: form.costPerHour, otCostPerHour: form.otCostPerHour, effectiveTo: form.effectiveTo },
        { ownFrom: original.effectiveFrom, nextFrom: next?.effectiveFrom })
    : laborRateErrors({ costPerHour: form.costPerHour, otCostPerHour: form.otCostPerHour, currencyCode: form.currencyCode, effectiveFrom: form.effectiveFrom },
        { latestFrom: latest?.effectiveFrom })
  const err = (k: string) => (rules[k] ? t(rules[k]) : errors.field(k))

  const save = useSetupMutation(async () => {
    const ot = form.otCostPerHour.trim() === '' ? null : Number(form.otCostPerHour)
    if (original) return updateLaborCostRate(original.laborCostRateId, {
      costPerHour: Number(form.costPerHour), otCostPerHour: ot, effectiveTo: form.effectiveTo || null,
      remarks: form.remarks.trim() || null, rowVersion: original.rowVersion,
    })
    return createLaborCostRate({
      tradeCode, branchId: form.branchId, costPerHour: Number(form.costPerHour), otCostPerHour: ot,
      currencyCode: form.currencyCode.trim().toUpperCase(), effectiveFrom: form.effectiveFrom, remarks: form.remarks.trim() || null,
    })
  }, 'labor')

  const submit = () => {
    errors.clear()
    save.mutate(undefined, { onSuccess: () => { toast.success(t('fleetSetup.saved')); onClose() }, onError: errors.handle })
  }

  return (
    <Panel
      open
      variant="modal"
      title={`${tradeName(tradeCode)} · ${original ? t('fleetSetup.editRate') : t('fleetSetup.newRateFrom')}`}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" busy={save.isPending} disabled={Object.keys(rules).length > 0} onClick={submit}>{t('common.save')}</Button>
        </>
      )}
    >
      <Banner text={errors.banner} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fleetSetup.colScope')} htmlFor="lr-scope" error={errors.field('branchId')} hint={original ? t('fleetSetup.scopeFixed') : undefined}>
          <ScopeSelect id="lr-scope" value={form.branchId} onChange={(v) => set('branchId', v)} disabled={!!original} />
        </Field>
        <Field label={t('fleetSetup.currency')} htmlFor="lr-cur" error={err('currencyCode')}>
          <input id="lr-cur" maxLength={3} disabled={!!original} className={`${inputClass} uppercase`} value={form.currencyCode}
            onChange={(e) => set('currencyCode', e.target.value.toUpperCase())} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fleetSetup.costPerHour')} htmlFor="lr-cost" error={err('costPerHour')}>
          <input id="lr-cost" type="number" min={0} step="any" className={inputClass} value={form.costPerHour} onChange={(e) => set('costPerHour', e.target.value)} />
        </Field>
        <Field label={t('fleetSetup.otCostPerHour')} htmlFor="lr-ot" error={err('otCostPerHour')}>
          <input id="lr-ot" type="number" min={0} step="any" className={inputClass} value={form.otCostPerHour} onChange={(e) => set('otCostPerHour', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fleetSetup.effectiveFrom')} htmlFor="lr-from" error={err('effectiveFrom')}
          hint={original ? t('fleetSetup.startFixed') : latest ? t('fleetSetup.endsPrevious') : undefined}>
          <input id="lr-from" type="date" disabled={!!original} className={inputClass} value={form.effectiveFrom}
            min={!original && latest ? nextDay(latest.effectiveFrom) : undefined} onChange={(e) => set('effectiveFrom', e.target.value)} />
        </Field>
        {original && (
          <Field label={t('fleetSetup.effectiveTo')} htmlFor="lr-to" error={err('effectiveTo')} hint={t('fleetSetup.openHint')}>
            <input id="lr-to" type="date" className={inputClass} value={form.effectiveTo} min={original.effectiveFrom}
              onChange={(e) => set('effectiveTo', e.target.value)} />
          </Field>
        )}
      </div>
      <Field label={t('common.remarks')} htmlFor="lr-rem" error={errors.field('remarks')}>
        <input id="lr-rem" maxLength={400} className={inputClass} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
      </Field>
    </Panel>
  )
}
