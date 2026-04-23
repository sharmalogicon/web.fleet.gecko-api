import { Suspense } from 'react'
import Link from 'next/link'
import { getInsuranceClaims } from '@/lib/data/insurance-claims'
import { InsuranceClaimListClient } from '@/components/insurance-claims/InsuranceClaimListClient'
import { InsuranceClaimFilters } from '@/components/insurance-claims/InsuranceClaimFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Insurance Claims | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    accidentRefNo?: string
    vendorName?: string
    status?: string
  }>
}

export default async function InsuranceClaimsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()

  const isCancel =
    params.status === 'cancelled' ? true : params.status === 'active' ? false : 'all'

  const claims = await getInsuranceClaims({
    documentNo: params.documentNo,
    accidentRefNo: params.accidentRefNo,
    vendorName: params.vendorName,
    isCancel,
  })

  return (
    <ListPage
      title={t('nav.insuranceClaims')}
      subtitle={`${claims.length} record${claims.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/insurance-claims/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.insuranceClaims')}
        </Link>
      }
      filters={
        <InsuranceClaimFilters
          documentNo={params.documentNo ?? ''}
          accidentRefNo={params.accidentRefNo ?? ''}
          vendorName={params.vendorName ?? ''}
          status={params.status ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <InsuranceClaimListClient initialData={claims} />
      </Suspense>
    </ListPage>
  )
}
