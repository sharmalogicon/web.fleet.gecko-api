import type { PMSchedule, PMSchedulerSearchCriteria } from '@/types/pm-scheduler'
import { getMockPMSchedules } from '@/lib/mock/pm-scheduler'

export async function getPMSchedules(criteria: PMSchedulerSearchCriteria): Promise<PMSchedule[]> {
  let results = getMockPMSchedules()
  if (criteria.search) {
    const q = criteria.search.toLowerCase()
    results = results.filter(
      (r) =>
        r.scheduleNo?.toLowerCase().includes(q) ||
        r.serviceTypeDescription?.toLowerCase().includes(q),
    )
  }
  return results
}

export async function getPMSchedule(id: number): Promise<PMSchedule | null> {
  return getMockPMSchedules().find((r) => r.pmID === id) ?? null
}
