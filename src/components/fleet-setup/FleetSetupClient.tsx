'use client'

import { useState, type ReactNode } from 'react'
import { FileSpreadsheet, Hash, Link2, PlugZap, ShieldCheck, SlidersHorizontal, Wrench } from 'lucide-react'
import { useT } from '@/i18n/I18nContext'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { NumberSeriesTab } from './NumberSeriesTab'
import { SettingsTab } from './SettingsTab'
import { ApprovalsTab } from './ApprovalsTab'
import { LaborRatesTab } from './LaborRatesTab'
import { ErpConnectionTab, ErpMappingsTab } from './ErpTabs'
import { OpeningBalancesTab, useOpeningBalancesVisible } from './OpeningBalancesTab'
import { Loading } from './ui'

type Tab = 'series' | 'settings' | 'approvals' | 'labor' | 'erp' | 'erpMaps' | 'opening'

/**
 * Fleet Setup (prompt 02). Writes need fleet.setup.manage TENANT-WIDE (the API refuses a
 * branch-scoped grant: setup rows apply to every branch). Without it only Settings shows, read-only.
 */
export function FleetSetupClient() {
  const { t } = useT()
  const { canTenantWide, isLoading } = useFleetAccess()
  const canManage = canTenantWide('fleet.setup.manage')
  const [picked, setPicked] = useState<Tab>('series')
  const showOpening = useOpeningBalancesVisible()

  const opening = { id: 'opening' as Tab, label: t('opening.tab'), icon: <FileSpreadsheet size={15} /> }
  const baseTabs: { id: Tab; label: string; icon: ReactNode }[] = canManage
    ? [
        { id: 'series', label: t('fleetSetup.numberSeries'), icon: <Hash size={15} /> },
        { id: 'settings', label: t('fleetSetup.settings'), icon: <SlidersHorizontal size={15} /> },
        { id: 'approvals', label: t('fleetSetup.approvals'), icon: <ShieldCheck size={15} /> },
        { id: 'labor', label: t('fleetSetup.labor'), icon: <Wrench size={15} /> },
        { id: 'erp', label: t('erp.connection'), icon: <PlugZap size={15} /> },
        { id: 'erpMaps', label: t('erp.mappings'), icon: <Link2 size={15} /> },
      ]
    : [{ id: 'settings', label: t('fleetSetup.settings'), icon: <SlidersHorizontal size={15} /> }]
  // Opening balances (prompt 18): its cards have their own permissions, so it can show without setup rights.
  const tabs = showOpening ? [...baseTabs, opening] : baseTabs
  const tab = tabs.some((x) => x.id === picked) ? picked : tabs[0].id

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('fleetSetup.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{canManage ? t('fleetSetup.subtitle') : t('fleetSetup.subtitleReadOnly')}</p>
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <div role="tablist" className="flex gap-1 border-b border-gray-200">
            {tabs.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={tab === x.id}
                onClick={() => setPicked(x.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === x.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {x.icon} {x.label}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {tab === 'series' && <NumberSeriesTab />}
            {tab === 'settings' && <SettingsTab canManage={canManage} />}
            {tab === 'approvals' && <ApprovalsTab />}
            {tab === 'labor' && <LaborRatesTab />}
            {tab === 'erp' && <ErpConnectionTab />}
            {tab === 'erpMaps' && <ErpMappingsTab />}
            {tab === 'opening' && <OpeningBalancesTab />}
          </div>
        </>
      )}
    </div>
  )
}
