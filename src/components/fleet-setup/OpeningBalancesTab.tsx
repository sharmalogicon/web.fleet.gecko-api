'use client'

import { useRef, useState } from 'react'
import { Download, RefreshCw, Upload } from 'lucide-react'
import { useFleetAccess } from '@/lib/api/fleet/access'
import {
  KIND_COLUMNS, KIND_PERMISSION, OPENING_KINDS, canImport, downloadTemplate, fileKey, useOpeningImport, useTruckingSyncAll,
  type ImportView, type OpeningKind, type TruckingSyncResult,
} from '@/lib/api/fleet/openingBalances'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { Banner, Button, Chip, Section, useFmt } from './ui'

/** Whether the user sees this tab at all (any card, or the sync button). */
export function useOpeningBalancesVisible() {
  const { canAnywhere, canTenantWide } = useFleetAccess()
  return OPENING_KINDS.some((k) => canAnywhere(KIND_PERMISSION[k])) || canTenantWide('fleet.asset.manage')
}

/** Fleet Setup → "Opening balances" (prompt 18): four cards in the runbook's order + "Sync everything from Trucking". */
export function OpeningBalancesTab() {
  const { t } = useFmt()
  const { canAnywhere, canTenantWide } = useFleetAccess()
  const kinds = OPENING_KINDS.filter((k) => canAnywhere(KIND_PERMISSION[k]))
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-600">{t('opening.intro')}</p>
      {canTenantWide('fleet.asset.manage') && <TruckingSyncCard />}
      {kinds.map((k, i) => <KindCard key={k} kind={k} step={i + 1} />)}
    </div>
  )
}

function KindCard({ kind, step }: { kind: OpeningKind; step: number }) {
  const { t } = useFmt()
  const toast = useToastStore()
  const run = useOpeningImport(kind)
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [checked, setChecked] = useState<{ key: string; view: ImportView } | null>(null)
  const [imported, setImported] = useState<ImportView | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const pick = (f: File | null) => { setFile(f); setChecked(null); setImported(null); setBanner(null) }
  const check = () => {
    if (!file) return
    setBanner(null)
    run.mutate({ file, commit: false }, {
      onSuccess: (view) => setChecked({ key: fileKey(file), view }),
      onError: (e) => setBanner(errorText(e, t)),
    })
  }
  const doImport = () => {
    if (!file || !canImport(file, checked)) return
    run.mutate({ file, commit: true }, {
      onSuccess: (view) => { setImported(view); toast.success(t('opening.imported'), `${view.committed} / ${view.rows}`) },
      onError: (e) => setBanner(errorText(e, t)),
    })
  }
  const template = async () => {
    setDownloading(true)
    try { await downloadTemplate(kind) } catch (e) { toast.error(t('opening.templateFailed'), errorText(e, t)) } finally { setDownloading(false) }
  }
  const shown = imported ?? checked?.view ?? null

  return (
    <Section
      title={`${step}. ${t(`opening.kind.${kind}`)}`}
      actions={<Button busy={downloading} onClick={template}><Download size={14} /> {t('opening.template')}</Button>}
    >
      <p className="text-xs text-gray-500 mb-3">{t('opening.columns')}: <span className="font-mono">{KIND_COLUMNS[kind]}</span>{kind === 'STOCK' ? ` · ${t('opening.stockNote')}` : ''}</p>
      <Banner text={banner} />
      <div className="flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => pick(e.target.files?.[0] ?? null)} className="text-sm" />
        <Button busy={run.isPending && !checked} disabled={!file} onClick={check}><Upload size={14} /> {t('opening.check')}</Button>
        <Button variant="primary" busy={run.isPending && !!checked} disabled={!canImport(file, checked) || !!imported} onClick={doImport}
          title={canImport(file, checked) ? undefined : t('opening.importHint')}>
          {t('opening.import')}
        </Button>
      </div>
      {shown && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 text-sm">
            <Chip tone="gray">{t('opening.rows')}: {shown.rows}</Chip>
            <Chip tone={shown.errors.length ? 'amber' : 'green'}>{t('opening.valid')}: {shown.valid}</Chip>
            {!shown.dryRun && <Chip tone="green">{t('opening.committed')}: {shown.committed}</Chip>}
            {shown.dryRun && shown.clean && <Chip tone="blue">{t('opening.readyToImport')}</Chip>}
          </div>
          {shown.errors.length > 0 && (
            <div className="overflow-x-auto max-h-72 rounded-lg border border-red-200">
              <table className="w-full text-xs">
                <thead className="bg-red-50 text-red-700"><tr><th className="py-1.5 px-3 text-left w-24">{t('opening.excelRow')}</th><th className="py-1.5 px-3 text-left">{t('opening.message')}</th></tr></thead>
                <tbody>
                  {shown.errors.map((e, i) => (
                    <tr key={`${e.row}-${i}`} className="border-t border-red-100"><td className="py-1 px-3 font-mono">{e.row}</td><td className="py-1 px-3">{e.message}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!shown.dryRun && shown.errors.length > 0 && <p className="text-xs text-amber-700">{t('opening.fixAndReupload')}</p>}
        </div>
      )}
    </Section>
  )
}

function TruckingSyncCard() {
  const { t } = useFmt()
  const toast = useToastStore()
  const sync = useTruckingSyncAll()
  const [result, setResult] = useState<TruckingSyncResult | null>(null)
  const line = (r: { created: number | string; updated: number | string; unchanged: number | string; deactivated: number | string }) =>
    `${t('opening.created')} ${r.created} · ${t('opening.updated')} ${r.updated} · ${t('opening.unchanged')} ${r.unchanged} · ${t('opening.deactivated')} ${r.deactivated}`
  return (
    <Section
      title={t('opening.syncTitle')}
      actions={(
        <Button variant="primary" busy={sync.isPending}
          onClick={() => sync.mutate(undefined, { onSuccess: (r) => { setResult(r); toast.success(t('opening.synced')) }, onError: (e) => toast.error(t('common.saveFailed'), errorText(e, t)) })}>
          <RefreshCw size={14} /> {t('opening.syncAll')}
        </Button>
      )}
    >
      <p className="text-xs text-gray-500">{t('opening.syncHint')}</p>
      {result && (
        <ul className="mt-3 text-sm text-gray-700 flex flex-col gap-1">
          <li><span className="font-medium">{t('opening.assets')}:</span> {line(result.assets)}</li>
          <li><span className="font-medium">{t('opening.drivers')}:</span> {line(result.drivers)}</li>
          <li><span className="font-medium">{t('opening.odometers')}:</span> {result.odometerReadings} · {t('opening.recalculated')} {result.assetsRecalculated}</li>
        </ul>
      )}
    </Section>
  )
}
