'use client'

import { cn } from '@/lib/utils/cn'

export interface ReportItem {
  id: string
  label: string
}

export interface ReportGroup {
  groupLabel: string
  reports: ReportItem[]
}

interface ReportSidebarProps {
  groups: ReportGroup[]
  selectedReport: string | null
  onSelect: (reportId: string) => void
}

export function ReportSidebar({ groups, selectedReport, onSelect }: ReportSidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 bg-white rounded-lg border border-gray-200 py-3 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.groupLabel} className="mb-3">
          <p className="text-xs uppercase text-gray-400 font-semibold px-3 py-2 tracking-wider">
            {group.groupLabel}
          </p>
          {group.reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => onSelect(report.id)}
              className={cn(
                'w-full text-left text-sm px-3 py-1.5 rounded mx-1 transition-colors',
                selectedReport === report.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50',
              )}
              style={{ width: 'calc(100% - 8px)' }}
            >
              {report.label}
            </button>
          ))}
        </div>
      ))}
    </aside>
  )
}
