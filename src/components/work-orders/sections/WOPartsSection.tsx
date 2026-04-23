import type { WOPartsLine } from '@/types/work-order'

export function WOPartsSection({ parts }: { parts?: WOPartsLine[] }) {
  if (!parts || parts.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">No parts added yet</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {['Stock Code', 'Description', 'UOM', 'Qty', 'Unit Price', 'Discount', 'Total'].map(
              (h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr key={p.partsLineID} className="border-b border-gray-100">
              <td className="px-3 py-2 font-mono text-xs text-gray-500">{p.stockCode}</td>
              <td className="px-3 py-2">{p.description}</td>
              <td className="px-3 py-2 text-gray-500">{p.uom}</td>
              <td className="px-3 py-2 text-right">{p.qty}</td>
              <td className="px-3 py-2 text-right">฿{p.unitPrice.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">
                {p.discount > 0 ? `฿${p.discount.toLocaleString()}` : '—'}
              </td>
              <td className="px-3 py-2 text-right font-medium">
                ฿{p.totalAmount.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
