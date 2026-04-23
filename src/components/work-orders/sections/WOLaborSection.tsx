import type { WOLaborLine } from '@/types/work-order'

function formatTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function WOLaborSection({ labor }: { labor?: WOLaborLine[] }) {
  if (!labor || labor.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">No labor entries added yet</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {[
              'Charge Code',
              'Description',
              'Start',
              'End',
              'Std Hrs',
              'Actual Hrs',
              'Rate',
              'Total Charge',
            ].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labor.map((l) => (
            <tr key={l.laborLineID} className="border-b border-gray-100">
              <td className="px-3 py-2 font-mono text-xs text-gray-500">{l.chargeCode}</td>
              <td className="px-3 py-2">{l.description}</td>
              <td className="px-3 py-2 text-gray-500">{formatTime(l.startTime)}</td>
              <td className="px-3 py-2 text-gray-500">{formatTime(l.endTime)}</td>
              <td className="px-3 py-2 text-right">{l.standardHours}</td>
              <td className="px-3 py-2 text-right">{l.actualHours}</td>
              <td className="px-3 py-2 text-right">฿{l.rate.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-medium">
                ฿{l.totalCharge.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
