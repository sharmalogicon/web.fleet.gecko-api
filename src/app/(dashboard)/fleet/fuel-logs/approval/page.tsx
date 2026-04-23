import Link from 'next/link'
import { getFuelLogs } from '@/lib/data/fuel-logs'
import { FuelLogApprovalClient } from '@/components/fuel-logs/FuelLogApprovalClient'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Fuel Log Approval | Fleet' }

export default async function FuelLogApprovalPage() {
  const { t } = await getT()
  const pendingLogs = await getFuelLogs({ status: 'PENDING' })

  return (
    <ListPage
      title={t('nav.fuelApproval')}
      subtitle={`${pendingLogs.length} pending fuel log${pendingLogs.length !== 1 ? 's' : ''} awaiting approval`}
      actions={
        <Link
          href="/fleet/fuel-logs"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          ← Back to Fuel Logs
        </Link>
      }
    >
      <FuelLogApprovalClient initialData={pendingLogs} />
    </ListPage>
  )
}
