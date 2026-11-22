'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { ListPage } from '@/components/shared/ListPage'
import { FormLayout } from '@/components/shared/FormLayout'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { Field, inputClass } from '@/components/shared/FormField'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { PartyCodeInput } from '@/components/shared/PartyInputs'
import { Alert, Loading, StatusPill, cellInput, fmtDate, money, useDocActions, useSaveFailure } from '@/components/docs/DocBits'
import { CustomerRateFilters } from '@/components/customer-rates/CustomerRateFilters'
import { StandardRateFilters } from '@/components/standard-rates/StandardRateFilters'
import { useT } from '@/i18n/I18nContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { FLEET_TRADE, useCodeList } from '@/lib/api/fleet/setup'
import { ITEM_CATEGORY_LIST, useItems } from '@/lib/api/fleet/items'
import { useServiceTypes } from '@/lib/api/fleet/serviceTasks'
import {
  CARD_STATUS_CLASS, LINE_KINDS, SUNDRY_KINDS, TIME_BANDS, appliesTo, copyCard, defaultChargeCode, newRow, rateMeaning, toCardRequest, toRow,
  useRepairCard, useRepairCardMutations, useRepairCards, type CardHeader, type PriceCheckResult, type RateRow, type RepairCardDto,
} from '@/lib/api/platform/repairTariffs'

export type TariffVariant = 'standard' | 'customer'
const BASE: Record<TariffVariant, string> = { standard: '/tariff/standard-rates', customer: '/tariff/customer-rates' }
const col = createColumnHelper<RepairCardDto>()
const pill = (s: string) => <StatusPill view={s} className={CARD_STATUS_CLASS[s] ?? 'bg-gray-100 text-gray-700'} />

// ── list ────────────────────────────────────────────────────────────────────
export function RepairTariffListView(p: {
  variant: TariffVariant; code: string; party: string; description: string; status: string; dateFrom: string; dateTo: string
}) {
  const { t } = useT()
  const router = useRouter()
  const { canAtBranch } = useAuth()
  const { currentBranchId } = useBranchContext()
  const std = p.variant === 'standard'
  const list = useRepairCards({ standard: std, search: p.code || undefined, status: p.status || undefined })
  const party = p.party.trim().toUpperCase()
  const desc = p.description.trim().toUpperCase()
  const rows = (list.data ?? []).filter((d) =>
    (!party || (d.partyCode ?? '').toUpperCase().includes(party) || (d.partyName ?? '').toUpperCase().includes(party)) &&
    (!desc || (d.description ?? '').toUpperCase().includes(desc)) &&
    (!p.dateFrom || d.cardDate >= p.dateFrom) && (!p.dateTo || d.cardDate <= p.dateTo))
  const open = (d: RepairCardDto) => router.push(`${BASE[p.variant]}/${d.repairRateCardId}`)
  const no = (header: string) => col.display({ id: 'no', header, cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => open(d)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{d.cardCode}</button><span className="text-xs text-gray-400">{fmtDate(d.cardDate)}</span></div> })
  const status = col.display({ id: 'status', header: () => t('common.status'), size: 120, cell: ({ row: { original: d } }) => <div className="flex flex-col gap-1">{pill(d.status)}<button type="button" onClick={() => open(d)} className="text-xs text-blue-600 hover:underline text-left">{t('common.edit')}</button></div> })
  const columns = std
    ? [
        no('Rate Code / Date'),
        col.display({ id: 'desc', header: () => t('common.description'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{d.description ?? '—'}</span><span className="text-xs text-gray-400">{d.lines.length} {t('docs.lines')} · {fmtDate(d.effectiveFrom)}{d.effectiveTo ? ` – ${fmtDate(d.effectiveTo)}` : ''}</span></div> }),
        col.display({ id: 'appr', header: 'Approved By', cell: ({ row: { original: d } }) => <span className="text-sm">{d.approvedAt ? fmtDate(d.approvedAt) : '—'}</span> }),
        status,
      ]
    : [
        no('Quotation No / Date'),
        col.display({ id: 'party', header: () => t('common.customer'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm font-medium">{d.partyName ?? d.partyCode ?? '—'}</span><span className="text-xs text-gray-400 font-mono">{d.partyCode}</span></div> }),
        col.display({ id: 'valid', header: 'Validity', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{fmtDate(d.effectiveFrom)}</span><span className="text-xs text-gray-400">{d.effectiveTo ? fmtDate(d.effectiveTo) : t('tariff.openEnded')}</span></div> }),
        col.display({ id: 'by', header: 'Created / Approved By', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{d.salesPerson ?? '—'}</span><span className="text-xs text-gray-400">{d.approvedAt ? fmtDate(d.approvedAt) : ''}</span></div> }),
        status,
      ]
  const title = std ? t('nav.standardRates') : t('nav.customerRates')
  return (
    <ListPage
      title={title}
      subtitle={`${rows.length} record${rows.length !== 1 ? 's' : ''} found`}
      actions={canAtBranch('revenue.tariff.manage', currentBranchId) && <Link href={`${BASE[p.variant]}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {title}</Link>}
      filters={std
        ? <StandardRateFilters rateCode={p.code} description={p.description} status={p.status} />
        : <CustomerRateFilters quotationNo={p.code} customerName={p.party} agentCode="" status={p.status} dateFrom={p.dateFrom} dateTo={p.dateTo} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

// ── form ────────────────────────────────────────────────────────────────────
export function RepairTariffView({ variant, id, copyFrom }: { variant: TariffVariant; id: string; copyFrom?: string }) {
  const card = useRepairCard(id === 'new' ? copyFrom ?? null : id)
  if (id === 'new') {
    if (copyFrom && card.isLoading) return <Loading />
    return <RepairTariffForm variant={variant} copy={card.data ? copyCard(card.data) : undefined} />
  }
  if (card.isLoading) return <Loading />
  if (!card.data) return <p className="text-sm text-red-600">Not found.</p>
  return <RepairTariffForm key={card.data.rowVersion} variant={variant} current={card.data} />
}

const today = () => new Date().toISOString().slice(0, 10)

function RepairTariffForm({ variant, current, copy }: { variant: TariffVariant; current?: RepairCardDto; copy?: ReturnType<typeof copyCard> }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { canAtBranch } = useAuth()
  const { currentBranchId } = useBranchContext()
  const { save, action } = useRepairCardMutations()
  const std = variant === 'standard'
  const [h, setH] = useState<CardHeader>(copy?.header ?? {
    cardCode: current?.cardCode ?? '', cardDate: current?.cardDate?.slice(0, 10) ?? today(), effectiveFrom: current?.effectiveFrom?.slice(0, 10) ?? today(),
    effectiveTo: current?.effectiveTo?.slice(0, 10) ?? '', partyCode: current?.partyCode ?? '', currencyCode: current?.currencyCode ?? 'THB',
    pricesIncludeTax: current?.pricesIncludeTax ?? false, description: current?.description ?? '', salesPerson: current?.salesPerson ?? '',
    contactNo: current?.contactNo ?? '', remarks: current?.remarks ?? '',
  })
  const [partyName, setPartyName] = useState<string | null>(current?.partyName ?? null)
  const [rows, setRows] = useState<RateRow[]>(copy?.rows ?? (current?.lines ?? []).map(toRow))
  const [banner, setBanner] = useState<string | null>(null)
  const status = current?.status ?? 'NEW'
  // revenue.tariff.* are branch-scoped (owner answer 12 Q3): checked at the header branch.
  const manage = canAtBranch('revenue.tariff.manage', currentBranchId)
  const approve = canAtBranch('revenue.tariff.approve', currentBranchId)
  const editable = ['NEW', 'DRAFT', 'REJECTED'].includes(status) && manage
  const acts = useDocActions(action, current?.repairRateCardId, current?.rowVersion)
  const busy = save.isPending || action.isPending
  const set = (p: Partial<CardHeader>) => setH((x) => ({ ...x, ...p }))
  const setRow = (i: number, p: Partial<RateRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const base = BASE[variant]

  const persist = async (submit: boolean) => {
    setBanner(null)
    if (!h.cardCode.trim() || !h.cardDate || !h.effectiveFrom) { setBanner(t('tariff.rule.header')); return }
    if (!std && !h.partyCode.trim()) { setBanner(t('tariff.rule.party')); return }
    if (h.effectiveTo && h.effectiveTo < h.effectiveFrom) { setBanner(t('tariff.rule.dates')); return }
    try {
      let saved = await save.mutateAsync({ id: current?.repairRateCardId, body: toCardRequest(h, rows, std, current?.rowVersion) })
      if (submit) saved = await action.mutateAsync({ id: saved.repairRateCardId, action: 'submit', body: { reason: null, rowVersion: saved.rowVersion } })
      toast.success(t('docs.saved'), saved.cardCode)
      if (!current) router.push(`${base}/${saved.repairRateCardId}`)
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const dis = !editable
  const header = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
      <Field label={`${std ? 'Rate Code' : t('form.quotationNo')} *`}><input value={h.cardCode} onChange={(e) => set({ cardCode: e.target.value.toUpperCase() })} disabled={dis || !!current} className={inputClass(false, dis || !!current)} placeholder={std ? 'e.g. STD-2026' : 'e.g. QT-2026-001'} /></Field>
      <Field label={`${std ? 'Rate Date' : 'Quotation Date'} *`}><input type="date" value={h.cardDate} onChange={(e) => set({ cardDate: e.target.value })} disabled={dis} className={inputClass(false, dis)} /></Field>
      <Field label="Effective Date *"><input type="date" value={h.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} disabled={dis} className={inputClass(false, dis)} /></Field>
      {!std && <Field label="Expiry Date" hint={!h.effectiveTo ? t('tariff.openEnded') : undefined}><input type="date" value={h.effectiveTo} onChange={(e) => set({ effectiveTo: e.target.value })} disabled={dis} className={inputClass(false, dis)} /></Field>}
      {!std && <Field label="Customer Code *"><PartyCodeInput id="rt-party" value={h.partyCode} onChange={(v) => set({ partyCode: v })} onName={(n) => n && setPartyName(n)} disabled={dis} className={inputClass(false, dis)} /></Field>}
      {!std && <Field label="Customer Name"><input readOnly value={partyName ?? ''} placeholder="—" className={inputClass(false, true)} /></Field>}
      {std && <Field label={t('form.description')}><input value={h.description} onChange={(e) => set({ description: e.target.value })} disabled={dis} className={inputClass(false, dis)} /></Field>}
      {!std && <Field label="Sales Person"><input value={h.salesPerson} onChange={(e) => set({ salesPerson: e.target.value })} disabled={dis} className={inputClass(false, dis)} /></Field>}
      {!std && <Field label="Contact No."><input value={h.contactNo} onChange={(e) => set({ contactNo: e.target.value })} disabled={dis} className={inputClass(false, dis)} /></Field>}
      <Field label={t('tariff.currency')}><input value={h.currencyCode} onChange={(e) => set({ currencyCode: e.target.value.toUpperCase() })} disabled={dis} maxLength={3} className={inputClass(false, dis)} /></Field>
      <Field label={t('common.status')}><div className="pt-1 flex items-center gap-2">{current ? pill(current.status) : <span className="text-sm text-gray-500">—</span>}{current?.approvedAt && <span className="text-xs text-gray-500">{fmtDate(current.approvedAt)}</span>}</div></Field>
      {current?.rejectReason && <div className="sm:col-span-2 lg:col-span-3"><Alert>{t('tariff.rejected')}: {current.rejectReason}</Alert></div>}
      <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea value={h.remarks} onChange={(e) => set({ remarks: e.target.value })} disabled={dis} rows={3} className={`${inputClass(false, dis)} resize-none`} /></Field></div>
    </div>
  )

  const tabs = [
    { id: 'header', label: t('form.rateHeader'), content: header },
    { id: 'lines', label: `${t('form.chargeDetails')} (${rows.length})`, content: <RateLines rows={rows} setRow={setRow} setRows={setRows} editable={editable} /> },
    { id: 'check', label: t('tariff.checkPrice'), content: <PriceCheckPanel partyCode={std ? null : h.partyCode.trim() || null} /> },
  ]
  const no = current?.cardCode ?? ''
  return (
    <>
      <FormLayout
        title={current?.cardCode ?? `${t('common.new')} ${std ? t('nav.standardRates') : t('nav.customerRates')}`}
        subtitle={current ? (std ? current.description ?? undefined : current.partyName ?? current.partyCode ?? undefined) : copy ? t('tariff.copyOf') : undefined}
        tabs={tabs}
        isNew={!current}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {status === 'PENDING' && approve && <ToolbarButton tone="danger" disabled={busy} onClick={() => acts.ask('reject', `${t('wo.action.REJECTED')} · ${no}`, true)}>{t('wo.action.REJECTED')}</ToolbarButton>}
            {status === 'PENDING' && approve && <ToolbarButton tone="success" disabled={busy} onClick={() => acts.run('approve')}>{t('common.approve')}</ToolbarButton>}
            {/* Withdraw hidden on DRAFT until the API allows it (live test C1, owner 2026-11-20) */}
            {['DRAFT', 'PENDING', 'APPROVED'].includes(status) && approve && <ToolbarButton tone="danger" disabled={busy} onClick={() => acts.ask('withdraw', `${t('tariff.withdraw')} · ${no}`)}>{t('tariff.withdraw')}</ToolbarButton>}
            {current && !editable && manage && <ToolbarButton onClick={() => router.push(`${base}/new?copyFrom=${current.repairRateCardId}`)}>{t('tariff.copy')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {editable && <ToolbarButton disabled={busy} onClick={() => persist(true)}>{t('wr.action.submit')}</ToolbarButton>}
            {editable && <ToolbarButton tone="primary" disabled={busy} onClick={() => persist(false)}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>}
          </div>
        }
      />
      {acts.dialogNode}
    </>
  )
}

function RateLines({ rows, setRow, setRows, editable }: { rows: RateRow[]; setRow: (i: number, p: Partial<RateRow>) => void; setRows: (f: (r: RateRow[]) => RateRow[]) => void; editable: boolean }) {
  const { t } = useT()
  const trades = useCodeList(FLEET_TRADE)
  const cats = useCodeList(ITEM_CATEGORY_LIST)
  const tasks = useServiceTypes({})
  const items = useItems({ active: true })
  const small = `${cellInput} text-xs`
  const applies = (r: RateRow, i: number) => {
    const f = appliesTo(r.lineKind, r.sundryKind)
    const lbl = (k: string) => <span className="text-[10px] text-gray-500 w-16 shrink-0">{t(`tariff.field.${k}`)}</span>
    return (
      <div className="flex flex-col gap-1">
        {f.includes('tradeCode') && <div className="flex items-center gap-1">{lbl('trade')}<select value={r.tradeCode} onChange={(e) => setRow(i, { tradeCode: e.target.value })} disabled={!editable} aria-label={`Trade ${i + 1}`} className={small}><option value="">{t('tariff.any')}</option>{trades.data?.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.descriptionEn}</option>)}</select></div>}
        {f.includes('timeBand') && <div className="flex items-center gap-1">{lbl('timeBand')}<select value={r.timeBand} onChange={(e) => setRow(i, { timeBand: e.target.value })} disabled={!editable} aria-label={`Time band ${i + 1}`} className={small}>{TIME_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>}
        {f.includes('minQty') && <div className="flex items-center gap-1">{lbl('minHours')}<input type="number" step="any" value={r.minQty} onChange={(e) => setRow(i, { minQty: e.target.value })} disabled={!editable} aria-label={`Minimum hours ${i + 1}`} className={small} /></div>}
        {f.includes('serviceTaskCode') && <div className="flex items-center gap-1">{lbl('task')}<input value={r.serviceTaskCode} list="rt-tasks" onChange={(e) => setRow(i, { serviceTaskCode: e.target.value.toUpperCase() })} disabled={!editable} aria-label={`Service task ${i + 1}`} className={`${small} font-mono`} /></div>}
        {f.includes('stdHours') && <div className="flex items-center gap-1">{lbl('stdHours')}<input type="number" step="any" value={r.stdHours} onChange={(e) => setRow(i, { stdHours: e.target.value })} disabled={!editable} aria-label={`Std hours ${i + 1}`} className={small} /></div>}
        {f.includes('costFrom') && <div className="flex items-center gap-1">{lbl('costBand')}<input type="number" step="any" value={r.costFrom} onChange={(e) => setRow(i, { costFrom: e.target.value })} disabled={!editable} aria-label={`Cost from ${i + 1}`} className={small} placeholder="0" /><span className="text-xs">–</span><input type="number" step="any" value={r.costTo} onChange={(e) => setRow(i, { costTo: e.target.value })} disabled={!editable} aria-label={`Cost to ${i + 1}`} className={small} placeholder="∞" /></div>}
        {f.includes('itemCategoryCode') && <div className="flex items-center gap-1">{lbl('category')}<select value={r.itemCategoryCode} onChange={(e) => setRow(i, { itemCategoryCode: e.target.value, chargeCode: r.chargeCode === defaultChargeCode('MARKUP', r.itemCategoryCode) ? defaultChargeCode('MARKUP', e.target.value) : r.chargeCode })} disabled={!editable} aria-label={`Category ${i + 1}`} className={small}><option value="">{t('tariff.any')}</option><option value="SUBLET">SUBLET</option>{cats.data?.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.descriptionEn}</option>)}</select></div>}
        {f.includes('itemCode') && <div className="flex items-center gap-1">{lbl('item')}<input value={r.itemCode} list="rt-items" onChange={(e) => setRow(i, { itemCode: e.target.value.toUpperCase() })} disabled={!editable} aria-label={`Item ${i + 1}`} className={`${small} font-mono`} /></div>}
        {f.includes('sundryKind') && <div className="flex items-center gap-1">{lbl('sundry')}<select value={r.sundryKind} onChange={(e) => setRow(i, { sundryKind: e.target.value })} disabled={!editable} aria-label={`Sundry kind ${i + 1}`} className={small}>{SUNDRY_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>}
        {f.includes('capAmount') && <div className="flex items-center gap-1">{lbl('cap')}<input type="number" step="0.01" value={r.capAmount} onChange={(e) => setRow(i, { capAmount: e.target.value })} disabled={!editable} aria-label={`Cap ${i + 1}`} className={small} /></div>}
      </div>
    )
  }
  return (
    <>
      <datalist id="rt-tasks">{tasks.data?.map((x) => <option key={x.code} value={x.code}>{x.description}</option>)}</datalist>
      <datalist id="rt-items">{items.data?.map((x) => <option key={x.itemId} value={x.itemCode}>{x.descriptionEn}</option>)}</datalist>
      <LineItemsEditor
        items={rows}
        getKey={(r) => r.key}
        readOnly={!editable}
        columns={[
          { id: 'charge', header: 'Charge Code', className: 'w-28', cell: (r, i) => <input value={r.chargeCode} onChange={(e) => setRow(i, { chargeCode: e.target.value.toUpperCase() })} disabled={!editable} aria-label={`Charge code ${i + 1}`} className={`${cellInput} font-mono`} /> },
          { id: 'desc', header: 'Description', cell: (r, i) => <input value={r.description} onChange={(e) => setRow(i, { description: e.target.value })} disabled={!editable} aria-label={`Description ${i + 1}`} className={cellInput} /> },
          {
            id: 'kind', header: 'Charge Type', className: 'w-32',
            cell: (r, i) => (
              <select value={r.lineKind} disabled={!editable} aria-label={`Charge type ${i + 1}`} className={cellInput}
                onChange={(e) => { const k = e.target.value; setRow(i, { ...newRow(k), key: r.key, description: r.description, rate: r.rate, chargeCode: r.chargeCode === defaultChargeCode(r.lineKind, r.itemCategoryCode) ? defaultChargeCode(k) : r.chargeCode }) }}>
                {LINE_KINDS.map((k) => <option key={k} value={k}>{t(`tariff.kind.${k}`)}</option>)}
              </select>
            ),
          },
          { id: 'applies', header: t('tariff.appliesTo'), className: 'w-64', cell: applies },
          { id: 'unit', header: 'Billing Unit', className: 'w-20', cell: (r) => <span className="text-xs text-gray-500">{r.billingUnitCode || '—'}</span> },
          {
            id: 'rate', header: 'Sell Rate', className: 'w-28',
            cell: (r, i) => (
              <div className="flex flex-col gap-0.5">
                <input type="number" step="0.01" value={r.rate} onChange={(e) => setRow(i, { rate: e.target.value })} disabled={!editable} aria-label={`Rate ${i + 1}`} className={cellInput} />
                <span className="text-[10px] text-gray-500">{t(`tariff.rate.${rateMeaning(r.lineKind, r.sundryKind)}`)}</span>
              </div>
            ),
          },
        ]}
        onAdd={() => setRows((rs) => [...rs, newRow('LABOR')])}
        onRemove={(i) => setRows((rs) => rs.filter((_, j) => j !== i))}
        addLabel={t('tariff.addLine')}
        removeLabel={t('wo.removeLine')}
        emptyText={t('tariff.noLines')}
      />
    </>
  )
}

/** "Check a price" (optional in the prompt): one line priced with the card the API picks for the party on a date. */
function PriceCheckPanel({ partyCode }: { partyCode: string | null }) {
  const { t } = useT()
  const failure = useSaveFailure()
  const { priceCheck } = useRepairCardMutations()
  const [on, setOn] = useState(today())
  const [roadside, setRoadside] = useState(false)
  const [l, setL] = useState({ lineType: 'LABOR', qty: '1', unitCost: '0', description: 'Check', tradeCode: '', timeBand: 'NORMAL', serviceTaskCode: '', itemCode: '', itemCategoryCode: '' })
  const [result, setResult] = useState<PriceCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = (p: Partial<typeof l>) => setL((x) => ({ ...x, ...p }))
  const run = () => {
    setError(null)
    const n = (v: string) => v.trim().toUpperCase() || null
    priceCheck.mutate({
      on, partyCode, roadside,
      lines: [{ lineType: l.lineType, lineId: null, qty: Number(l.qty), unitCost: Number(l.unitCost), description: l.description || l.lineType, tradeCode: n(l.tradeCode), timeBand: l.lineType === 'LABOR' ? l.timeBand : null, serviceTaskCode: n(l.serviceTaskCode), itemCode: n(l.itemCode), itemCategoryCode: n(l.itemCategoryCode) }],
    }, { onSuccess: setResult, onError: (e) => setError(failure(e)) })
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">{t('tariff.checkHint')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label={t('common.date')}><input type="date" value={on} onChange={(e) => setOn(e.target.value)} className={inputClass()} /></Field>
        <Field label={t('common.type')}><select value={l.lineType} onChange={(e) => set({ lineType: e.target.value })} className={inputClass()}>{['LABOR', 'PART', 'SUBLET', 'SUNDRY'].map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
        <Field label="Qty"><input type="number" step="any" value={l.qty} onChange={(e) => set({ qty: e.target.value })} className={inputClass()} /></Field>
        <Field label={t('tariff.unitCost')}><input type="number" step="0.01" value={l.unitCost} onChange={(e) => set({ unitCost: e.target.value })} className={inputClass()} /></Field>
        {l.lineType === 'LABOR' && <Field label={t('tariff.field.trade')}><input value={l.tradeCode} onChange={(e) => set({ tradeCode: e.target.value })} className={inputClass()} /></Field>}
        {l.lineType === 'LABOR' && <Field label={t('tariff.field.timeBand')}><select value={l.timeBand} onChange={(e) => set({ timeBand: e.target.value })} className={inputClass()}>{TIME_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}</select></Field>}
        {l.lineType === 'LABOR' && <Field label={t('tariff.field.task')}><input value={l.serviceTaskCode} onChange={(e) => set({ serviceTaskCode: e.target.value })} className={inputClass()} /></Field>}
        {l.lineType === 'PART' && <Field label={t('tariff.field.item')}><input value={l.itemCode} onChange={(e) => set({ itemCode: e.target.value })} className={inputClass()} /></Field>}
        {(l.lineType === 'PART' || l.lineType === 'SUBLET') && <Field label={t('tariff.field.category')}><input value={l.itemCategoryCode} onChange={(e) => set({ itemCategoryCode: e.target.value })} className={inputClass()} /></Field>}
        <label className="flex items-center gap-2 text-sm pt-6"><input type="checkbox" checked={roadside} onChange={(e) => setRoadside(e.target.checked)} />{t('tariff.roadside')}</label>
      </div>
      <div><ToolbarButton tone="primary" disabled={priceCheck.isPending} onClick={run}>{t('tariff.checkPrice')}</ToolbarButton></div>
      {error && <Alert>{error}</Alert>}
      {result && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">{t('tariff.cardUsed')}: <span className="font-mono">{result.card?.cardCode ?? t('tariff.noCard')}</span></p>
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50 text-xs text-gray-500"><tr className="text-left"><th className="px-3 py-2">Charge</th><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">{t('tariff.unitPrice')}</th><th className="px-3 py-2 text-right">{t('common.amount')}</th><th className="px-3 py-2">{t('tariff.ref')}</th></tr></thead>
            <tbody>{result.lines.map((x, i) => <tr key={i} className="border-t border-gray-100"><td className="px-3 py-1.5 font-mono">{x.chargeCode}</td><td className="px-3 py-1.5">{x.description}</td><td className="px-3 py-1.5 text-right">{Number(x.qty)}</td><td className="px-3 py-1.5 text-right">{money(x.unitPrice)}</td><td className="px-3 py-1.5 text-right">{money(x.amount)}</td><td className="px-3 py-1.5 font-mono text-xs">{x.rateCardRef}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
