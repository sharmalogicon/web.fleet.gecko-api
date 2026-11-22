import { FuelLogApprovalView } from '@/components/fuel-logs/FuelLogViews'

export const metadata = { title: 'Fuel Log Approval | Fleet' }

/** PENDING_APPROVAL fuel logs (prompt 14 §B). */
export default function FuelLogApprovalPage() {
  return <FuelLogApprovalView />
}
