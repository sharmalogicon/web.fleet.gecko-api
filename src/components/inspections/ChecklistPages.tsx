'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { FormLayout } from '@/components/shared/FormLayout'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { Field, inputClass } from '@/components/shared/FormField'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useT } from '@/i18n/I18nContext'
import {
  INSPECTION_KINDS, RESPONSE_TYPES, SEVERITIES, emptyLine, lineErrors, linesOf, toTemplateItems, useSaveTemplate, useTemplates,
  type ChecklistLine, type TemplateDto,
} from '@/lib/api/fleet/inspections'
import { useAssetCatalogue } from '@/lib/api/fleet/assets'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

const col = createColumnHelper<TemplateDto>()
const cell = 'w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

/** New page (prompt 10 §B): inspection checklists. */
export function ChecklistsListView() {
  const { t } = useT()
  const router = useRouter()
  const { canTenantWide } = useFleetAccess()
  const list = useTemplates()
  const rows = list.data ?? []
  const open = (id: string) => router.push(`/fleet/inspections/checklists/${id}`)
  const columns = [
    col.display({
      id: 'name', header: t('nav.checklists'),
      cell: ({ row: { original: c } }) => (
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={() => open(c.inspectionTemplateId)} className="text-blue-600 hover:underline text-left font-medium">{c.nameEn}</button>
          <span className="text-xs text-gray-400 font-mono">{c.templateCode}</span>
        </div>
      ),
    }),
    col.display({
      id: 'kind', header: t('insp.kind'),
      cell: ({ row: { original: c } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{t(`insp.kindName.${c.inspectionKind}`)}</span>
          <span className="text-xs text-gray-400">{c.assetClass ?? t('insp.anyClass')}</span>
        </div>
      ),
    }),
    col.display({ id: 'items', header: t('insp.items'), cell: ({ row: { original: c } }) => <span className="text-sm">{c.items.length}</span> }),
    col.display({ id: 'status', header: () => t('common.status'), size: 110, cell: ({ row: { original: c } }) => <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} /> }),
    col.display({ id: 'actions', header: '', size: 60, cell: ({ row: { original: c } }) => <button type="button" onClick={() => open(c.inspectionTemplateId)} className="text-xs text-blue-600 hover:underline">{t('common.edit')}</button> }),
  ]
  return (
    <ListPage
      title={t('nav.checklists')}
      subtitle={`${rows.length} checklist${rows.length !== 1 ? 's' : ''} found`}
      actions={canTenantWide('fleet.inspection.manage') && (
        <Link href="/fleet/inspections/checklists/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {t('nav.checklists')}</Link>
      )}
    >
      {list.isLoading ? <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
        : list.error ? <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
        : <DataTable data={rows} columns={columns} pageSize={20} />}
    </ListPage>
  )
}

export function ChecklistView({ id }: { id: string }) {
  const list = useTemplates()
  if (id === 'new') return <ChecklistForm />
  if (list.isLoading) return <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>
  const current = list.data?.find((c) => c.inspectionTemplateId === id)
  if (!current) return <p className="text-sm text-red-600">Not found.</p>
  return <ChecklistForm key={current.rowVersion} current={current} />
}

function ChecklistForm({ current }: { current?: TemplateDto }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const save = useSaveTemplate()
  const catalogue = useAssetCatalogue()
  const canManage = useFleetAccess().canTenantWide('fleet.inspection.manage')
  const [code, setCode] = useState(current?.templateCode ?? '')
  const [nameEn, setNameEn] = useState(current?.nameEn ?? '')
  const [nameLocal, setNameLocal] = useState(current?.nameLocal ?? '')
  const [kind, setKind] = useState(current?.inspectionKind ?? 'PRE_TRIP')
  const [assetClass, setAssetClass] = useState(current?.assetClass ?? '')
  const [isActive, setIsActive] = useState(current?.isActive ?? true)
  const [lines, setLines] = useState<(ChecklistLine & { key: string })[]>(
    (current ? linesOf(current) : [emptyLine()]).map((l, i) => ({ ...l, key: `l${i}` })),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const errs = lineErrors(lines)

  const setLine = (i: number, p: Partial<ChecklistLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))
  const moveLine = (i: number, by: number) => setLines((ls) => {
    const j = i + by
    if (j < 0 || j >= ls.length) return ls
    const next = [...ls];
    [next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const submit = () => {
    setBanner(null)
    const e: Record<string, string> = {}
    if (!code.trim()) e.templateCode = 'insp.rule.code'
    if (!nameEn.trim()) e.nameEn = 'insp.rule.name'
    if (!lines.length) e.items = 'insp.rule.oneLine'
    setErrors(e)
    if (Object.keys(e).length || Object.keys(errs).length) return
    save.mutate(
      {
        id: current?.inspectionTemplateId,
        body: {
          templateCode: code.trim().toUpperCase(), nameEn: nameEn.trim(), nameLocal: nameLocal.trim() || null, inspectionKind: kind,
          assetClass: assetClass || null, isActive, items: toTemplateItems(lines), rowVersion: current?.rowVersion ?? null,
        },
      },
      {
        onSuccess: (saved) => { toast.success(t('insp.checklistSaved'), saved.templateCode); if (!current) router.push(`/fleet/inspections/checklists/${saved.inspectionTemplateId}`) },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 400) {
            setErrors({ templateCode: err.forField('templateCode') ?? '', nameEn: err.forField('nameEn') ?? '', items: err.forField('items') ?? '' })
            setBanner(errorText(err, t))
          } else if (err instanceof ApiError && err.status === 409) toast.warning(t('equipment.conflict'), errorText(err, t))
          else setBanner(errorText(err, t))
        },
      },
    )
  }

  const header = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div role="alert" className="sm:col-span-2 lg:col-span-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
      <Field label={`${t('insp.code')} *`} error={errors.templateCode || undefined}>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={`${inputClass(!!errors.templateCode)} font-mono`} placeholder="PRE-TRIP-01" />
      </Field>
      <Field label={`${t('store.nameEn')} *`} error={errors.nameEn || undefined}>
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputClass(!!errors.nameEn)} />
      </Field>
      <Field label={t('store.nameLocal')}>
        <input value={nameLocal} onChange={(e) => setNameLocal(e.target.value)} className={inputClass()} />
      </Field>
      <Field label={t('insp.kind')}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass()}>
          {INSPECTION_KINDS.map((k) => <option key={k} value={k}>{t(`insp.kindName.${k}`)}</option>)}
        </select>
      </Field>
      <Field label={t('insp.assetClass')} hint={t('insp.assetClassHint')}>
        <select value={assetClass} onChange={(e) => setAssetClass(e.target.value)} className={inputClass()}>
          <option value="">{t('insp.anyClass')}</option>
          {catalogue.data?.classes.map((c) => <option key={c.assetClass} value={c.assetClass}>{c.description}</option>)}
        </select>
      </Field>
      <Field label={t('common.active')}>
        <label className="flex items-center gap-2 text-sm text-gray-700 pt-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" /> {t('common.active')}
        </label>
      </Field>
    </div>
  )

  const grid = (
    <LineItemsEditor
      items={lines}
      getKey={(l) => l.key}
      columns={[
        { id: 'section', header: t('insp.section'), className: 'w-36', cell: (l, i) => <input value={l.sectionEn} onChange={(e) => setLine(i, { sectionEn: e.target.value })} aria-label={`${t('insp.section')} ${i + 1}`} className={cell} /> },
        { id: 'text', header: `${t('insp.itemText')} *`, cell: (l, i) => <input value={l.itemTextEn} onChange={(e) => setLine(i, { itemTextEn: e.target.value })} aria-label={`${t('insp.itemText')} ${i + 1}`} className={cell} /> },
        {
          id: 'type', header: t('insp.responseType'), className: 'w-32',
          cell: (l, i) => (
            <select value={l.responseType} onChange={(e) => setLine(i, { responseType: e.target.value as ChecklistLine['responseType'] })} aria-label={`${t('insp.responseType')} ${i + 1}`} className={cell}>
              {RESPONSE_TYPES.map((r) => <option key={r} value={r}>{t(`insp.response.${r}`)}</option>)}
            </select>
          ),
        },
        {
          id: 'range', header: t('insp.range'), className: 'w-44',
          cell: (l, i) => l.responseType === 'NUMBER' ? (
            <div className="grid grid-cols-3 gap-1">
              <input value={l.minValue} onChange={(e) => setLine(i, { minValue: e.target.value })} type="number" step="any" placeholder="min" aria-label={`min ${i + 1}`} className={cell} />
              <input value={l.maxValue} onChange={(e) => setLine(i, { maxValue: e.target.value })} type="number" step="any" placeholder="max" aria-label={`max ${i + 1}`} className={cell} />
              <input value={l.unitLabel} onChange={(e) => setLine(i, { unitLabel: e.target.value })} placeholder="mm" aria-label={`unit ${i + 1}`} className={cell} />
            </div>
          ) : <span className="text-xs text-gray-300">—</span>,
        },
        {
          id: 'severity', header: t('insp.severityLabel'), className: 'w-36',
          cell: (l, i) => (
            <select value={l.defaultSeverity} onChange={(e) => setLine(i, { defaultSeverity: e.target.value as ChecklistLine['defaultSeverity'] })} aria-label={`${t('insp.severityLabel')} ${i + 1}`} className={cell}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{t(`insp.severity.${s}`)}</option>)}
            </select>
          ),
        },
        { id: 'photo', header: t('insp.photoOnFail'), className: 'w-20', cell: (l, i) => <input type="checkbox" checked={l.photoRequiredOnFail} onChange={(e) => setLine(i, { photoRequiredOnFail: e.target.checked })} aria-label={`${t('insp.photoOnFail')} ${i + 1}`} className="mt-2 w-4 h-4" /> },
        {
          id: 'move', header: '', className: 'w-16',
          cell: (_l, i) => (
            <div className="flex gap-1 pt-1">
              <button type="button" onClick={() => moveLine(i, -1)} disabled={i === 0} aria-label={`up ${i + 1}`} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => moveLine(i, 1)} disabled={i === lines.length - 1} aria-label={`down ${i + 1}`} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ArrowDown size={14} /></button>
            </div>
          ),
        },
      ]}
      onAdd={() => setLines((ls) => [...ls, { ...emptyLine(ls[ls.length - 1]?.sectionEn ?? ''), key: `n${Date.now()}` }])}
      onRemove={(i) => setLines((ls) => ls.filter((_, j) => j !== i))}
      addLabel={t('insp.addLine')}
      removeLabel={t('wo.removeLine')}
      emptyText={t('insp.rule.oneLine')}
      rowError={(i) => (errs[i] ? t(errs[i]) : undefined)}
      error={errors.items ? t(errors.items) : t('insp.linesHint')}
    />
  )

  return (
    <FormLayout
      title={current ? `${current.templateCode} · ${current.nameEn}` : `${t('common.new')} ${t('nav.checklists')}`}
      tabs={[{ id: 'general', label: t('form.general'), content: header }, { id: 'items', label: `${t('insp.items')} (${lines.length})`, content: grid }]}
      isNew={!current}
      actions={
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={() => router.back()}>{t('common.cancel')}</ToolbarButton>
          <ToolbarButton tone="primary" disabled={save.isPending || !canManage} onClick={submit}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>
        </div>
      }
    />
  )
}
