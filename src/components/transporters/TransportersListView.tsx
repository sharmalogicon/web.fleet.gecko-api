'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { TransporterListClient } from '@/components/transporters/TransporterListClient'
import { useT } from '@/i18n/I18nContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useTransporters } from '@/lib/api/platform/suppliers'
import { errorText } from '@/lib/api/errorText'

export function TransportersListView({ search }: { search: string }) {
  const { t } = useT()
  const { can } = useAuth()
  const list = useTransporters(search || undefined)
  const rows = list.data ?? []

  return (
    <ListPage
      title={t('nav.transporters')}
      subtitle={`${rows.length} transporter${rows.length !== 1 ? 's' : ''} found`}
      actions={
        can('mdm.supplier.manage') && (
          <Link
            href="/master/transporters/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + {t('nav.transporters')}
          </Link>
        )
      }
    >
      {list.isLoading ? (
        <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : list.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
      ) : (
        <TransporterListClient data={rows} />
      )}
    </ListPage>
  )
}
