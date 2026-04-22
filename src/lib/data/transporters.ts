import type { Transporter } from '@/types/transporter'
import { getMockTransporters } from '@/lib/mock/transporters'

export async function getTransporters(search?: string): Promise<Transporter[]> {
  let results = getMockTransporters()
  if (search) {
    const q = search.toLowerCase()
    results = results.filter(
      (r) =>
        r.transporterName.toLowerCase().includes(q) ||
        r.registrationNo.toLowerCase().includes(q),
    )
  }
  return results
}

export async function getTransporter(id: number): Promise<Transporter | null> {
  return getMockTransporters().find((r) => r.transporterID === id) ?? null
}
