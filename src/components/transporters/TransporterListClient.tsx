'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createColumnHelper } from '@tanstack/react-table'
import type { Transporter } from '@/types/transporter'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockTransporter } from '@/lib/mock/transporters'

const col = createColumnHelper<Transporter>()

interface TransporterListClientProps {
  initialData: Transporter[]
}

export function TransporterListClient({ initialData }: TransporterListClientProps) {
  const [data, setData] = useState<Transporter[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<Transporter | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()

  const columns = [
    col.display({
      id: 'transporter',
      header: 'Transporter',
      cell: (info) => {
        const t = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <Link
              href={`/master/transporters/${t.transporterID}`}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              {t.transporterName}
            </Link>
            <span className="text-xs text-gray-400 font-mono">{t.registrationNo}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'contact',
      header: 'Contact',
      cell: (info) => {
        const t = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{t.mobileNo || '—'}</span>
            <span className="text-xs text-gray-400">{t.emailID || '—'}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: 'Status',
      size: 100,
      cell: (info) => {
        const { isActive } = info.row.original
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 100,
      cell: (info) => {
        const t = info.row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/master/transporters/${t.transporterID}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(t)}
              className="text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        )
      },
    }),
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    const name = deleteTarget.transporterName
    try {
      removeMockTransporter(deleteTarget.transporterID)
      setData((prev) => prev.filter((r) => r.transporterID !== deleteTarget.transporterID))
      success('Transporter deleted', `${name} has been removed.`)
    } catch {
      error('Delete failed', 'An error occurred. Please try again.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <DataTable data={data} columns={columns} pageSize={15} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Transporter"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.transporterName}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </>
  )
}
