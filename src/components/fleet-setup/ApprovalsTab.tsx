'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import {
  createApprovalPolicy, deleteApprovalPolicy, num, updateApprovalPolicy, useApprovalPolicies, useSetupCatalogue, useSetupMutation,
  type ApprovalPolicy,
} from '@/lib/api/fleet/setup'
import {
  Banner, Button, Chip, EmptyState, Field, inputClass, LoadError, Loading, Panel, ScopeSelect, Section, Toggle,
  useFmt, useScopeLabel, useWriteErrors,
} from './ui'

/** i18n key of a permission label: dots are path separators in the i18n files. */
export const permissionKey = (code: string) => `fleetPerm.${code.replace(/\./g, '_')}`

export function usePermissionLabel() {
  const { label } = useFmt()
  return (code: string) => label(permissionKey(code), code)
}

/** Client rules of an approval step (the API's Check). Values are i18n keys. */
export function approvalErrors(f: { approvalLevel: number; minAmount: string; currencyCode: string }) {
  const errors: Record<string, string> = {}
  if (!Number.isInteger(f.approvalLevel) || f.approvalLevel < 1 || f.approvalLevel > 9) errors.approvalLevel = 'fleetSetup.rule.level'
  const hasAmount = f.minAmount.trim() !== ''
  const currency = f.currencyCode.trim()
  if (hasAmount && (Number.isNaN(Number(f.minAmount)) || Number(f.minAmount) < 0)) errors.minAmount = 'fleetSetup.rule.amount'
  if (hasAmount !== (currency !== '')) errors.currencyCode = 'fleetSetup.rule.amountCurrency'
  else if (currency && !/^[A-Za-z]{3}$/.test(currency)) errors.currencyCode = 'fleetSetup.rule.currency'
  return errors
}

type Editing = { mode: 'edit'; row: ApprovalPolicy } | { mode: 'create'; documentType: string }

export function ApprovalsTab() {
  const { t, fmt, label } = useFmt()
  const scopeOf = useScopeLabel()
  const permLabel = usePermissionLabel()
  const toast = useToastStore()
  const policies = useApprovalPolicies(true)
  const catalogue = useSetupCatalogue()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [removing, setRemoving] = useState<ApprovalPolicy | null>(null)
  const remove = useSetupMutation((p: ApprovalPolicy) => deleteApprovalPolicy(p.approvalPolicyId, p.rowVersion), 'approvals')

  const types = catalogue.data?.approvalDocumentTypes ?? []
  const docName = (type: string) => label(`fleetSetup.docType.${type}`, types.find((d) => d.documentType === type)?.description ?? type)
  const rows = policies.data ?? []
  // Catalogue order, then any stored type the catalogue no longer lists.
  const groups = [...types.map((d) => d.documentType), ...new Set(rows.map((r) => r.documentType).filter((x) => !types.some((d) => d.documentType === x)))]

  const col = createColumnHelper<ApprovalPolicy>()
  const columns = [
    col.display({
      id: 'level',
      header: t('fleetSetup.colLevel'),
      cell: ({ row: { original: p } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{fmt('fleetSetup.levelN', { n: num(p.approvalLevel) ?? '' })}</span>
          {p.description && <span className="text-xs text-gray-500">{p.description}</span>}
        </div>
      ),
    }),
    col.display({
      id: 'amount',
      header: t('fleetSetup.colFromAmount'),
      cell: ({ row: { original: p } }) => (
        <span className="text-sm">
          {p.minAmount === null ? t('fleetSetup.always') : `${(num(p.minAmount) ?? 0).toLocaleString()} ${p.currencyCode ?? ''}`}
        </span>
      ),
    }),
    col.display({
      id: 'permission',
      header: t('fleetSetup.colPermission'),
      cell: ({ row: { original: p } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{permLabel(p.requiredPermission)}</span>
          <span className="text-[11px] text-gray-400 font-mono">{p.requiredPermission}</span>
        </div>
      ),
    }),
    col.display({
      id: 'scope',
      header: t('fleetSetup.colScope'),
      cell: ({ row: { original: p } }) => (
        <div className="flex flex-col gap-1 items-start">
          <span className="text-sm">{scopeOf(p.branchId)}</span>
          <Chip tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? t('common.active') : t('common.inactive')}</Chip>
        </div>
      ),
    }),
    col.display({
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row: { original: p } }) => (
        <div className="flex gap-1">
          <Button variant="ghost" onClick={() => setEditing({ mode: 'edit', row: p })} title={t('common.edit')}><Pencil size={14} /></Button>
          <Button variant="ghost" onClick={() => setRemoving(p)} title={t('common.delete')}><Trash2 size={14} className="text-red-500" /></Button>
        </div>
      ),
    }),
  ]

  if (policies.isLoading || catalogue.isLoading) return <Section title={t('fleetSetup.approvals')}><Loading /></Section>
  if (policies.error || catalogue.error) return <Section title={t('fleetSetup.approvals')}><LoadError error={policies.error ?? catalogue.error} /></Section>

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">{t('fleetSetup.approvalsHint')}</p>
      {groups.map((type) => {
        const list = rows
          .filter((r) => r.documentType === type)
          .sort((a, b) => (a.branchId ?? '').localeCompare(b.branchId ?? '') || (num(a.approvalLevel) ?? 0) - (num(b.approvalLevel) ?? 0))
        return (
          <Section
            key={type}
            title={docName(type)}
            actions={types.some((d) => d.documentType === type) && (
              <Button onClick={() => setEditing({ mode: 'create', documentType: type })}><Plus size={14} /> {t('fleetSetup.addLevel')}</Button>
            )}
          >
            {list.length ? (
              <DataTable data={list} columns={columns} pageSize={20} />
            ) : (
              <p className="px-4 py-4 text-sm text-gray-500 flex items-center gap-2"><ShieldCheck size={16} className="text-gray-400" /> {t('fleetSetup.noApproval')}</p>
            )}
          </Section>
        )
      })}
      {!groups.length && <EmptyState icon={<ShieldCheck size={20} />} title={t('fleetSetup.approvals')} body={t('fleetSetup.noApproval')} />}

      {editing && (
        <ApprovalModal
          editing={editing}
          rows={rows}
          docName={docName}
          defaultPermission={(type) => types.find((d) => d.documentType === type)?.defaultPermission ?? ''}
          permissions={catalogue.data?.permissions ?? []}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        title={t('fleetSetup.deleteLevel')}
        message={removing ? fmt('fleetSetup.deleteLevelBody', { level: num(removing.approvalLevel) ?? '', doc: docName(removing.documentType), scope: scopeOf(removing.branchId) }) : ''}
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

function ApprovalModal({ editing, rows, docName, defaultPermission, permissions, onClose }: {
  editing: Editing
  rows: ApprovalPolicy[]
  docName: (type: string) => string
  defaultPermission: (type: string) => string
  permissions: string[]
  onClose: () => void
}) {
  const { t } = useFmt()
  const toast = useToastStore()
  const permLabel = usePermissionLabel()
  const errors = useWriteErrors()
  const original = editing.mode === 'edit' ? editing.row : null
  const documentType = original?.documentType ?? (editing.mode === 'create' ? editing.documentType : '')

  const [form, setForm] = useState(() => {
    if (original) return {
      branchId: original.branchId,
      approvalLevel: num(original.approvalLevel) ?? 1,
      minAmount: original.minAmount === null ? '' : String(num(original.minAmount)),
      currencyCode: original.currencyCode ?? '',
      requiredPermission: original.requiredPermission,
      description: original.description ?? '',
      isActive: original.isActive,
    }
    const tenantLevels = rows.filter((r) => r.documentType === documentType && !r.branchId).map((r) => num(r.approvalLevel) ?? 0)
    return {
      branchId: null as string | null,
      approvalLevel: Math.min(9, Math.max(0, ...tenantLevels) + 1),
      minAmount: '',
      currencyCode: '',
      requiredPermission: defaultPermission(documentType),
      description: '',
      isActive: true,
    }
  })
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const rules = approvalErrors(form)
  const duplicate = rows.some((r) => r.documentType === documentType && (r.branchId ?? null) === form.branchId
    && num(r.approvalLevel) === form.approvalLevel && r.approvalPolicyId !== original?.approvalPolicyId)
  const err = (k: string) => (rules[k] ? t(rules[k]) : errors.field(k))

  const save = useSetupMutation(async () => {
    const common = {
      approvalLevel: form.approvalLevel,
      minAmount: form.minAmount.trim() === '' ? null : Number(form.minAmount),
      currencyCode: form.currencyCode.trim() ? form.currencyCode.trim().toUpperCase() : null,
      requiredPermission: form.requiredPermission,
      description: form.description.trim() || null,
      isActive: form.isActive,
    }
    if (original) return updateApprovalPolicy(original.approvalPolicyId, { ...common, rowVersion: original.rowVersion })
    return createApprovalPolicy({ ...common, documentType, branchId: form.branchId })
  }, 'approvals')

  const submit = () => {
    errors.clear()
    save.mutate(undefined, { onSuccess: () => { toast.success(t('fleetSetup.saved')); onClose() }, onError: errors.handle })
  }

  return (
    <Panel
      open
      variant="modal"
      title={`${docName(documentType)} · ${original ? t('fleetSetup.editLevel') : t('fleetSetup.addLevel')}`}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" busy={save.isPending} disabled={Object.keys(rules).length > 0 || duplicate} onClick={submit}>{t('common.save')}</Button>
        </>
      )}
    >
      <Banner text={errors.banner} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fleetSetup.colScope')} htmlFor="ap-scope" error={errors.field('branchId')} hint={original ? t('fleetSetup.scopeFixed') : t('fleetSetup.branchRulesReplace')}>
          <ScopeSelect id="ap-scope" value={form.branchId} onChange={(v) => set('branchId', v)} disabled={!!original} />
        </Field>
        <Field label={t('fleetSetup.colLevel')} htmlFor="ap-level" error={err('approvalLevel') ?? (duplicate ? t('fleetSetup.rule.duplicateLevel') : undefined)}>
          <input id="ap-level" type="number" min={1} max={9} className={inputClass} value={form.approvalLevel}
            onChange={(e) => set('approvalLevel', Number(e.target.value))} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fleetSetup.colFromAmount')} htmlFor="ap-amount" error={err('minAmount')} hint={t('fleetSetup.amountHint')}>
          <input id="ap-amount" type="number" min={0} step="any" className={inputClass} value={form.minAmount}
            onChange={(e) => set('minAmount', e.target.value)} />
        </Field>
        <Field label={t('fleetSetup.currency')} htmlFor="ap-cur" error={err('currencyCode')}>
          <input id="ap-cur" maxLength={3} className={`${inputClass} uppercase`} placeholder="THB" value={form.currencyCode}
            onChange={(e) => set('currencyCode', e.target.value.toUpperCase())} />
        </Field>
      </div>
      <Field label={t('fleetSetup.colPermission')} htmlFor="ap-perm" error={errors.field('requiredPermission')}>
        <select id="ap-perm" className={inputClass} value={form.requiredPermission} onChange={(e) => set('requiredPermission', e.target.value)}>
          {(permissions.includes(form.requiredPermission) ? permissions : [form.requiredPermission, ...permissions]).map((p) => (
            <option key={p} value={p}>{permLabel(p)} ({p})</option>
          ))}
        </select>
      </Field>
      <Field label={t('common.description')} htmlFor="ap-desc" error={errors.field('description')}>
        <input id="ap-desc" maxLength={400} className={inputClass} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label={t('common.active')} />
    </Panel>
  )
}
