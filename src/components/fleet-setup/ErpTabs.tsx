'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2, Link2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SupplierCodeInput } from '@/components/shared/PartyInputs'
import { useToastStore } from '@/lib/stores/useToastStore'
import {
  GL_KEYS, MAP_TYPES, connectionErrors, connectionToForm, isSimulator, mappingErrors, useDeleteErpMapping, useErpConnection,
  useErpMappings, useSaveErpConnection, useSaveErpMapping, useTestErpConnection, type ConnectionForm, type ErpConnectionDto, type ErpMappingDto, type MapType, type MappingForm,
} from '@/lib/api/fleet/erp'
import { errorText } from '@/lib/api/errorText'
import { Banner, Button, Chip, EmptyState, Field, inputClass, LoadError, Loading, Panel, Section, Toggle, useFmt, useWriteErrors } from './ui'

/** Fleet Setup → "ERP connection" (prompt 17 §A). The password is never typed here: `passwordRef` names a server secret. */
export function ErpConnectionTab() {
  const conn = useErpConnection()
  if (conn.isLoading) return <Loading />
  if (conn.error) return <LoadError error={conn.error} />
  return <ConnectionEditor key={conn.data?.rowVersion ?? 'new'} current={conn.data ?? null} />
}

function ConnectionEditor({ current }: { current: ErpConnectionDto | null }) {
  const { t } = useFmt()
  const toast = useToastStore()
  const save = useSaveErpConnection()
  const test = useTestErpConnection()
  const errors = useWriteErrors()
  const [f, setF] = useState<ConnectionForm>(connectionToForm(current))
  const [rules, setRules] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const set = <K extends keyof ConnectionForm>(k: K, v: ConnectionForm[K]) => setF((x) => ({ ...x, [k]: v }))
  const err = (k: string) => (rules[k] ? t(rules[k]) : errors.field(k))
  const sim = isSimulator(f.baseUrl)

  const submit = () => {
    const r = connectionErrors(f)
    setRules(r)
    errors.clear()
    if (Object.keys(r).length) return
    save.mutate({ form: f, rowVersion: current?.rowVersion }, {
      onSuccess: () => toast.success(t('erp.saved')),
      onError: errors.handle,
    })
  }
  const runTest = () => {
    setResult(null)
    test.mutate(undefined, {
      onSuccess: (r) => setResult({ ok: r.ok, message: r.message }),
      onError: (e) => setResult({ ok: false, message: errorText(e, t) }),
    })
  }

  return (
    <Section
      title={t('erp.connection')}
      actions={(
        <>
          {current && <Button busy={test.isPending} onClick={runTest}>{t('erp.test')}</Button>}
          <Button variant="primary" busy={save.isPending} onClick={submit}>{t('common.save')}</Button>
        </>
      )}
    >
      <Banner text={errors.banner} />
      {!current && <p className="text-sm text-gray-500 mb-3">{t('erp.none')}</p>}
      {result && (
        <div role="status" className={`mb-3 p-3 rounded-lg border text-sm ${result.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {result.message}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={`${t('erp.baseUrl')} *`} error={err('baseurl')} hint={t('erp.baseUrlHint')}>
          <input value={f.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} className={inputClass} placeholder="https://<sap-host>:50000/b1s/v1" />
        </Field>
        <Field label={`${t('erp.companyDb')} *`} error={err('companydb')}>
          <input value={f.companyDb} onChange={(e) => set('companyDb', e.target.value)} className={inputClass} />
        </Field>
        <Field label={`${t('erp.userName')} *`} error={err('username')}>
          <input value={f.userName} onChange={(e) => set('userName', e.target.value)} className={inputClass} autoComplete="off" />
        </Field>
        <Field label={t('erp.passwordRef')} error={err('passwordref')} hint={t('erp.passwordRefHint')}>
          <input value={f.passwordRef} onChange={(e) => set('passwordRef', e.target.value)} className={inputClass} placeholder="e.g. SCT_SAP" autoComplete="off" />
        </Field>
        <Field label={t('erp.defaultSeries')} error={err('defaultseries')}>
          <input value={f.defaultSeries} onChange={(e) => set('defaultSeries', e.target.value)} inputMode="numeric" className={inputClass} />
        </Field>
        <Field label={t('erp.active')}>
          <Toggle checked={f.isActive} onChange={(v) => set('isActive', v)} label={f.isActive ? t('erp.activeOn') : t('erp.activeOff')} />
        </Field>
        <div className="md:col-span-2">
          <Field label={t('common.remarks')} error={err('remarks')}>
            <textarea value={f.remarks} onChange={(e) => set('remarks', e.target.value)} rows={2} className={inputClass} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
        {sim ? <Chip tone="blue">{t('erp.simulator')}</Chip> : (
          <Chip tone={current?.passwordSet ? 'green' : 'amber'}>{t('erp.passwordSet')}: {current?.passwordSet ? t('common.yes') : t('common.no')}</Chip>
        )}
        {current?.lastTestAt && (
          <span>{t('erp.lastTest')}: {new Date(current.lastTestAt).toLocaleString('en-GB')} · {current.lastTestResult}</span>
        )}
        {current?.lastPaymentSyncAt && <span>{t('erp.lastPaymentSync')}: {new Date(current.lastPaymentSyncAt).toLocaleString('en-GB')}</span>}
      </div>
    </Section>
  )
}

/** Fleet Setup → "ERP mappings" (prompt 17 §A): one table per map type, add / change (PUT by key) / delete. */
export function ErpMappingsTab() {
  const { t } = useFmt()
  const toast = useToastStore()
  const maps = useErpMappings()
  const remove = useDeleteErpMapping()
  const [editing, setEditing] = useState<MappingForm | null>(null)
  const [removing, setRemoving] = useState<ErpMappingDto | null>(null)

  if (maps.isLoading) return <Loading />
  if (maps.error) return <LoadError error={maps.error} />
  const rows = maps.data ?? []

  return (
    <div className="flex flex-col gap-6">
      {MAP_TYPES.map((type) => {
        const list = rows.filter((r) => r.mapType === type)
        return (
          <Section
            key={type}
            title={`${t(`erp.map.${type}`)} · ${t(`erp.mapHint.${type}`)}`}
            actions={<Button onClick={() => setEditing({ mapType: type, geckoCode: '', erpCode: '', description: '' })}><Plus size={14} /> {t('erp.addMap')}</Button>}
          >
            {list.length === 0 ? (
              <EmptyState icon={<Link2 size={20} />} title={t('erp.noMaps')} body={t(`erp.mapHint.${type}`)} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3">{t('erp.geckoCode')}</th><th className="py-2 pr-3">{t('erp.erpCode')}</th><th className="py-2 pr-3">{t('common.description')}</th><th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((m) => (
                    <tr key={m.erpMappingId} className="border-b border-gray-50">
                      <td className="py-2 pr-3 font-mono">{m.geckoCode}</td>
                      <td className="py-2 pr-3 font-mono">{m.erpCode}</td>
                      <td className="py-2 pr-3 text-gray-600">{m.description ?? ''}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button type="button" title={t('common.edit')} onClick={() => setEditing({ mapType: m.mapType as MapType, geckoCode: m.geckoCode, erpCode: m.erpCode, description: m.description ?? '' })}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"><Pencil size={14} /></button>
                        <button type="button" title={t('common.delete')} onClick={() => setRemoving(m)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )
      })}
      {editing && <MappingPanel initial={editing} existing={rows} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!removing}
        title={t('erp.deleteMap')}
        message={removing ? `${removing.mapType} ${removing.geckoCode} → ${removing.erpCode}` : ''}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) remove.mutate(removing.erpMappingId, { onSuccess: () => toast.success(t('erp.deleted')), onError: (e) => toast.error(t('common.saveFailed'), errorText(e, t)) })
          setRemoving(null)
        }}
      />
    </div>
  )
}

function MappingPanel({ initial, existing, onClose }: { initial: MappingForm; existing: ErpMappingDto[]; onClose: () => void }) {
  const { t } = useFmt()
  const toast = useToastStore()
  const save = useSaveErpMapping()
  const errors = useWriteErrors()
  const [f, setF] = useState<MappingForm>(initial)
  const [rules, setRules] = useState<Record<string, string>>({})
  const isEdit = !!initial.geckoCode
  const err = (k: string) => (rules[k] ? t(rules[k]) : errors.field(k))
  const taken = new Set(existing.filter((m) => m.mapType === f.mapType).map((m) => m.geckoCode))

  const submit = () => {
    const r = mappingErrors(f)
    setRules(r)
    errors.clear()
    if (Object.keys(r).length) return
    save.mutate(f, { onSuccess: () => { toast.success(t('erp.saved')); onClose() }, onError: errors.handle })
  }

  return (
    <Panel
      open
      variant="modal"
      title={`${t(`erp.map.${f.mapType}`)} · ${isEdit ? t('common.edit') : t('erp.addMap')}`}
      onClose={onClose}
      footer={<><Button onClick={onClose}>{t('common.cancel')}</Button><Button variant="primary" busy={save.isPending} onClick={submit}>{t('common.save')}</Button></>}
    >
      <Banner text={errors.banner} />
      <Field label={`${t('erp.geckoCode')} *`} error={err('geckocode')} hint={t(`erp.mapHint.${f.mapType}`)}>
        {f.mapType === 'GL' ? (
          <select value={f.geckoCode} disabled={isEdit} onChange={(e) => setF({ ...f, geckoCode: e.target.value })} className={inputClass}>
            <option value="">—</option>
            {GL_KEYS.map((k) => <option key={k} value={k} disabled={!isEdit && taken.has(k)}>{k} · {t(`erp.gl.${k}`)}</option>)}
          </select>
        ) : f.mapType === 'BP' ? (
          <SupplierCodeInput id="erp-bp" value={f.geckoCode} onChange={(v) => setF({ ...f, geckoCode: v })} disabled={isEdit} className={inputClass} placeholder="Supplier code" />
        ) : (
          <input value={f.geckoCode} disabled={isEdit} onChange={(e) => setF({ ...f, geckoCode: e.target.value })} inputMode="decimal" className={inputClass} placeholder={f.mapType === 'TAX' ? '7' : '3'} />
        )}
      </Field>
      <Field label={`${t('erp.erpCode')} *`} error={err('erpcode')}>
        <input value={f.erpCode} onChange={(e) => setF({ ...f, erpCode: e.target.value })} className={inputClass} />
      </Field>
      <Field label={t('common.description')} error={err('description')}>
        <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputClass} />
      </Field>
    </Panel>
  )
}
