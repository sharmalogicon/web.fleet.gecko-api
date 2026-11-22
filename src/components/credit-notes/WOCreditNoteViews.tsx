'use client'

import { useState } from 'react'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { FormLayout } from '@/components/shared/FormLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ReasonDialog, ToolbarButton } from '@/components/shared/ReasonDialog'
import { PartyCodeInput } from '@/components/shared/PartyInputs'
import { Alert, Loading, cellInput, fmtDate, money } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import {
  apiCnStatus, creditError, nothingToCredit, reasonError, toCreditLines, toIssueRequest, useCancelCreditNote, useCreditable, useCreditNote,
  useCreditNotes, useIssueCreditNote, viewCnStatus, type CreditLineView, type CreditNoteDto,
} from '@/lib/api/platform/creditNotes'
import { partyAddress, useFleetInvoices, useParty } from '@/lib/api/platform/fleetInvoices'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { WOCreditNoteFilters } from './WOCreditNoteFilters'

type Row = { id: string; creditNoteNo: string; date: string; customerName: string; invoiceNo: string; total: number; status: 'ACTIVE' | 'CANCELLED' }
const col = createColumnHelper<Row>()

function WOCreditNoteList({ data }: { data: Row[] }) {
  const router = useRouter()
  const { t } = useT()
  const open = (r: Row) => router.push(`/invoice/credit-notes/wo/${r.id}`)
  const columns = [
    col.display({
      id: 'noDate', header: 'Credit Note No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => open(r)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{r.creditNoteNo}</button>
            <span className="text-xs text-gray-400">{fmtDate(r.date)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'customer', header: () => t('common.customer'),
      cell: (info) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-900 font-medium">{info.row.original.customerName || '—'}</span>
          <span className="text-xs text-gray-400 font-mono">{info.row.original.invoiceNo}</span>
        </div>
      ),
    }),
    col.display({ id: 'amount', header: () => t('common.amount'), cell: (info) => <span className="text-sm font-medium text-gray-900">{money(info.row.original.total)}</span> }),
    col.display({
      id: 'status', header: () => t('common.status'), size: 120,
      cell: (info) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={info.row.original.status} />
          <button type="button" onClick={() => open(info.row.original)} className="text-xs text-blue-600 hover:underline text-left">{t('common.edit')}</button>
        </div>
      ),
    }),
  ]
  return <DataTable data={data} columns={columns} pageSize={15} />
}

export function WOCreditNotesListView(p: { creditNoteNo: string; customerName: string; status: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const list = useCreditNotes({
    creditNoteNo: p.creditNoteNo || undefined, payerPartyCode: p.customerName.trim().toUpperCase() || undefined, status: apiCnStatus(p.status),
    from: p.dateFrom || undefined, to: p.dateTo || undefined,
  })
  const rows: Row[] = (list.data ?? []).map((c) => ({
    id: c.creditNoteId, creditNoteNo: c.creditNoteNo, date: c.issuedAt, customerName: c.payerName ?? c.payerPartyCode ?? '', invoiceNo: c.invoiceNo,
    total: Number(c.totalAmount), status: viewCnStatus(c.status),
  }))
  return (
    <ListPage
      title={t('nav.creditNotesWO')}
      subtitle={`${rows.length} credit note${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('revenue.invoice.issue') && (
        <Link href="/invoice/credit-notes/wo/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          + {t('nav.creditNotesWO')}
        </Link>
      )}
      filters={<WOCreditNoteFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <WOCreditNoteList data={rows} />}
    </ListPage>
  )
}

// ── form ────────────────────────────────────────────────────────────────────
function Field({ label, error, children, full }: { label: string; error?: string | null; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 ${full ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
const ic = (ro?: boolean, err?: boolean) =>
  `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${err ? 'border-red-400' : ''} ${ro ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'}`

function Summary({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map(([l, v]) => (
        <div key={l} className="flex flex-col gap-0.5"><span className="text-xs text-gray-500">{l}</span><span className="text-sm font-semibold text-gray-900">{v}</span></div>
      ))}
    </div>
  )
}

/** Lines grid: the screen's columns; for a new note one input column "Credit amount" (≤ remaining, 0 = skip). */
function LinesGrid({ lines, onCredit, readOnly }: {
  lines: { key: string; woNo: string; transactionNo?: string; code: string; description: string; amount: number; remaining?: number; credit?: string }[]
  onCredit?: (key: string, v: string) => void
  readOnly: boolean
}) {
  const { t } = useT()
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr className="text-left">
            <th className="px-3 py-2">WO No</th><th className="px-3 py-2">Transaction No</th><th className="px-3 py-2">Reg No</th><th className="px-3 py-2">Service Type</th>
            <th className="px-3 py-2">GL Code</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Description</th>
            <th className="px-3 py-2 text-right">{readOnly ? t('common.amount') : t('woCn.remaining')}</th>
            {!readOnly && <th className="px-3 py-2 text-right w-36">{t('woCn.creditAmount')}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {lines.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-400">{t('vinv.noLines')}</td></tr>}
          {lines.map((l) => {
            const err = !readOnly && l.remaining !== undefined ? creditError({ credit: l.credit ?? '', remaining: l.remaining }) : null
            return (
              <tr key={l.key} className="align-top">
                <td className="px-3 py-2 font-mono">{l.woNo || '—'}</td>
                <td className="px-3 py-2 font-mono">{l.transactionNo || '—'}</td>
                <td className="px-3 py-2">—</td><td className="px-3 py-2">—</td><td className="px-3 py-2">—</td>
                <td className="px-3 py-2 font-mono">{l.code || '—'}</td>
                <td className="px-3 py-2">{l.description || '—'}</td>
                <td className="px-3 py-2 text-right font-mono">{money(readOnly ? l.amount : l.remaining)}{!readOnly && <div className="text-[10px] text-gray-400">{t('woCn.of')} {money(l.amount)}</div>}</td>
                {!readOnly && (
                  <td className="px-3 py-2">
                    <input value={l.credit ?? ''} onChange={(e) => onCredit?.(l.key, e.target.value)} inputMode="decimal" className={`${cellInput} text-right ${err ? 'border-red-400' : ''}`} />
                    {err && <p className="text-[10px] text-red-600 mt-0.5">{t(err)}</p>}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function NewCreditNote() {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const { canAnywhere } = useFleetAccess()
  const issue = useIssueCreditNote()
  const [customer, setCustomer] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<CreditLineView[] | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const code = customer.trim().toUpperCase()
  const invoices = useFleetInvoices({ payerPartyCode: code || undefined })
  const issued = (invoices.data ?? []).filter((i) => i.status === 'ISSUED')
  const party = useParty(code || null)
  const creditable = useCreditable(invoiceId || null)
  const rows = lines ?? (creditable.data ? toCreditLines(creditable.data) : [])
  const vat = rows[0]?.taxRate
  const net = rows.reduce((s, l) => s + Number(l.credit || 0), 0)
  const rErr = reasonError(reason)
  const lineErr = rows.some((l) => creditError(l))
  const canIssue = canAnywhere('revenue.invoice.issue')

  const save = () => {
    setTried(true)
    setBanner(null)
    if (!invoiceId || rErr || lineErr) return
    if (nothingToCredit(rows)) { setBanner(t('woCn.rule.nothing')); return }
    issue.mutate(toIssueRequest(invoiceId, rows, reason, date), {
      onSuccess: (cn) => { toast.success(t('woCn.issued'), cn.creditNoteNo); router.push(`/invoice/credit-notes/wo/${cn.creditNoteId}`) },
      // 409 lists each line that is over what is open (in the problem detail).
      onError: (e) => setBanner(errorText(e, t)),
    })
  }

  const header = (
    <div className="space-y-6">
      {banner && <Alert>{banner}</Alert>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={t('form.documentNo')}><input value="" disabled className={ic(true)} placeholder={t('woCn.numberedOnIssue')} /></Field>
        <Field label={t('form.date')}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={ic()} /></Field>
        <Field label={t('form.customer')}><input value={party.data?.nameEn ?? ''} disabled className={ic(true)} /></Field>
        <Field label="Customer Code *" error={tried && !code ? t('woCn.rule.customer') : null}>
          <PartyCodeInput id="wocn-new-customers" role="CUSTOMER" value={customer} onChange={(v) => { setCustomer(v); setInvoiceId(''); setLines(null) }} className={ic()} placeholder="Customer code" />
        </Field>
        <Field label={`${t('woCn.invoice')} *`} error={tried && !invoiceId ? t('woCn.rule.invoice') : null}>
          <select value={invoiceId} onChange={(e) => { setInvoiceId(e.target.value); setLines(null) }} disabled={!code} className={ic(!code)}>
            <option value="">—</option>
            {issued.map((i) => <option key={i.invoiceId} value={i.invoiceId}>{i.invoiceNo} · {fmtDate(i.issuedAt)} · {money(i.totalAmount)}</option>)}
          </select>
        </Field>
        <Field label="Credit Term"><input value="" disabled className={ic(true)} /></Field>
        <Field label="Discount Type"><input value="—" disabled className={ic(true)} /></Field>
        <Field label="Tax Type"><input value={vat ? 'VAT' : '—'} disabled className={ic(true)} /></Field>
        <Field label="VAT (%)"><input value={vat ?? ''} disabled className={ic(true)} /></Field>
        <Field label={t('form.address')} full><textarea value={partyAddress(party.data)} disabled rows={2} className={`${ic(true)} resize-none`} /></Field>
        <Field label={`${t('woCn.reason')} *`} error={tried && rErr ? t(rErr) : null} full>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} className={`${ic(false, tried && !!rErr)} resize-none`} placeholder={t('woCn.reasonHint')} />
        </Field>
      </div>
      <Summary items={[[t('woCn.creditNet'), money(net)], [t('woCn.vatOnIssue'), t('woCn.calculatedOnIssue')]]} />
    </div>
  )
  const linesTab = !invoiceId ? <p className="text-sm text-gray-400">{t('woCn.pickInvoice')}</p>
    : creditable.isLoading ? <Loading /> : creditable.error ? <Alert>{errorText(creditable.error, t)}</Alert> : (
      <LinesGrid readOnly={false}
        lines={rows.map((l) => ({ key: l.invoiceLineId, woNo: l.woNo, code: l.code, description: l.description, amount: l.amount, remaining: l.remaining, credit: l.credit }))}
        onCredit={(k, v) => setLines(rows.map((l) => (l.invoiceLineId === k ? { ...l, credit: v } : l)))} />
    )

  return (
    <FormLayout
      title={`${t('common.new')} ${t('nav.creditNotesWO')}`}
      subtitle={t('woCn.newHint')}
      tabs={[{ id: 'header', label: t('form.header'), content: header }, { id: 'lines', label: `${t('form.lineItems')} (${rows.length})`, content: linesTab }]}
      isNew
      actions={
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={() => router.back()}>{t('common.cancel')}</ToolbarButton>
          {canIssue && <ToolbarButton tone="primary" disabled={issue.isPending} onClick={save}>{issue.isPending ? t('common.loading') : t('woCn.issue')}</ToolbarButton>}
        </div>
      }
    />
  )
}

function ExistingCreditNote({ cn }: { cn: CreditNoteDto }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const { canAt } = useFleetAccess()
  const party = useParty(cn.payerPartyCode)
  const cancel = useCancelCreditNote()
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canCancel = cn.status === 'ISSUED' && canAt('revenue.invoice.issue', cn.branchId)
  const vat = cn.lines[0]?.taxRate

  const header = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={t('form.documentNo')}><input value={cn.creditNoteNo} disabled className={ic(true)} /></Field>
        <Field label={t('form.date')}><input value={fmtDate(cn.issuedAt)} disabled className={ic(true)} /></Field>
        <Field label={t('form.customer')}><input value={cn.payerName ?? ''} disabled className={ic(true)} /></Field>
        <Field label="Customer Code"><input value={cn.payerPartyCode ?? ''} disabled className={ic(true)} /></Field>
        <Field label={t('woCn.invoice')}>
          <Link href={`/invoice/work-order/${cn.invoiceId}`} className={`${ic(true)} text-blue-600 hover:underline font-mono`}>{cn.invoiceNo}</Link>
        </Field>
        <Field label={t('common.status')}><div className="pt-1.5"><StatusBadge status={viewCnStatus(cn.status)} /></div></Field>
        <Field label="Tax Type"><input value={vat ? 'VAT' : '—'} disabled className={ic(true)} /></Field>
        <Field label="VAT (%)"><input value={vat ?? ''} disabled className={ic(true)} /></Field>
        <Field label={t('form.address')}><textarea value={partyAddress(party.data)} disabled rows={2} className={`${ic(true)} resize-none`} /></Field>
        <Field label={t('woCn.reason')} full><textarea value={cn.reason} disabled rows={2} className={`${ic(true)} resize-none`} /></Field>
        {cn.cancelReason && <Field label={t('fuel.cancelReason')} full><input value={`${cn.cancelReason} · ${fmtDate(cn.cancelledAt)}`} disabled className={ic(true)} /></Field>}
      </div>
      <Summary items={[['Total Amount', money(cn.subtotalAmount)], ['VAT Amount', money(cn.taxAmount)], ['Nett Amount', money(cn.totalAmount)]]} />
    </div>
  )
  return (
    <>
      <FormLayout
        title={cn.creditNoteNo}
        subtitle={`${cn.payerName ?? cn.payerPartyCode ?? ''} · ${cn.invoiceNo}`}
        tabs={[
          { id: 'header', label: t('form.header'), content: header },
          {
            id: 'lines', label: `${t('form.lineItems')} (${cn.lines.length})`,
            content: <LinesGrid readOnly lines={cn.lines.map((l) => ({ key: l.creditNoteLineId, woNo: l.orderNo ?? '', transactionNo: l.containerNo ?? undefined, code: l.chargeCode ?? '', description: l.chargeName ?? '', amount: Number(l.amount) }))} />,
          },
        ]}
        isNew={false}
        actions={
          <div className="flex items-center gap-2">
            {canCancel && <ToolbarButton tone="danger" onClick={() => { setError(null); setCancelling(true) }}>{t('woCn.cancel')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
          </div>
        }
      />
      {cancelling && (
        <ReasonDialog title={`${t('woCn.cancel')} · ${cn.creditNoteNo}`} confirmLabel={t('woCn.cancel')} reasonRequired danger busy={cancel.isPending} error={error}
          hint={t('woCn.cancelHint')}
          onConfirm={(reason) => cancel.mutate({ id: cn.creditNoteId, reason, rowVersion: cn.rowVersion }, {
            onSuccess: () => { toast.success(t('woCn.cancelled'), cn.creditNoteNo); setCancelling(false) }, onError: (e) => setError(errorText(e, t)),
          })}
          onClose={() => setCancelling(false)} />
      )}
    </>
  )
}

export function WOCreditNoteView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const cn = useCreditNote(isNew ? null : id)
  if (isNew) return <NewCreditNote />
  if (cn.isLoading) return <Loading />
  if (cn.error instanceof ApiError && (cn.error.status === 404 || cn.error.status === 400)) notFound()
  if (cn.error || !cn.data) return <Alert>{errorText(cn.error, t)}</Alert>
  return <ExistingCreditNote key={cn.data.rowVersion} cn={cn.data} />
}
