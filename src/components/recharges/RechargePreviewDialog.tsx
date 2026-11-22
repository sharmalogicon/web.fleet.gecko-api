'use client'

import { useEffect, useState } from 'react'
import { Panel } from '@/components/fleet-setup/ui'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { Alert, Loading, money, num } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { describeRef, modeClass, useRechargeMutations, type RechargeLineDto, type RechargePreviewGroup } from '@/lib/api/fleet/recharges'

export function RefCell({ value }: { value: string | null }) {
  const { t } = useT()
  const r = describeRef(value)
  return <span title={value ?? ''} className="text-xs text-gray-600">{t(r.key)}{r.detail ? ` ${r.detail}` : ''}</span>
}

export function RechargeLinesTable({ lines }: { lines: RechargeLineDto[] }) {
  const { t } = useT()
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-gray-500"><tr className="text-left border-b"><th className="py-1.5">{t('common.type')}</th><th>Charge</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">{t('tariff.unitPrice')}</th><th className="text-right">{t('common.amount')}</th><th className="pl-3">{t('tariff.ref')}</th></tr></thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={`${l.lineId}-${i}`} className="border-b last:border-0">
            <td className="py-1.5 text-xs">{l.lineType}</td><td className="font-mono text-xs">{l.chargeCode}</td><td>{l.description}</td>
            <td className="text-right tabular-nums">{num(l.qty)}</td><td className="text-right tabular-nums">{money(l.unitPrice)}</td>
            <td className="text-right tabular-nums">{money(l.amount)}{num(l.discountAmount) > 0 && <span className="block text-[10px] text-gray-400">−{money(l.discountAmount)}</span>}</td>
            <td className="pl-3"><RefCell value={l.rateCardRef} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Preview charges (nothing saved) and Release (prompt 12 §B): one group per bill-to × mode. Used on the WO form and
 * the Recharges page "To release" tab.
 */
export function RechargePreviewDialog({ workOrderId, workOrderNo, onClose }: { workOrderId: string; workOrderNo: string; onClose: () => void }) {
  const { t } = useT()
  const toast = useToastStore()
  const { preview, release } = useRechargeMutations()
  const [groups, setGroups] = useState<RechargePreviewGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    preview.mutate(workOrderId, { onSuccess: setGroups, onError: (e) => setError(errorText(e, t)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId])
  const doRelease = () => {
    setError(null)
    release.mutate(workOrderId, {
      onSuccess: (made) => { toast.success(t('recharge.released'), made.map((r) => r.rechargeNo).join(', ')); onClose() },
      onError: (e) => setError(errorText(e, t)),
    })
  }
  return (
    <Panel
      open
      variant="modal"
      title={`${t('recharge.preview')} · ${workOrderNo}`}
      onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <ToolbarButton onClick={onClose}>{t('common.close')}</ToolbarButton>
          <ToolbarButton tone="success" disabled={!groups?.length || release.isPending} onClick={doRelease}>{release.isPending ? t('common.loading') : t('recharge.release')}</ToolbarButton>
        </div>
      )}
    >
      <div className="flex flex-col gap-4 min-w-[min(56rem,90vw)]">
        {error && <Alert>{error}</Alert>}
        {preview.isPending ? <Loading /> : groups && !groups.length ? <p className="text-sm text-gray-500">{t('recharge.nothing')}</p> : groups?.map((g, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{g.billToName ?? g.billToPartyCode}</span>
                <span className="text-xs font-mono text-gray-500">{g.billToPartyCode}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${modeClass(g.rechargeMode)}`}>{g.rechargeMode}</span>
                {g.rateCardCode && <span className="text-xs text-gray-500">{t('tariff.cardUsed')}: <span className="font-mono">{g.rateCardCode}</span></span>}
              </div>
              <span className="text-sm font-semibold">{money(g.netAmount)}</span>
            </div>
            <RechargeLinesTable lines={g.lines} />
          </div>
        ))}
      </div>
    </Panel>
  )
}
