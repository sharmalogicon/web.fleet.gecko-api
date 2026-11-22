'use client'

import Link from 'next/link'
import { notFound, useSearchParams } from 'next/navigation'
import { ListPage } from '@/components/shared/ListPage'
import { Alert, Loading } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import { NEW_CLAIM_FORM, toFormValues, toRow, useInsuranceClaim, useInsuranceClaims } from '@/lib/api/fleet/insuranceClaims'
import { useAccident } from '@/lib/api/fleet/accidents'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { InsuranceClaimFilters } from './InsuranceClaimFilters'
import { InsuranceClaimListClient } from './InsuranceClaimListClient'
import { InsuranceClaimFormClient } from './InsuranceClaimFormClient'

interface ListProps {
  documentNo: string
  accidentRefNo: string
  vendorName: string
  status: string
}

export function InsuranceClaimsListView(p: ListProps) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  // One API `search` (document no, accident no, insurer…): the first box that is filled.
  const list = useInsuranceClaims({ search: p.documentNo || p.accidentRefNo || p.vendorName || undefined, status: p.status || undefined })
  const rows = (list.data ?? []).map(toRow)
  return (
    <ListPage
      title={t('nav.insuranceClaims')}
      subtitle={`${rows.length} claim${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.incident.manage') && (
        <Link href="/fleet/insurance-claims/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          + {t('nav.insuranceClaims')}
        </Link>
      )}
      filters={<InsuranceClaimFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <InsuranceClaimListClient data={rows} />}
    </ListPage>
  )
}

/** `new?accidentId=` starts the claim for that accident (asset / driver / policy come from it). */
function NewClaim() {
  const accidentId = useSearchParams().get('accidentId')
  const acc = useAccident(accidentId)
  if (accidentId && acc.isLoading) return <Loading />
  const record = acc.data
    ? { ...NEW_CLAIM_FORM, accidentId: acc.data.accidentId, accidentRefNo: acc.data.documentNo, policyNo: acc.data.insurancePolicyNo ?? '' }
    : NEW_CLAIM_FORM
  return <InsuranceClaimFormClient record={record} isNew />
}

export function InsuranceClaimView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const claim = useInsuranceClaim(isNew ? null : id)
  if (isNew) return <NewClaim />
  if (claim.isLoading) return <Loading />
  if (claim.error instanceof ApiError && (claim.error.status === 404 || claim.error.status === 400)) notFound()
  if (claim.error || !claim.data) return <Alert>{errorText(claim.error, t)}</Alert>
  return <InsuranceClaimFormClient key={claim.data.rowVersion} record={toFormValues(claim.data)} current={claim.data} isNew={false} />
}
