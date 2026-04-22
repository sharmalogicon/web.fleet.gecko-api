import type { ReactNode } from 'react'

interface ListPageProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  filters?: ReactNode
  children: ReactNode
}

export function ListPage({ title, subtitle, actions, filters, children }: ListPageProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {/* Filter bar */}
      {filters && (
        <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          {filters}
        </div>
      )}

      {/* Content (table, cards, etc.) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  )
}
