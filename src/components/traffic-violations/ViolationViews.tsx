'use client'

import { useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ListPage } from '@/components/shared/ListPage'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { Alert, Loading, fmtDate, money } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import {
  NEW_VIOLATION_FORM, payrollCsv, toFormValues, toRow, useExportPayrollDeductions, usePayrollDeductions, useTrafficViolation,
  useTrafficViolations, type PayrollDeductionDto,
} from '@/lib/api/fleet/trafficViolations'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { ViolationFilters } from './ViolationFilters'
import { ViolationListClient } from './ViolationListClient'
import { ViolationFormClient } from './ViolationFormClient'

interface ListProps {
  ticketNo: string
  equipmentCode: string
  violationType: string
  status: string
  dateFrom: string
  dateTo: string
}

export function ViolationsListView(p: ListProps) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const [payroll, setPayroll] = useState(false)
  const list = useTrafficViolations({
    search: p.ticketNo || p.equipmentCode || undefined, violationType: p.violationType || undefined, status: p.status || undefined,
    from: p.dateFrom || undefined, to: p.dateTo || undefined,
  })
  const rows = (list.data ?? []).map(toRow)
  const manage = canAnywhere('fleet.incident.manage')
  return (
    <ListPage
      title={t('nav.trafficViolations')}
      subtitle={`${rows.length} record${rows.length !== 1 ? 's' : ''} found`}
      actions={
        <div className="flex items-center gap-2">
          {manage && (
            <button type="button" onClick={() => setPayroll(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
              {t('violation.payroll.button')}
            </button>
          )}
          {manage && (
            <Link href="/fleet/traffic-violations/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              + {t('nav.trafficViolations')}
            </Link>
          )}
        </div>
      }
      filters={<ViolationFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <ViolationListClient data={rows} />}
      {payroll && <PayrollDeductionsDialog onClose={() => setPayroll(false)} />}
    </ListPage>
  )
}

function download(rows: PayrollDeductionDto[]) {
  const blob = new Blob(['﻿' + payrollCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payroll-deductions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Payroll hand-off (prompt 14 §E): deductions not yet exported → Mark exported → CSV of the returned rows. */
function PayrollDeductionsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const toast = useToastStore()
  const pending = usePayrollDeductions(true)
  const exp = useExportPayrollDeductions()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [exported, setExported] = useState<PayrollDeductionDto[] | null>(null)
  const rows = exported ?? pending.data ?? []
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const markExported = () =>
    exp.mutate(picked.size ? [...picked] : null, {
      onSuccess: (r) => { setExported(r); toast.success(t('violation.payroll.exported'), `${r.length}`); download(r) },
      onError: (e) => toast.error(t('common.saveFailed'), errorText(e, t)),
    })

  return (
    <Panel
      open
      variant="modal"
      title={exported ? t('violation.payroll.doneTitle') : t('violation.payroll.title')}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('common.close')}</Button>
          {exported ? (
            <Button variant="primary" onClick={() => download(exported)}>{t('violation.payroll.csv')}</Button>
          ) : (
            <Button variant="primary" busy={exp.isPending} disabled={!rows.length} onClick={markExported}>
              {picked.size ? `${t('violation.payroll.mark')} (${picked.size})` : t('violation.payroll.markAll')}
            </Button>
          )}
        </>
      )}
    >
      <p className="text-sm text-gray-600">{exported ? t('violation.payroll.doneHint') : t('violation.payroll.hint')}</p>
      {pending.isLoading ? <Loading /> : pending.error ? <Alert>{errorText(pending.error, t)}</Alert> : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">{t('violation.payroll.none')}</p>
      ) : (
        <div className="overflow-x-auto max-h-[50vh]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                {!exported && <th className="py-1 pr-2" />}
                <th className="py-1 pr-3">Ticket</th><th className="py-1 pr-3">Driver</th><th className="py-1 pr-3">Asset</th>
                <th className="py-1 pr-3">Deducted</th><th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.trafficViolationId} className="border-t border-gray-100">
                  {!exported && (
                    <td className="py-1 pr-2"><input type="checkbox" checked={picked.has(r.trafficViolationId)} onChange={() => toggle(r.trafficViolationId)} /></td>
                  )}
                  <td className="py-1 pr-3 font-mono">{r.ticketNo}<div className="text-gray-400">{r.documentNo}</div></td>
                  <td className="py-1 pr-3">{r.driverName ?? '—'}<div className="text-gray-400">{r.driverCode}</div></td>
                  <td className="py-1 pr-3">{r.assetCode}</td>
                  <td className="py-1 pr-3">{fmtDate(r.deductedAt)}</td>
                  <td className="py-1 text-right">{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

export function ViolationView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const v = useTrafficViolation(isNew ? null : id)
  if (isNew) return <ViolationFormClient record={NEW_VIOLATION_FORM} isNew />
  if (v.isLoading) return <Loading />
  if (v.error instanceof ApiError && (v.error.status === 404 || v.error.status === 400)) notFound()
  if (v.error || !v.data) return <Alert>{errorText(v.error, t)}</Alert>
  return <ViolationFormClient key={v.data.rowVersion} record={toFormValues(v.data)} current={v.data} isNew={false} />
}
