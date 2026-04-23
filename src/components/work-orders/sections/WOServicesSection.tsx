import type { WOServiceLine } from '@/types/work-order'

export function WOServicesSection({ services }: { services?: WOServiceLine[] }) {
  if (!services || services.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">No services added yet</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {['Code', 'Description', 'Parts', 'Labor', 'Discount', 'Remarks'].map((h) => (
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
          {services.map((s) => (
            <tr key={s.serviceLineID} className="border-b border-gray-100">
              <td className="px-3 py-2 font-mono text-xs text-gray-500">{s.serviceType}</td>
              <td className="px-3 py-2">{s.serviceTypeDescription}</td>
              <td className="px-3 py-2">฿{s.partsTotal.toLocaleString()}</td>
              <td className="px-3 py-2">฿{s.laborTotal.toLocaleString()}</td>
              <td className="px-3 py-2">฿{s.discountTotal.toLocaleString()}</td>
              <td className="px-3 py-2 text-gray-400">{s.remarks || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
