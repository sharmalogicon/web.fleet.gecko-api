'use client'
import { useRouter } from 'next/navigation'
import { SearchInput } from '@/components/shared/SearchInput'

interface Props {
  search: string
}

export function EquipmentTypeFilters({ search }: Props) {
  const router = useRouter()
  return (
    <SearchInput
      value={search}
      onChange={(v) => router.push(`/master/equipment-types?search=${encodeURIComponent(v)}`)}
      placeholder="Search by code or description…"
      className="w-72"
    />
  )
}
