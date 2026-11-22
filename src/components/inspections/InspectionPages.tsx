'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { FormLayout } from '@/components/shared/FormLayout'
import { Field, inputClass } from '@/components/shared/FormField'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { AssetCodeInput, DriverCodeInput } from '@/components/meters/MeterBits'
import { useT } from '@/i18n/I18nContext'
import {
  answerErrors, isFail, toAnswers, useInspection, useInspections, useSubmitInspection, useTemplates, type Answer, type InspectionDto,
} from '@/lib/api/fleet/inspections'
import type { AssetView } from '@/lib/api/fleet/assets'
import type { DriverView } from '@/lib/api/fleet/drivers'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { DefectActions, DefectStatus, SeverityBadge } from './DefectActions'

const col = createColumnHelper<InspectionDto>()
const selectClass = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

function ResultBadge({ result, defects }: { result: string | null; defects: number }) {
  const { t } = useT()
  const fail = result === 'FAIL'
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium ${fail ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{result ?? '—'}</span>
      {defects > 0 && <span className="text-xs text-gray-500">{defects} {t('insp.defects')}</span>}
    </div>
  )
}

/** New page (prompt 10 §C). */
export function InspectionsListView({ result }: { result: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const list = useInspections({ result: result !== 'ALL' ? result : undefined })
  const rows = list.data ?? []
  const columns = [
    col.display({
      id: 'doc', header: t('insp.document'),
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={() => router.push(`/fleet/inspections/${r.inspectionId}`)} className="text-blue-600 hover:underline text-left font-mono text-sm">{r.documentNo}</button>
          <span className="text-xs text-gray-400">{fmt(r.documentDate)}</span>
        </div>
      ),
    }),
    col.display({ id: 'asset', header: t('insp.assetChecklist'), cell: ({ row: { original: r } }) => <div className="flex flex-col gap-0.5"><span className="text-sm font-mono">{r.assetCode}</span><span className="text-xs text-gray-400">{r.templateCode}</span></div> }),
    col.display({
      id: 'driver', header: t('insp.driverMeter'),
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{r.driverCode ?? '—'}</span>
          <span className="text-xs text-gray-400">{[r.meterKm != null && `${Number(r.meterKm).toLocaleString()} km`, r.meterHours != null && `${Number(r.meterHours).toLocaleString()} hrs`].filter(Boolean).join(' · ') || '—'}</span>
        </div>
      ),
    }),
    col.display({ id: 'result', header: t('insp.result'), cell: ({ row: { original: r } }) => <ResultBadge result={r.result} defects={r.defects.length} /> }),
  ]
  return (
    <ListPage
      title={t('nav.inspections')}
      subtitle={`${rows.length} inspection${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.inspection.perform') && (
        <Link href="/fleet/inspections/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {t('nav.inspections')}</Link>
      )}
      filters={
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t('insp.result')}</label>
          <select value={result} onChange={(e) => router.push(`/fleet/inspections?result=${e.target.value}`)} className={selectClass}>
            {['ALL', 'PASS', 'FAIL'].map((r) => <option key={r} value={r}>{r === 'ALL' ? t('common.all') : r}</option>)}
          </select>
        </div>
      }
    >
      {list.isLoading ? <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
        : list.error ? <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
        : <DataTable data={rows} columns={columns} pageSize={20} />}
    </ListPage>
  )
}

export function InspectionView({ id }: { id: string }) {
  if (id === 'new') return <NewInspectionForm />
  return <InspectionReadOnly id={id} />
}

function NewInspectionForm() {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const submit = useSubmitInspection()
  const templates = useTemplates({ active: true })
  const [code, setCode] = useState('')
  const [asset, setAsset] = useState<AssetView | null>(null)
  const [templateId, setTemplateId] = useState('')
  const [driverText, setDriverText] = useState('')
  const [driver, setDriver] = useState<DriverView | null>(null)
  const [km, setKm] = useState('')
  const [hours, setHours] = useState('')
  const [remarks, setRemarks] = useState('')
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [shown, setShown] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  // One ref per form: a retry returns the first inspection instead of a duplicate.
  const [clientRef] = useState<string>(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `ref-${Math.random()}`))

  // A checklist for another asset class is refused (400): only matching ones are offered.
  const usable = (templates.data ?? []).filter((c) => !c.assetClass || !asset || c.assetClass === asset.dto.assetClass)
  const template = usable.find((c) => c.inspectionTemplateId === templateId)
  const items = [...(template?.items ?? [])].sort((a, b) => Number(a.seqNo) - Number(b.seqNo))
  const errs = answerErrors(items, answers)
  const meterType = asset?.dto.meterType
  const showKm = meterType === 'KM' || meterType === 'KM_HOUR'
  const showHours = meterType === 'HOUR' || meterType === 'KM_HOUR'
  const set = (itemId: string, p: Partial<Answer>) => setAnswers((a) => ({ ...a, [itemId]: { ...a[itemId], ...p } }))

  const send = () => {
    setShown(true)
    setBanner(null)
    if (!asset || !template) { setBanner(t('insp.rule.pick')); return }
    if (Object.keys(errs).length) { setBanner(t('insp.rule.allLines')); return }
    submit.mutate(
      {
        assetProfileId: asset.id, inspectionTemplateId: template.inspectionTemplateId, answers: toAnswers(items, answers), driverId: driver?.id ?? null,
        meterKm: showKm && km ? Number(km) : null, meterHours: showHours && hours ? Number(hours) : null, latitude: null, longitude: null,
        remarks: remarks.trim() || null, clientRef,
      },
      {
        onSuccess: (r) => { toast.success(t('insp.saved'), `${r.documentNo} · ${r.result}`); router.push(`/fleet/inspections/${r.inspectionId}`) },
        onError: (e) => {
          setBanner(e instanceof ApiError && e.status === 400 ? Object.values(e.fieldMap).join(' ') || errorText(e, t) : errorText(e, t))
          toast.error(t('common.saveFailed'), errorText(e, t))
        },
      },
    )
  }

  const sections = items.reduce<Record<string, typeof items>>((acc, i) => {
    const s = i.sectionEn ?? ''
    ;(acc[s] ??= []).push(i)
    return acc
  }, {})

  const header = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div role="alert" className="sm:col-span-2 lg:col-span-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
      <Field label={`${t('common.equipment')} *`}>
        <AssetCodeInput id="insp-assets" value={code} onChange={setCode} onResolve={(a) => { setAsset(a); setTemplateId('') }} className={inputClass()} />
      </Field>
      <Field label={`${t('nav.checklists')} *`}>
        <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setAnswers({}) }} disabled={!asset} className={inputClass(false, !asset)}>
          <option value="">— Select —</option>
          {usable.map((c) => <option key={c.inspectionTemplateId} value={c.inspectionTemplateId}>{c.templateCode} · {c.nameEn}</option>)}
        </select>
      </Field>
      <Field label={t('common.driver')}>
        <DriverCodeInput id="insp-drivers" value={driverText} onChange={setDriverText} onResolve={setDriver} className={inputClass()} />
      </Field>
      {showKm && <Field label="km"><input type="number" value={km} onChange={(e) => setKm(e.target.value)} className={inputClass()} /></Field>}
      {showHours && <Field label="hrs"><input type="number" step="0.1" value={hours} onChange={(e) => setHours(e.target.value)} className={inputClass()} /></Field>}
      <div className="sm:col-span-2 lg:col-span-3">
        <Field label={t('common.remarks')}><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className={`${inputClass()} resize-none`} /></Field>
      </div>
    </div>
  )

  const lines = !template ? <p className="text-sm text-gray-400">{t('insp.pickChecklist')}</p> : (
    <div className="flex flex-col gap-5">
      {Object.entries(sections).map(([section, its]) => (
        <div key={section} className="flex flex-col gap-2">
          {section && <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{section}</h3>}
          {its.map((i) => {
            const a = answers[i.inspectionTemplateItemId]
            const fail = isFail(i, a)
            const err = shown ? errs[i.inspectionTemplateItemId] : undefined
            return (
              <div key={i.inspectionTemplateItemId} className={`grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start rounded-lg border p-3 ${fail ? 'border-red-300 bg-red-50/40' : 'border-gray-200'}`}>
                <div className="text-sm text-gray-800">{i.itemTextEn}{i.responseType === 'NUMBER' && (i.minValue != null || i.maxValue != null) && <span className="ml-2 text-xs text-gray-400">({i.minValue ?? '…'}–{i.maxValue ?? '…'} {i.unitLabel ?? ''})</span>}</div>
                <div>
                  {i.responseType === 'NUMBER' ? (
                    <input type="number" step="any" value={a?.valueNumber ?? ''} onChange={(e) => set(i.inspectionTemplateItemId, { valueNumber: e.target.value })}
                      className={`${inputClass(fail)} w-32 ${fail ? 'text-red-700' : ''}`} placeholder={i.unitLabel ?? ''} />
                  ) : i.responseType === 'TEXT' ? (
                    <input value={a?.valueText ?? ''} onChange={(e) => set(i.inspectionTemplateItemId, { valueText: e.target.value })} className={`${inputClass()} w-56`} />
                  ) : (
                    <div className="flex gap-1">
                      {(['PASS', 'FAIL', 'NA'] as const).map((r) => (
                        <button key={r} type="button" onClick={() => set(i.inspectionTemplateItemId, { response: r })}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border ${a?.response === r
                            ? r === 'PASS' ? 'bg-green-600 text-white border-green-600' : r === 'FAIL' ? 'bg-red-600 text-white border-red-600' : 'bg-gray-600 text-white border-gray-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                          {r === 'NA' ? 'N/A' : r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <input value={a?.comment ?? ''} onChange={(e) => set(i.inspectionTemplateItemId, { comment: e.target.value })}
                    placeholder={fail ? t('insp.commentRequired') : t('insp.comment')} className={inputClass(fail && !a?.comment?.trim())} />
                  {err && <p className="text-xs text-red-600">{t(err)}</p>}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <FormLayout
      title={`${t('common.new')} ${t('nav.inspections')}`}
      tabs={[{ id: 'general', label: t('form.general'), content: header }, { id: 'lines', label: `${t('insp.items')} (${items.length})`, content: lines }]}
      isNew
      actions={
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={() => router.back()}>{t('common.cancel')}</ToolbarButton>
          <ToolbarButton tone="primary" disabled={submit.isPending || !template} onClick={send}>{submit.isPending ? t('common.loading') : t('insp.submit')}</ToolbarButton>
        </div>
      }
    />
  )
}

function InspectionReadOnly({ id }: { id: string }) {
  const { t } = useT()
  const router = useRouter()
  const insp = useInspection(id)
  if (insp.isLoading) return <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>
  if (insp.error || !insp.data) return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(insp.error, t)}</div>
  const d = insp.data
  const results = [...d.results].sort((a, b) => Number(a.seqNo) - Number(b.seqNo))
  return (
    <FormLayout
      title={`${d.documentNo} · ${d.assetCode}`}
      subtitle={`${d.templateCode} · ${fmt(d.documentDate)}`}
      titleBadge={<ResultBadge result={d.result} defects={d.defects.length} />}
      tabs={[
        {
          id: 'answers', label: t('insp.answers'),
          content: (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {results.map((r) => (
                  <tr key={r.inspectionTemplateItemId}>
                    <td className="py-2 pr-3 text-gray-400 w-8">{r.seqNo}</td>
                    <td className="py-2 pr-3">{r.itemTextEn}</td>
                    <td className={`py-2 pr-3 font-medium ${r.response === 'FAIL' ? 'text-red-600' : 'text-gray-800'}`}>{r.response ?? (r.valueNumber != null ? String(r.valueNumber) : r.valueText ?? '—')}</td>
                    <td className="py-2 text-gray-500">{r.comment ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ),
        },
        {
          id: 'defects', label: `${t('insp.defects')} (${d.defects.length})`,
          content: d.defects.length ? (
            <div className="flex flex-col divide-y divide-gray-100">
              {d.defects.map((x) => (
                <div key={x.defectId} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3 py-2 items-start">
                  <span className="text-sm">{x.description}</span>
                  <SeverityBadge severity={x.severity} />
                  <DefectStatus d={x} />
                  <DefectActions d={x} branchId={d.branchId} />
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">{t('insp.noDefects')}</p>,
        },
      ]}
      actions={<ToolbarButton onClick={() => router.push('/fleet/inspections')}>{t('common.close')}</ToolbarButton>}
    />
  )
}
