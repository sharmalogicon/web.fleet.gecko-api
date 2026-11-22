'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { alignClass, downloadReport, formatCell, type ReportKind, type ReportResultDto } from '@/lib/api/fleet/reports'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useT } from '@/i18n/I18nContext'

interface ReportPreviewProps {
  kind?: ReportKind
  reportId: string | null
  reportLabel: string | null
  /** The filters of the run (for the PDF / Excel of the same run). */
  query: Record<string, string | undefined> | null
  result?: ReportResultDto
  loading?: boolean
  error?: unknown
  /** Per-row class (e.g. WIP rows open > 7 days in orange). */
  rowClass?: (row: unknown[], columns: ReportResultDto['columns']) => string | undefined
}

/** The run's columns + rows (formatted by each column's `format` / `align`), totals as the bold last row; PDF / Excel export. */
export function ReportPreview({ kind = 'reports', reportId, reportLabel, query, result, loading, error, rowClass }: ReportPreviewProps) {
  const { t } = useT()
  const toast = useToastStore()
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)

  if (!reportId || (!query && !loading)) {
    return <div className="flex items-center justify-center min-h-48 text-sm text-gray-400 italic">{t('report.selectAndGenerate')}</div>
  }
  if (loading) return <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
  if (error || !result) {
    return <div role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(error, t)}</div>
  }

  const exportAs = async (format: 'pdf' | 'xlsx') => {
    setExporting(format)
    try {
      await downloadReport(kind, reportId, query ?? {}, format)
    } catch (e) {
      toast.error(t('report.exportFailed'), errorText(e, t))
    } finally {
      setExporting(null)
    }
  }

  const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const btn = 'px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Report Preview — {result.title || reportLabel}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Generated on {now} · {Number(result.rowCount).toLocaleString()} {t('report.records')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" disabled={!!exporting} onClick={() => exportAs('pdf')} className={btn}>
            {exporting === 'pdf' && <Loader2 size={12} className="animate-spin" />}Export PDF
          </button>
          <button type="button" disabled={!!exporting} onClick={() => exportAs('xlsx')} className={btn}>
            {exporting === 'xlsx' && <Loader2 size={12} className="animate-spin" />}Export Excel
          </button>
        </div>
      </div>

      {result.truncated && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{t('report.truncated')}</p>
      )}

      <div className="rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {result.columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium text-gray-600 whitespace-nowrap ${alignClass(c.align)}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr><td colSpan={result.columns.length} className="px-3 py-6 text-center text-gray-400">{t('report.noRows')}</td></tr>
            ) : result.rows.map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${rowClass?.(row as unknown[], result.columns) ?? ''}`}>
                {result.columns.map((c, j) => (
                  <td key={c.key} className={`px-3 py-2 text-gray-700 whitespace-nowrap ${alignClass(c.align)}`}>{formatCell((row as unknown[])[j], c.format)}</td>
                ))}
              </tr>
            ))}
            {result.totals && (
              <tr className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-300">
                {result.columns.map((c, j) => (
                  <td key={c.key} className={`px-3 py-2 whitespace-nowrap ${alignClass(c.align)}`}>
                    {j === 0 && (result.totals as unknown[])[0] == null ? t('report.total') : formatCell((result.totals as unknown[])[j], c.format)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
