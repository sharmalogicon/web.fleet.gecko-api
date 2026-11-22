'use client'

import type { ReactNode } from 'react'
import { Wrench, Calendar, ShoppingCart, Truck, AlertTriangle, Fuel } from 'lucide-react'
import { StatCard, RecentWorkOrders, QuickActions, UpcomingPM, FleetStatus } from '@/components/dashboard'
import { Alert, Loading } from '@/components/docs/DocBits'
import { daysLeft, toFleetStatus, toStatCards, useDashboard, type StatKey } from '@/lib/api/fleet/dashboard'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'
import { useT } from '@/i18n/I18nContext'

const CARD: Record<StatKey, { title: string; icon: ReactNode; color: string }> = {
  ACTIVE_WORK_ORDERS: { title: 'Active Work Orders', icon: <Wrench size={20} />, color: 'bg-primary-50 text-primary-600' },
  PENDING_PM: { title: 'Pending PM', icon: <Calendar size={20} />, color: 'bg-warning-50 text-warning-600' },
  OPEN_PURCHASE_ORDERS: { title: 'Open PO', icon: <ShoppingCart size={20} />, color: 'bg-accent-50 text-accent-600' },
  TOTAL_VEHICLES: { title: 'Total Vehicles', icon: <Truck size={20} />, color: 'bg-success-50 text-success-600' },
  OVERDUE_SERVICE: { title: 'Overdue Service', icon: <AlertTriangle size={20} />, color: 'bg-error-50 text-error-600' },
  FUEL_LITERS_MONTH: { title: 'Fuel', icon: <Fuel size={20} />, color: 'bg-info-50 text-info-600' },
}

const fmtDate = (d: string) => new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

/** The dashboard on GET /api/fleet/dashboard for the header branch (prompt 16 §A). Same layout. */
export function DashboardView() {
  const { t, lang } = useT()
  const { current } = useBranchContext()
  const dash = useDashboard(current?.branchId)
  // Only read once the dashboard is loaded (the cards render then).
  const month = new Date(dash.data?.monthStart ?? '2000-01-01')
  const monthName = month.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { month: 'short' })
  const prevName = new Date(month.getFullYear(), month.getMonth() - 1, 1).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { month: 'short' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fleet Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Overview of your fleet operations, maintenance, and vehicle status.</p>
      </div>

      {dash.isLoading ? <Loading /> : dash.error || !dash.data ? <Alert>{errorText(dash.error, t)}</Alert> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {toStatCards(dash.data).map((c) => (
              <StatCard
                key={c.key}
                title={c.key === 'FUEL_LITERS_MONTH' ? `${t(`dashboard.stat.${c.key}`)} (${monthName})` : t(`dashboard.stat.${c.key}`)}
                value={c.value}
                change={c.change}
                changeLabel={c.change === undefined ? undefined : c.key === 'FUEL_LITERS_MONTH' ? `vs ${prevName}` : t('dashboard.vsLastMonth')}
                icon={CARD[c.key].icon}
                iconColor={CARD[c.key].color}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <QuickActions />
              <RecentWorkOrders items={dash.data.recentWorkOrders} />
            </div>
            <div className="space-y-6">
              <FleetStatus
                items={toFleetStatus(dash.data)}
                labels={{
                  ACTIVE: t('dashboard.fleet.ACTIVE'), UNDER_MAINTENANCE: t('dashboard.fleet.UNDER_MAINTENANCE'),
                  IDLE: t('dashboard.fleet.IDLE'), OUT_OF_SERVICE: t('dashboard.fleet.OUT_OF_SERVICE'),
                }}
              />
              <UpcomingPM
                items={dash.data.upcomingPm.map((p) => {
                  const left = daysLeft(p.nextDueAt)
                  const kmLeft = p.nextDueKm != null && p.currentKm != null ? Number(p.nextDueKm) - Number(p.currentKm) : null
                  return {
                    key: p.pmTaskStateId,
                    equipment: p.assetCode,
                    service: p.task,
                    dueDate: p.nextDueAt ? fmtDate(p.nextDueAt) : '',
                    daysLeft: left,
                    meterText: kmLeft === null ? undefined : kmLeft < 0 ? `${Math.abs(kmLeft).toLocaleString()} km over` : `${kmLeft.toLocaleString()} km left`,
                    overdue: p.dueStatus === 'OVERDUE',
                  }
                })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
