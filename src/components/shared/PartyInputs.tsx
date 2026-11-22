'use client'

import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet, query } from '@/lib/api/client'
import type { components } from '@/lib/api/platform.schema'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useSupplierLookup } from '@/lib/api/platform/suppliers'

type PartySummary = components['schemas']['PartySummaryResponse']

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

/** Platform parties (any role, or one role such as CUSTOMER), for "bill to" pickers. */
export function usePartyLookup(search: string, role?: string) {
  const tenant = useAuth().user?.tenantId
  return useQuery({
    queryKey: ['platform', 'parties', tenant, search, role],
    queryFn: async () =>
      (await apiGet<components['schemas']['PagedResultOfPartySummaryResponse']>(`/api/master/parties${query({ search: search || undefined, role, page: 1, pageSize: 50 })}`)).items,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })
}

interface InputProps {
  /** The party code (what is saved). */
  value: string
  onChange: (code: string) => void
  /** The matched party's name, for a read-only "name" field next to the code. */
  onName?: (name: string | null) => void
  className: string
  placeholder?: string
  disabled?: boolean
  id: string
}

/** A party-code text input with suggestions (code — name). Free text stays allowed; the API checks the code. */
export function PartyCodeInput({ value, onChange, onName, className, placeholder, disabled, id, role }: InputProps & { role?: string }) {
  const search = useDebounced(value.trim())
  const parties = usePartyLookup(search, role)
  const rows: PartySummary[] = parties.data ?? []
  useEffect(() => {
    onName?.(rows.find((p) => p.partyCode.toUpperCase() === value.trim().toUpperCase())?.nameEn ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, value])
  return (
    <>
      <input value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} list={id} disabled={disabled} className={className} placeholder={placeholder} autoComplete="off" />
      <datalist id={id}>
        {rows.map((p) => <option key={p.partyId} value={p.partyCode}>{p.nameEn}</option>)}
      </datalist>
    </>
  )
}

/** The same for suppliers (Platform /api/master/suppliers). */
export function SupplierCodeInput({ value, onChange, onName, className, placeholder, disabled, id, category }: InputProps & { category?: string }) {
  const search = useDebounced(value.trim())
  const suppliers = useSupplierLookup(search, category)
  const rows = suppliers.data ?? []
  useEffect(() => {
    onName?.(rows.find((p) => p.partyCode.toUpperCase() === value.trim().toUpperCase())?.nameEn ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, value])
  return (
    <>
      <input value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} list={id} disabled={disabled} className={className} placeholder={placeholder} autoComplete="off" />
      <datalist id={id}>
        {rows.map((p) => <option key={p.partyId} value={p.partyCode}>{p.nameEn}</option>)}
      </datalist>
    </>
  )
}
