'use client'

import { useState } from 'react'
import { toReportQuery, useReportCatalogue, useReportRun, visibleFields, type ReportFilterValues, type ReportKind } from '@/lib/api/fleet/reports'
import type { ReportGroup } from './ReportSidebar'

/**
 * The state of a report screen: the selected report, its catalogue entry (title, params → visible fields),
 * the last Generate (filters frozen at that moment) and the run.
 */
export function useReportScreen(groups: ReportGroup[], kind: ReportKind = 'reports') {
  const catalogue = useReportCatalogue()
  const [selected, setSelected] = useState<string | null>(null)
  const [run, setRun] = useState<{ seq: number; q: Record<string, string | undefined> } | null>(null)
  const entry = catalogue.data?.find((r) => r.code === selected)
  const result = useReportRun(kind, selected, run)

  const fallbackLabel = groups.flatMap((g) => g.reports).find((r) => r.id === selected)?.label ?? null
  // Sidebar labels from the catalogue when it has the report (same ids).
  const titledGroups: ReportGroup[] = groups.map((g) => ({
    ...g,
    reports: g.reports.map((r) => ({ ...r, label: catalogue.data?.find((c) => c.code === r.id)?.title ?? r.label })),
  }))

  return {
    groups: titledGroups,
    selected,
    label: entry?.title ?? fallbackLabel,
    fields: entry ? visibleFields(entry.params) : undefined,
    select: (id: string) => { setSelected(id); setRun(null) },
    generate: (values: ReportFilterValues) => {
      if (!selected) return
      setRun((r) => ({ seq: (r?.seq ?? 0) + 1, q: toReportQuery(values, entry?.params) }))
    },
    clear: () => setRun(null),
    query: run?.q ?? null,
    result,
    catalogueError: catalogue.error,
  }
}
