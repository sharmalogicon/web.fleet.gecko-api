import { Suspense } from 'react'
import { getPMSchedules } from '@/lib/data/pm-scheduler'
import { PMScheduleListClient } from '@/components/pm-scheduler/PMScheduleListClient'
import { ListPage } from '@/components/shared/ListPage'
import Link from 'next/link'

export const metadata = { title: 'PM Scheduler | Fleet' }

interface PageProps {
  searchParams: Promise<{
    search?: string
    serviceType?: string
  }>
}

export default async function PMSchedulerPage({ searchParams }: PageProps) {
  const params = await searchParams
  const schedules = await getPMSchedules({
    search: params.search,
    serviceType: params.serviceType,
  })

  return (
    <ListPage
      title="PM Scheduler"
      subtitle={`${schedules.length} schedule${schedules.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/pm-scheduler/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Schedule
        </Link>
      }
    >
      <Suspense fallback={null}>
        <PMScheduleListClient initialData={schedules} />
      </Suspense>
    </ListPage>
  )
}
