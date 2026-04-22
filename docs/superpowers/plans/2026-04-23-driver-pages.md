# Driver Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Driver list (`/master/drivers`) and Driver profile (`/master/drivers/[id]`) pages on top of six new shared components, using mock data that swaps to real API endpoints with a one-line change.

**Architecture:** Server Components fetch and filter mock data, passing it down to Client Components that own all interactivity. Shared components (`DataTable`, `FormLayout`, `ListPage`, `StatusBadge`, `ConfirmDialog`, `SearchInput`) are built first so every subsequent Phase 2 page (Equipment, Stock, etc.) reuses them. Form state is managed by `react-hook-form` + `zod`; table state by `@tanstack/react-table`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 (@theme tokens), Zustand, react-hook-form, zod, @hookform/resolvers, @tanstack/react-table, date-fns, class-variance-authority, Vitest + jsdom (unit tests)

**Spec:** `docs/superpowers/specs/2026-04-23-driver-pages-design.md`

---

## File Manifest

| File | Action | Responsibility |
|---|---|---|
| `src/types/driver.ts` | Create | Zod schema, inferred types, status map |
| `src/lib/mock/drivers.ts` | Create | 12 mock Driver records |
| `src/lib/data/drivers.ts` | Create | Server-side async getDrivers / getDriver |
| `src/lib/hooks/useDriver.ts` | Create | Client hook: save / delete against mock store |
| `src/lib/stores/useToastStore.ts` | Create | Zustand toast queue |
| `src/lib/utils/driver.ts` | Create | calcAge utility |
| `src/components/shared/Toast.tsx` | Create | Fixed-position toast renderer |
| `src/components/shared/SearchInput.tsx` | Create | Debounced text input |
| `src/components/shared/StatusBadge.tsx` | Create | CVA status pill |
| `src/components/shared/ConfirmDialog.tsx` | Create | Native `<dialog>` confirmation modal |
| `src/components/shared/DataTable.tsx` | Create | TanStack Table wrapper |
| `src/components/shared/ListPage.tsx` | Create | Page layout: header + filters + content |
| `src/components/shared/FormLayout.tsx` | Create | Sticky header + tabs + sticky save bar |
| `src/components/drivers/DriverFilters.tsx` | Create | Name / Status / Branch filter bar |
| `src/components/drivers/DriversListClient.tsx` | Create | Client wrapper for list page |
| `src/components/drivers/DriverProfileClient.tsx` | Create | Client wrapper for profile form |
| `src/components/drivers/sections/GeneralSection.tsx` | Create | General + Address tab panel |
| `src/components/drivers/sections/LicenseSection.tsx` | Create | License tab panel |
| `src/components/drivers/sections/EmergencyContactSection.tsx` | Create | Emergency contact tab panel |
| `src/app/(dashboard)/master/drivers/page.tsx` | Create | Server Component: list page |
| `src/app/(dashboard)/master/drivers/loading.tsx` | Create | List skeleton |
| `src/app/(dashboard)/master/drivers/error.tsx` | Create | List error UI |
| `src/app/(dashboard)/master/drivers/[id]/page.tsx` | Create | Server Component: profile page |
| `src/app/(dashboard)/master/drivers/[id]/loading.tsx` | Create | Profile skeleton |
| `src/app/(dashboard)/master/drivers/[id]/error.tsx` | Create | Profile error UI |
| `src/components/providers.tsx` | Modify | Add `<ToastContainer />` |
| `TODO.md` | Modify | Mark Driver list + profile ✅ |
| `vitest.config.ts` | Create | Vitest config |
| `src/test/setup.ts` | Create | jsdom setup |
| `src/types/driver.test.ts` | Create | Schema validation tests |
| `src/lib/data/drivers.test.ts` | Create | Data layer filter tests |

---

## Task 1: Install Dependencies

**Files:** `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
cd "d:/SHARMA/PROJECT/gecko/web.fleet.gecko-api"
npm install react-hook-form zod @hookform/resolvers @tanstack/react-table
```

Expected: 4 packages added, no peer dependency errors.

- [ ] **Step 2: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom jsdom
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-hook-form, zod, tanstack-table, vitest"
```

---

## Task 2: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (add test script)

- [ ] **Step 1: Create vitest config**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 2: Create test setup file**

`src/test/setup.ts`:
```ts
import '@testing-library/dom'
```

- [ ] **Step 3: Add test script to package.json**

In `package.json` scripts, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify setup runs**

```bash
npx vitest run --reporter=verbose
```

Expected: "No test files found" (not an error — just no tests yet).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json
git commit -m "chore: configure vitest with jsdom"
```

---

## Task 3: Driver Types + Zod Schema

**Files:**
- Create: `src/types/driver.ts`
- Create: `src/types/driver.test.ts`

- [ ] **Step 1: Write failing tests**

`src/types/driver.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { driverSchema, DRIVER_STATUS_MAP } from './driver'

describe('driverSchema', () => {
  it('rejects missing driverCode', () => {
    const result = driverSchema.safeParse({ driverName: 'Test', status: 'ACTIVE' })
    expect(result.success).toBe(false)
  })

  it('rejects missing driverName', () => {
    const result = driverSchema.safeParse({ driverCode: 'D001', status: 'ACTIVE' })
    expect(result.success).toBe(false)
  })

  it('accepts valid minimal record', () => {
    const result = driverSchema.safeParse({
      driverCode: 'D001',
      driverName: 'John Doe',
      status: 'ACTIVE',
    })
    expect(result.success).toBe(true)
  })

  it('rejects dateRelease before dateHire', () => {
    const result = driverSchema.safeParse({
      driverCode: 'D001',
      driverName: 'John',
      status: 'ACTIVE',
      dateHire: '2023-01-15',
      dateRelease: '2022-12-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('dateRelease')
    }
  })

  it('accepts dateRelease after dateHire', () => {
    const result = driverSchema.safeParse({
      driverCode: 'D001',
      driverName: 'John',
      status: 'ACTIVE',
      dateHire: '2022-01-15',
      dateRelease: '2023-06-01',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = driverSchema.safeParse({
      driverCode: 'D001', driverName: 'John', status: 'ACTIVE',
      emailID: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string email', () => {
    const result = driverSchema.safeParse({
      driverCode: 'D001', driverName: 'John', status: 'ACTIVE',
      emailID: '',
    })
    expect(result.success).toBe(true)
  })
})

describe('DRIVER_STATUS_MAP', () => {
  it('maps numeric IDs to status strings', () => {
    expect(DRIVER_STATUS_MAP[1]).toBe('ACTIVE')
    expect(DRIVER_STATUS_MAP[2]).toBe('INACTIVE')
    expect(DRIVER_STATUS_MAP[3]).toBe('ON LEAVE')
    expect(DRIVER_STATUS_MAP[4]).toBe('TERMINATED')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/types/driver.test.ts
```

Expected: FAIL — "Cannot find module './driver'"

- [ ] **Step 3: Create the types file**

`src/types/driver.ts`:
```ts
import { z } from 'zod'

export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'ON LEAVE' | 'TERMINATED'

export const DRIVER_STATUS_MAP: Record<number, DriverStatus> = {
  1: 'ACTIVE',
  2: 'INACTIVE',
  3: 'ON LEAVE',
  4: 'TERMINATED',
}

export const REVERSE_STATUS_MAP: Record<DriverStatus, number> = {
  'ACTIVE': 1,
  'INACTIVE': 2,
  'ON LEAVE': 3,
  'TERMINATED': 4,
}

export const driverSchema = z.object({
  driverCode:        z.string().min(1, 'Driver code is required'),
  driverName:        z.string().min(1, 'Driver name is required'),
  dob:               z.string().optional(),
  position:          z.string().optional(),
  idNo:              z.string().optional(),
  ssNo:              z.string().optional(),
  status:            z.enum(['ACTIVE', 'INACTIVE', 'ON LEAVE', 'TERMINATED']),
  dateHire:          z.string().optional(),
  dateRelease:       z.string().optional(),
  standardRate:      z.coerce.number().optional(),
  overtimeRate:      z.coerce.number().optional(),
  fuelCard:          z.string().optional(),
  licenseNo:         z.string().optional(),
  licenseExpiryDate: z.string().optional(),
  remarks:           z.string().optional(),
  address1:          z.string().optional(),
  address2:          z.string().optional(),
  state:             z.string().optional(),
  countryCode:       z.string().optional(),
  postCode:          z.string().optional(),
  phoneNumber:       z.string().optional(),
  faxNumber:         z.string().optional(),
  emailID:           z.union([z.string().email(), z.literal('')]).optional(),
  contactPerson:     z.string().optional(),
  mobilePhoneNumber: z.string().optional(),
}).refine(
  data => {
    if (data.dateHire && data.dateRelease) {
      return new Date(data.dateRelease) > new Date(data.dateHire)
    }
    return true
  },
  { message: 'Release date must be after hire date', path: ['dateRelease'] }
)

export type DriverFormValues = z.infer<typeof driverSchema>

export type Driver = DriverFormValues & {
  driverID: number
  branchID: number
}

export interface DriverApiResponse {
  driverID:     number
  driverCode:   string
  driverName:   string
  status:       number
  location:     string | null
  contactID:    number | null
  createdBy:    string | null
  createdOn:    string | null
  modifiedBy:   string | null
  modifiedOn:   string | null
  imageName:    string | null
}

export interface DriverSearchCriteria {
  driverName?: string
  status?: string
  branch?: string
}

export const NEW_DRIVER_DEFAULTS: DriverFormValues = {
  driverCode: '',
  driverName: '',
  status: 'ACTIVE',
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/types/driver.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/driver.ts src/types/driver.test.ts
git commit -m "feat: driver types, zod schema, status map"
```

---

## Task 4: calcAge Utility

**Files:**
- Create: `src/lib/utils/driver.ts`

- [ ] **Step 1: Create utility**

`src/lib/utils/driver.ts`:
```ts
export function calcAge(dob: string | undefined): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-')
}

export function isDateExpired(dateStr: string | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/driver.ts
git commit -m "feat: driver utility functions (calcAge, formatDate, isDateExpired)"
```

---

## Task 5: Mock Driver Data

**Files:**
- Create: `src/lib/mock/drivers.ts`

- [ ] **Step 1: Create mock data**

`src/lib/mock/drivers.ts`:
```ts
import type { Driver } from '@/types/driver'

let _store: Driver[] | null = null

function getStore(): Driver[] {
  if (!_store) _store = [...MOCK_DRIVERS_SEED]
  return _store
}

export function getMockDrivers(): Driver[] { return getStore() }

export function removeMockDriver(id: number): void {
  _store = getStore().filter(d => d.driverID !== id)
}

export function upsertMockDriver(driver: Driver): void {
  const store = getStore()
  const idx = store.findIndex(d => d.driverID === driver.driverID)
  if (idx >= 0) store[idx] = driver
  else _store = [...store, driver]
}

const MOCK_DRIVERS_SEED: Driver[] = [
  {
    driverID: 1, branchID: 1,
    driverCode: 'DRV-001', driverName: 'Somchai Jaidee',
    status: 'ACTIVE', position: 'Senior Driver',
    dob: '1985-03-15', idNo: '1234567890123', ssNo: 'SS001',
    dateHire: '2018-06-01',
    licenseNo: 'LIC-0001', licenseExpiryDate: '2027-06-30',
    standardRate: 450, overtimeRate: 68,
    address1: '123 Sukhumvit Rd', address2: 'Klongtoey',
    state: 'Bangkok', countryCode: 'TH', postCode: '10110',
    phoneNumber: '0812345678', emailID: 'somchai@example.com',
    contactPerson: 'Malee Jaidee', mobilePhoneNumber: '0891234567',
    fuelCard: 'FC-001',
  },
  {
    driverID: 2, branchID: 1,
    driverCode: 'DRV-002', driverName: 'Prasert Kamolchat',
    status: 'ACTIVE', position: 'Driver',
    dob: '1990-07-22', idNo: '2345678901234', ssNo: 'SS002',
    dateHire: '2020-01-15',
    licenseNo: 'LIC-0002', licenseExpiryDate: '2026-01-14',
    standardRate: 400, overtimeRate: 60,
    address1: '45 Rama IV Rd', state: 'Bangkok', countryCode: 'TH', postCode: '10500',
    phoneNumber: '0823456789',
    contactPerson: 'Nipa Kamolchat', mobilePhoneNumber: '0834567890',
  },
  {
    driverID: 3, branchID: 1,
    driverCode: 'DRV-003', driverName: 'Wanchai Boonsong',
    status: 'INACTIVE', position: 'Driver',
    dob: '1978-11-05',
    dateHire: '2015-03-10', dateRelease: '2023-12-31',
    licenseNo: 'LIC-0003', licenseExpiryDate: '2024-03-09',
    standardRate: 420,
    address1: '78 Phaholyothin Rd', state: 'Bangkok', countryCode: 'TH',
    phoneNumber: '0834567890',
    contactPerson: 'Ratree Boonsong', mobilePhoneNumber: '0845678901',
  },
  {
    driverID: 4, branchID: 1,
    driverCode: 'DRV-004', driverName: 'Nattapong Sriwong',
    status: 'ON LEAVE', position: 'Driver',
    dob: '1993-04-18',
    dateHire: '2021-08-01',
    licenseNo: 'LIC-0004', licenseExpiryDate: '2028-08-31',
    standardRate: 400, overtimeRate: 60,
    address1: '12 Lat Phrao Rd', state: 'Bangkok', countryCode: 'TH',
    phoneNumber: '0856789012',
    contactPerson: 'Sunisa Sriwong', mobilePhoneNumber: '0867890123',
  },
  {
    driverID: 5, branchID: 1,
    driverCode: 'DRV-005', driverName: 'Kitti Phakdee',
    status: 'TERMINATED', position: 'Senior Driver',
    dob: '1975-09-30',
    dateHire: '2010-05-01', dateRelease: '2022-04-30',
    licenseNo: 'LIC-0005', licenseExpiryDate: '2023-04-30',
    standardRate: 480, overtimeRate: 72,
    address1: '56 Charoen Krung Rd', state: 'Bangkok', countryCode: 'TH',
    contactPerson: 'Pornpan Phakdee', mobilePhoneNumber: '0878901234',
  },
  {
    driverID: 6, branchID: 1,
    driverCode: 'DRV-006', driverName: 'Chaiyaporn Rattana',
    status: 'ACTIVE', position: 'Driver',
    dob: '1988-12-10',
    dateHire: '2019-11-15',
    licenseNo: 'LIC-0006', licenseExpiryDate: '2029-11-14',
    standardRate: 420, overtimeRate: 63,
    address1: '90 Thonburi Rd', state: 'Bangkok', countryCode: 'TH',
    phoneNumber: '0889012345', emailID: 'chaiya@example.com',
    contactPerson: 'Anchana Rattana', mobilePhoneNumber: '0890123456',
  },
  {
    driverID: 7, branchID: 1,
    driverCode: 'DRV-007', driverName: 'Surachai Nakorn',
    status: 'ACTIVE', position: 'Driver',
    dob: '1995-02-14',
    dateHire: '2022-03-01',
    licenseNo: 'LIC-0007', licenseExpiryDate: '2027-02-28',
    standardRate: 380, overtimeRate: 57,
    address1: '34 Bangna Rd', state: 'Bangkok', countryCode: 'TH',
    contactPerson: 'Lalita Nakorn', mobilePhoneNumber: '0901234567',
  },
  {
    driverID: 8, branchID: 1,
    driverCode: 'DRV-008', driverName: 'Panya Thammasat',
    status: 'ACTIVE', position: 'Senior Driver',
    dob: '1982-06-25',
    dateHire: '2016-09-01', fuelCard: 'FC-008',
    licenseNo: 'LIC-0008', licenseExpiryDate: '2026-08-31',
    standardRate: 460, overtimeRate: 69,
    address1: '67 Nawamin Rd', state: 'Bangkok', countryCode: 'TH',
    phoneNumber: '0912345678', emailID: 'panya@example.com',
    contactPerson: 'Orathai Thammasat', mobilePhoneNumber: '0923456789',
  },
  {
    driverID: 9, branchID: 1,
    driverCode: 'DRV-009', driverName: 'Mongkol Siriporn',
    status: 'ACTIVE', position: 'Driver',
    dob: '1991-08-08',
    dateHire: '2020-07-15',
    licenseNo: 'LIC-0009', licenseExpiryDate: '2030-07-14',
    standardRate: 400,
    address1: '23 Ratchadaphisek Rd', state: 'Bangkok', countryCode: 'TH',
    contactPerson: 'Patcharee Siriporn', mobilePhoneNumber: '0934567890',
  },
  {
    driverID: 10, branchID: 1,
    driverCode: 'DRV-010', driverName: 'Thanasak Pornprapha',
    status: 'INACTIVE',
    dob: '1980-01-01',
    dateHire: '2012-01-01', dateRelease: '2024-01-01',
    licenseNo: 'LIC-0010', licenseExpiryDate: '2024-12-31',
    standardRate: 440,
    address1: '11 Vibhavadi Rd', state: 'Bangkok', countryCode: 'TH',
    contactPerson: 'Benjawan Pornprapha', mobilePhoneNumber: '0945678901',
  },
  {
    driverID: 11, branchID: 1,
    driverCode: 'DRV-011', driverName: 'Akkarat Wongkham',
    status: 'ACTIVE', position: 'Driver',
    dob: '1997-05-20',
    dateHire: '2023-04-01',
    licenseNo: 'LIC-0011', licenseExpiryDate: '2028-04-30',
    standardRate: 370,
    address1: '88 Onnut Rd', state: 'Bangkok', countryCode: 'TH',
    contactPerson: 'Wassana Wongkham', mobilePhoneNumber: '0956789012',
  },
  {
    driverID: 12, branchID: 1,
    driverCode: 'DRV-012', driverName: 'Ratchanon Butri',
    status: 'ON LEAVE', position: 'Driver',
    dob: '1989-10-12',
    dateHire: '2017-02-15',
    licenseNo: 'LIC-0012', licenseExpiryDate: '2025-02-14',
    standardRate: 430, overtimeRate: 65,
    address1: '15 Srinakarin Rd', state: 'Samut Prakan', countryCode: 'TH',
    phoneNumber: '0967890123', emailID: 'ratchanon@example.com',
    contactPerson: 'Supansa Butri', mobilePhoneNumber: '0978901234',
  },
]

// backward-compat alias used by data layer
export const MOCK_DRIVERS = MOCK_DRIVERS_SEED
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mock/drivers.ts
git commit -m "feat: 12 mock driver records with mutable store helpers"
```

---

## Task 6: Server-Side Data Layer

**Files:**
- Create: `src/lib/data/drivers.ts`
- Create: `src/lib/data/drivers.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/data/drivers.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getDrivers, getDriver } from './drivers'

describe('getDrivers', () => {
  it('returns all drivers when no criteria', async () => {
    const result = await getDrivers({})
    expect(result.length).toBe(12)
  })

  it('filters by driverName (case-insensitive)', async () => {
    const result = await getDrivers({ driverName: 'somchai' })
    expect(result.length).toBe(1)
    expect(result[0].driverCode).toBe('DRV-001')
  })

  it('filters by status', async () => {
    const result = await getDrivers({ status: 'ACTIVE' })
    expect(result.every(d => d.status === 'ACTIVE')).toBe(true)
  })

  it('returns empty array when no match', async () => {
    const result = await getDrivers({ driverName: 'zzznomatch' })
    expect(result).toEqual([])
  })
})

describe('getDriver', () => {
  it('returns driver by ID', async () => {
    const result = await getDriver(1)
    expect(result?.driverCode).toBe('DRV-001')
  })

  it('returns null for unknown ID', async () => {
    const result = await getDriver(9999)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
npx vitest run src/lib/data/drivers.test.ts
```

Expected: FAIL — "Cannot find module './drivers'"

- [ ] **Step 3: Create data layer**

`src/lib/data/drivers.ts`:
```ts
import { getMockDrivers } from '@/lib/mock/drivers'
import type { Driver, DriverSearchCriteria } from '@/types/driver'

export async function getDrivers(criteria: DriverSearchCriteria): Promise<Driver[]> {
  // SWAP: replace body with fetch('/api/master/driver/list', { method: 'POST', body: JSON.stringify(criteria) })
  let results = getMockDrivers()

  if (criteria.driverName) {
    const q = criteria.driverName.toLowerCase()
    results = results.filter(d =>
      d.driverName.toLowerCase().includes(q) ||
      d.driverCode.toLowerCase().includes(q)
    )
  }

  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter(d => d.status === criteria.status)
  }

  return results
}

export async function getDriver(id: number): Promise<Driver | null> {
  // SWAP: replace body with fetch(`/api/master/driver/${id}`)
  return getMockDrivers().find(d => d.driverID === id) ?? null
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npx vitest run src/lib/data/drivers.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/drivers.ts src/lib/data/drivers.test.ts
git commit -m "feat: server-side driver data layer with mock"
```

---

## Task 7: Client useDriver Hook

**Files:**
- Create: `src/lib/hooks/useDriver.ts`

- [ ] **Step 1: Create hook**

`src/lib/hooks/useDriver.ts`:
```ts
'use client'
import { useState } from 'react'
import { upsertMockDriver, removeMockDriver } from '@/lib/mock/drivers'
import type { Driver, DriverFormValues } from '@/types/driver'

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function useDriver(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: DriverFormValues): Promise<Driver> {
    setIsSaving(true)
    try {
      await delay(400)
      const driver: Driver = {
        ...values,
        driverID: id === 'new' ? Date.now() : parseInt(id, 10),
        branchID: 1,
      }
      upsertMockDriver(driver)
      return driver
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockDriver(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/useDriver.ts
git commit -m "feat: useDriver client hook (mock save/delete)"
```

---

## Task 8: Toast System

**Files:**
- Create: `src/lib/stores/useToastStore.ts`
- Create: `src/components/shared/Toast.tsx`
- Modify: `src/components/providers.tsx`

- [ ] **Step 1: Create toast store**

`src/lib/stores/useToastStore.ts`:
```ts
import { create } from 'zustand'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

interface ToastStore {
  toasts: ToastItem[]
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  success: (title, message) => set(s => ({
    toasts: [...s.toasts, { id: crypto.randomUUID(), type: 'success', title, message }],
  })),

  error: (title, message) => set(s => ({
    toasts: [...s.toasts, { id: crypto.randomUUID(), type: 'error', title, message }],
  })),

  warning: (title, message) => set(s => ({
    toasts: [...s.toasts, { id: crypto.randomUUID(), type: 'warning', title, message }],
  })),

  info: (title, message) => set(s => ({
    toasts: [...s.toasts, { id: crypto.randomUUID(), type: 'info', title, message }],
  })),

  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
```

- [ ] **Step 2: Create Toast renderer**

`src/components/shared/Toast.tsx`:
```tsx
'use client'
import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore } from '@/lib/stores/useToastStore'
import { cn } from '@/lib/utils/cn'

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const STYLES = {
  success: 'bg-success-50 border-success-200 text-success-800',
  error:   'bg-error-50 border-error-200 text-error-800',
  warning: 'bg-warning-50 border-warning-200 text-warning-800',
  info:    'bg-info-50 border-info-200 text-info-800',
}

const ICON_STYLES = {
  success: 'text-success-500',
  error:   'text-error-500',
  warning: 'text-warning-500',
  info:    'text-info-500',
}

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: import('@/lib/stores/useToastStore').ToastItem; onDismiss: () => void }) {
  const Icon = ICONS[toast.type]

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-4 shadow-md', STYLES[toast.type])}>
      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', ICON_STYLES[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.message && <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>}
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Read current providers.tsx**

Read `src/components/providers.tsx` — confirm its current content before editing.

- [ ] **Step 4: Add ToastContainer to providers**

Open `src/components/providers.tsx`. Add the import and `<ToastContainer />` inside the providers wrapper (after the last existing provider but before the closing tag):

```tsx
import { ToastContainer } from '@/components/shared/Toast'
// inside the return:
<ToastContainer />
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/useToastStore.ts src/components/shared/Toast.tsx src/components/providers.tsx
git commit -m "feat: zustand toast system with auto-dismiss"
```

---

## Task 9: SearchInput Shared Component

**Files:**
- Create: `src/components/shared/SearchInput.tsx`

- [ ] **Step 1: Create component**

`src/components/shared/SearchInput.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => onChange(local), 300)
    return () => clearTimeout(timer)
  }, [local, onChange])

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
      {local && (
        <button
          onClick={() => { setLocal(''); onChange('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/SearchInput.tsx
git commit -m "feat: SearchInput shared component with debounce"
```

---

## Task 10: StatusBadge Shared Component

**Files:**
- Create: `src/components/shared/StatusBadge.tsx`

- [ ] **Step 1: Create component**

`src/components/shared/StatusBadge.tsx`:
```tsx
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'
import type { DriverStatus } from '@/types/driver'

type BadgeStatus = DriverStatus | 'DEFAULT'

const badge = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    status: {
      ACTIVE:     'bg-success-100 text-success-700',
      INACTIVE:   'bg-gray-100 text-gray-600',
      'ON LEAVE': 'bg-warning-100 text-warning-700',
      TERMINATED: 'bg-error-100 text-error-700',
      DEFAULT:    'bg-gray-100 text-gray-500',
    } as Record<BadgeStatus, string>,
  },
  defaultVariants: { status: 'DEFAULT' as BadgeStatus },
})

interface StatusBadgeProps {
  status: DriverStatus | string
  className?: string
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  'ON LEAVE': 'On Leave',
  TERMINATED: 'Terminated',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant: BadgeStatus = (['ACTIVE', 'INACTIVE', 'ON LEAVE', 'TERMINATED'] as string[]).includes(status)
    ? (status as DriverStatus)
    : 'DEFAULT'

  return (
    <span className={cn(badge({ status: variant }), className)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/StatusBadge.tsx
git commit -m "feat: StatusBadge shared component with CVA variants"
```

---

## Task 11: ConfirmDialog Shared Component

**Files:**
- Create: `src/components/shared/ConfirmDialog.tsx`

- [ ] **Step 1: Create component**

`src/components/shared/ConfirmDialog.tsx`:
```tsx
'use client'
import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = 'confirm-dialog-title'
  const msgId = 'confirm-dialog-msg'

  const prevFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
      prevFocusRef.current?.focus()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={msgId}
      onCancel={(e) => { e.preventDefault(); onCancel() }}
      className="rounded-xl shadow-xl p-0 w-full max-w-md backdrop:bg-black/40 border-0"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-error-100">
            <AlertTriangle className="h-5 w-5 text-error-600" />
          </div>
          <div>
            <h3 id={titleId} className="text-base font-semibold text-gray-900">{title}</h3>
            <p id={msgId} className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-error-600 rounded-lg hover:bg-error-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/ConfirmDialog.tsx
git commit -m "feat: ConfirmDialog with native dialog, focus trap, ARIA"
```

---

## Task 12: DataTable Shared Component

**Files:**
- Create: `src/components/shared/DataTable.tsx`

- [ ] **Step 1: Create component**

`src/components/shared/DataTable.tsx`:
```tsx
'use client'
import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  isLoading?: boolean
  onRowClick?: (row: T) => void
}

export function DataTable<T>({ columns, data, isLoading, onRowClick }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-gray-400">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No records found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <span>
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              data.length
            )} of {data.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/DataTable.tsx
git commit -m "feat: DataTable shared component (TanStack Table, sort, pagination)"
```

---

## Task 13: ListPage + FormLayout Shared Components

**Files:**
- Create: `src/components/shared/ListPage.tsx`
- Create: `src/components/shared/FormLayout.tsx`

- [ ] **Step 1: Create ListPage**

`src/components/shared/ListPage.tsx`:
```tsx
import type { ReactNode } from 'react'

interface ListPageProps {
  title: string
  subtitle?: string
  action?: ReactNode
  filters?: ReactNode
  children: ReactNode
}

export function ListPage({ title, subtitle, action, filters, children }: ListPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {filters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {filters}
        </div>
      )}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create FormLayout**

`src/components/shared/FormLayout.tsx`:
```tsx
'use client'
import type { ReactNode } from 'react'
import { Trash2, X, Save } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Tab {
  id: string
  label: string
}

interface FormLayoutProps {
  title: string
  badge?: ReactNode
  isNew: boolean
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  onDelete?: () => void
  onClose: () => void
  children: ReactNode
}

export function FormLayout({
  title, badge, isNew, tabs,
  activeTab, onTabChange,
  isDirty, isSaving,
  onSave, onDelete, onClose,
  children,
}: FormLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {badge}
            {isNew && (
              <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                New
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isNew && onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-error-600 border border-error-200 rounded-lg hover:bg-error-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 mt-4 border-b border-gray-100 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {children}
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ListPage.tsx src/components/shared/FormLayout.tsx
git commit -m "feat: ListPage and FormLayout shared components"
```

---

## Task 14: DriverFilters + DriversListClient

**Files:**
- Create: `src/components/drivers/DriverFilters.tsx`
- Create: `src/components/drivers/DriversListClient.tsx`

- [ ] **Step 1: Create DriverFilters**

`src/components/drivers/DriverFilters.tsx`:
```tsx
'use client'
import { Search, RotateCcw } from 'lucide-react'

const STRINGS = {
  namePlaceholder: 'Driver name or code...',
  statusLabel: 'Status',
  branchLabel: 'Branch',
  searchBtn: 'Search',
  resetBtn: 'Reset',
  statusOptions: [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'ON LEAVE', label: 'On Leave' },
    { value: 'TERMINATED', label: 'Terminated' },
  ],
} as const

interface DriverFiltersProps {
  name: string
  status: string
  branch: string
  onNameChange: (v: string) => void
  onStatusChange: (v: string) => void
  onBranchChange: (v: string) => void
  onSearch: () => void
  onReset: () => void
}

export function DriverFilters({
  name, status, branch,
  onNameChange, onStatusChange, onBranchChange,
  onSearch, onReset,
}: DriverFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-48">
        <label className="block text-xs font-medium text-gray-500 mb-1">{STRINGS.namePlaceholder}</label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder={STRINGS.namePlaceholder}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="w-44">
        <label className="block text-xs font-medium text-gray-500 mb-1">{STRINGS.statusLabel}</label>
        <select
          value={status}
          onChange={e => onStatusChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {STRINGS.statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="w-44">
        <label className="block text-xs font-medium text-gray-500 mb-1">{STRINGS.branchLabel}</label>
        <input
          type="text"
          value={branch}
          onChange={e => onBranchChange(e.target.value)}
          placeholder="Branch..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <button
        onClick={onSearch}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
      >
        <Search className="h-4 w-4" />
        {STRINGS.searchBtn}
      </button>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <RotateCcw className="h-4 w-4" />
        {STRINGS.resetBtn}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create DriversListClient**

`src/components/drivers/DriversListClient.tsx`:
```tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DriverFilters } from '@/components/drivers/DriverFilters'
import { useToastStore } from '@/lib/stores/useToastStore'
import { formatDate, isDateExpired } from '@/lib/utils/driver'
import { removeMockDriver } from '@/lib/mock/drivers'
import type { Driver } from '@/types/driver'
import { cn } from '@/lib/utils/cn'

const STRINGS = {
  title: 'Drivers',
  subtitle: 'Manage driver profiles, licenses and emergency contacts',
  addDriver: 'Add Driver',
  columns: {
    code: 'Driver Code',
    name: 'Name',
    license: 'License No.',
    expiry: 'License Expiry',
    status: 'Status',
    actions: 'Actions',
  },
  deleteTitle: 'Delete Driver',
  deleteMessage: 'Are you sure you want to delete this driver? This action cannot be undone.',
} as const

const col = createColumnHelper<Driver>()

interface DriversListClientProps {
  initialData: Driver[]
}

export function DriversListClient({ initialData }: DriversListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error } = useToastStore()

  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [branch, setBranch] = useState(searchParams.get('branch') ?? '')
  const [data, setData] = useState<Driver[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams()
    if (name) params.set('name', name)
    if (status) params.set('status', status)
    if (branch) params.set('branch', branch)
    router.push(`/master/drivers?${params.toString()}`)
  }, [name, status, branch, router])

  const handleReset = () => {
    setName(''); setStatus(''); setBranch('')
    router.push('/master/drivers')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      removeMockDriver(deleteTarget.driverID)
      setData(prev => prev.filter(d => d.driverID !== deleteTarget.driverID))
      success('Driver deleted', `${deleteTarget.driverName} has been removed.`)
    } catch {
      error('Delete failed', 'Please try again.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns = [
    col.accessor('driverCode', {
      header: STRINGS.columns.code,
      enableSorting: true,
    }),
    col.accessor('driverName', {
      header: STRINGS.columns.name,
      enableSorting: true,
    }),
    col.accessor('licenseNo', {
      header: STRINGS.columns.license,
      cell: info => info.getValue() ?? '—',
      enableSorting: false,
    }),
    col.accessor('licenseExpiryDate', {
      header: STRINGS.columns.expiry,
      cell: info => {
        const val = info.getValue()
        return (
          <span className={cn(val && isDateExpired(val) ? 'text-error-600 font-medium' : '')}>
            {formatDate(val)}
          </span>
        )
      },
      enableSorting: false,
    }),
    col.accessor('status', {
      header: STRINGS.columns.status,
      cell: info => <StatusBadge status={info.getValue()} />,
      enableSorting: true,
    }),
    col.display({
      id: 'actions',
      header: STRINGS.columns.actions,
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => router.push(`/master/drivers/${row.original.driverID}`)}
            className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-primary-50"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {row.original.status !== 'INACTIVE' && (
            <button
              onClick={() => setDeleteTarget(row.original)}
              className="p-1.5 text-gray-400 hover:text-error-600 rounded hover:bg-error-50"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    }),
  ]

  return (
    <>
      <ListPage
        title={STRINGS.title}
        subtitle={STRINGS.subtitle}
        action={
          <button
            onClick={() => router.push('/master/drivers/new')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            {STRINGS.addDriver}
          </button>
        }
        filters={
          <DriverFilters
            name={name} status={status} branch={branch}
            onNameChange={setName} onStatusChange={setStatus} onBranchChange={setBranch}
            onSearch={handleSearch} onReset={handleReset}
          />
        }
      >
        <DataTable
          columns={columns}
          data={data}
          onRowClick={row => router.push(`/master/drivers/${row.driverID}`)}
        />
      </ListPage>

      <ConfirmDialog
        open={!!deleteTarget}
        title={STRINGS.deleteTitle}
        message={STRINGS.deleteMessage}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/drivers/DriverFilters.tsx src/components/drivers/DriversListClient.tsx
git commit -m "feat: DriverFilters and DriversListClient components"
```

---

## Task 15: Driver List Route Files

**Files:**
- Create: `src/app/(dashboard)/master/drivers/page.tsx`
- Create: `src/app/(dashboard)/master/drivers/loading.tsx`
- Create: `src/app/(dashboard)/master/drivers/error.tsx`

- [ ] **Step 1: Create page.tsx**

`src/app/(dashboard)/master/drivers/page.tsx`:
```tsx
import { Suspense } from 'react'
import { DriversListClient } from '@/components/drivers/DriversListClient'
import { getDrivers } from '@/lib/data/drivers'
import type { DriverSearchCriteria } from '@/types/driver'

interface DriversPageProps {
  searchParams: Promise<{ name?: string; status?: string; branch?: string }>
}

export default async function DriversPage({ searchParams }: DriversPageProps) {
  const params = await searchParams
  const criteria: DriverSearchCriteria = {
    driverName: params.name,
    status: params.status,
    branch: params.branch,
  }
  const drivers = await getDrivers(criteria)

  return (
    <Suspense fallback={null}>
      <DriversListClient initialData={drivers} />
    </Suspense>
  )
}

export const metadata = { title: 'Drivers — GECKO Fleet' }
```

- [ ] **Step 2: Create loading.tsx**

`src/app/(dashboard)/master/drivers/loading.tsx`:
```tsx
export default function DriversLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-3">
          {[1,2,3].map(i => <div key={i} className="h-9 flex-1 bg-gray-200 rounded animate-pulse" />)}
          <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-3">
          <div className="h-8 bg-gray-100 rounded animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create error.tsx**

`src/app/(dashboard)/master/drivers/error.tsx`:
```tsx
'use client'
import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function DriversError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error-100">
        <AlertCircle className="h-6 w-6 text-error-600" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-gray-900">Failed to load drivers</h2>
        <p className="mt-1 text-sm text-gray-500">An error occurred while loading the driver list.</p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Start dev server and verify list page renders**

```bash
npm run dev
```

Open `http://localhost:5001/master/drivers` — should show the driver list with 12 records, filter bar, and pagination.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/master/drivers/
git commit -m "feat: driver list route (page, loading, error)"
```

---

## Task 16: Form Section Components

**Files:**
- Create: `src/components/drivers/sections/GeneralSection.tsx`
- Create: `src/components/drivers/sections/LicenseSection.tsx`
- Create: `src/components/drivers/sections/EmergencyContactSection.tsx`

- [ ] **Step 1: Create GeneralSection**

`src/components/drivers/sections/GeneralSection.tsx`:
```tsx
'use client'
import { useMemo } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { calcAge } from '@/lib/utils/driver'
import type { DriverFormValues } from '@/types/driver'

const STRINGS = {
  driverCode: 'Driver Code',
  driverName: 'Driver Name',
  dob: 'Date of Birth',
  age: 'Age',
  position: 'Position',
  idNo: 'ID Number',
  ssNo: 'SS Number',
  status: 'Status',
  dateHire: 'Date Hired',
  dateRelease: 'Date Released',
  fuelCard: 'Fuel Card No.',
  standardRate: 'Standard Rate',
  overtimeRate: 'Overtime Rate',
  remarks: 'Remarks',
  addressSection: 'Address',
  address1: 'Address Line 1',
  address2: 'Address Line 2',
  state: 'State / Province',
  country: 'Country',
  postCode: 'Post Code',
  phone: 'Phone',
  mobile: 'Mobile',
  email: 'Email',
  required: '*',
  statusOptions: [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'ON LEAVE', label: 'On Leave' },
    { value: 'TERMINATED', label: 'Terminated' },
  ],
} as const

interface GeneralSectionProps {
  form: UseFormReturn<DriverFormValues>
  isNew: boolean
}

function Field({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-error-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500'

export function GeneralSection({ form, isNew }: GeneralSectionProps) {
  const { register, watch, formState: { errors } } = form
  const dobValue = watch('dob')
  const age = useMemo(() => calcAge(dobValue), [dobValue])

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={STRINGS.driverCode} required error={errors.driverCode?.message}>
          <input {...register('driverCode')} disabled={!isNew} className={inputClass} />
        </Field>
        <Field label={STRINGS.driverName} required error={errors.driverName?.message}>
          <input {...register('driverName')} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label={STRINGS.dob}>
          <input type="date" {...register('dob')} className={inputClass} />
        </Field>
        <Field label={STRINGS.age}>
          <input value={age ?? ''} disabled className={inputClass} placeholder="—" readOnly />
        </Field>
        <Field label={STRINGS.position}>
          <input {...register('position')} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label={STRINGS.idNo}>
          <input {...register('idNo')} className={inputClass} />
        </Field>
        <Field label={STRINGS.ssNo}>
          <input {...register('ssNo')} className={inputClass} />
        </Field>
        <Field label={STRINGS.status} required error={errors.status?.message}>
          <select {...register('status')} className={inputClass}>
            {STRINGS.statusOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label={STRINGS.dateHire}>
          <input type="date" {...register('dateHire')} className={inputClass} />
        </Field>
        <Field label={STRINGS.dateRelease} error={errors.dateRelease?.message}>
          <input type="date" {...register('dateRelease')} className={inputClass} />
        </Field>
        <Field label={STRINGS.fuelCard}>
          <input {...register('fuelCard')} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={STRINGS.standardRate}>
          <input type="number" step="0.01" {...register('standardRate')} className={inputClass} />
        </Field>
        <Field label={STRINGS.overtimeRate}>
          <input type="number" step="0.01" {...register('overtimeRate')} className={inputClass} />
        </Field>
      </div>

      <Field label={STRINGS.remarks}>
        <textarea {...register('remarks')} rows={3} className={inputClass} />
      </Field>

      {/* Address */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{STRINGS.addressSection}</h3>
        <div className="space-y-4">
          <Field label={STRINGS.address1}>
            <input {...register('address1')} className={inputClass} />
          </Field>
          <Field label={STRINGS.address2}>
            <input {...register('address2')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={STRINGS.state}>
              <input {...register('state')} className={inputClass} />
            </Field>
            <Field label={STRINGS.country}>
              <input {...register('countryCode')} className={inputClass} placeholder="e.g. TH" />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={STRINGS.postCode}>
              <input {...register('postCode')} className={inputClass} />
            </Field>
            <Field label={STRINGS.phone}>
              <input {...register('phoneNumber')} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={STRINGS.mobile}>
              <input {...register('mobilePhoneNumber')} className={inputClass} />
            </Field>
            <Field label={STRINGS.email} error={errors.emailID?.message}>
              <input type="email" {...register('emailID')} className={inputClass} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create LicenseSection**

`src/components/drivers/sections/LicenseSection.tsx`:
```tsx
'use client'
import { type UseFormReturn } from 'react-hook-form'
import type { DriverFormValues } from '@/types/driver'

const STRINGS = {
  licenseNo: 'License Number',
  licenseExpiryDate: 'License Expiry Date',
  hint: 'Expiry date is highlighted red on the driver list when past due.',
} as const

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'

interface LicenseSectionProps {
  form: UseFormReturn<DriverFormValues>
}

export function LicenseSection({ form }: LicenseSectionProps) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{STRINGS.licenseNo}</label>
        <input {...register('licenseNo')} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{STRINGS.licenseExpiryDate}</label>
        <input type="date" {...register('licenseExpiryDate')} className={inputClass} />
      </div>
      <p className="text-xs text-gray-400">{STRINGS.hint}</p>
    </div>
  )
}
```

- [ ] **Step 3: Create EmergencyContactSection**

`src/components/drivers/sections/EmergencyContactSection.tsx`:
```tsx
'use client'
import { type UseFormReturn } from 'react-hook-form'
import type { DriverFormValues } from '@/types/driver'

const STRINGS = {
  contactPerson: 'Contact Person Name',
  mobilePhoneNumber: 'Mobile Phone Number',
} as const

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'

interface EmergencyContactSectionProps {
  form: UseFormReturn<DriverFormValues>
}

export function EmergencyContactSection({ form }: EmergencyContactSectionProps) {
  const { register } = form

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{STRINGS.contactPerson}</label>
        <input {...register('contactPerson')} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{STRINGS.mobilePhoneNumber}</label>
        <input {...register('mobilePhoneNumber')} className={inputClass} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/drivers/sections/
git commit -m "feat: driver form section components (General, License, EmergencyContact)"
```

---

## Task 17: DriverProfileClient

**Files:**
- Create: `src/components/drivers/DriverProfileClient.tsx`

- [ ] **Step 1: Create component**

`src/components/drivers/DriverProfileClient.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormLayout } from '@/components/shared/FormLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { GeneralSection } from '@/components/drivers/sections/GeneralSection'
import { LicenseSection } from '@/components/drivers/sections/LicenseSection'
import { EmergencyContactSection } from '@/components/drivers/sections/EmergencyContactSection'
import { useDriver } from '@/lib/hooks/useDriver'
import { useToastStore } from '@/lib/stores/useToastStore'
import { driverSchema, type DriverFormValues, type Driver } from '@/types/driver'

const STRINGS = {
  tabs: [
    { id: 'general', label: 'General' },
    { id: 'license', label: 'License' },
    { id: 'emergency', label: 'Emergency Contact' },
  ],
  newTitle: 'New Driver',
  deleteTitle: 'Delete Driver',
  deleteMessage: 'Are you sure you want to delete this driver? This cannot be undone.',
  saveSuccess: 'Driver saved',
  saveError: 'Save failed',
  saveErrorMsg: 'Please try again.',
} as const

interface DriverProfileClientProps {
  driver: DriverFormValues
  driverID: string
  isNew: boolean
}

export function DriverProfileClient({ driver, driverID, isNew }: DriverProfileClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { success, error } = useToastStore()
  const { isSaving, isDeleting, save, remove } = useDriver(driverID)

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: driver,
  })

  const { formState: { isDirty } } = form

  const handleSave = form.handleSubmit(async (values) => {
    try {
      const saved = await save(values)
      success('Driver saved', `${saved.driverName} has been saved.`)
      form.reset(saved)
      if (isNew) router.push(`/master/drivers/${saved.driverID}`)
    } catch {
      error(STRINGS.saveError, STRINGS.saveErrorMsg)
    }
  })

  const handleDelete = async () => {
    try {
      await remove()
      success('Driver deleted')
      router.push('/master/drivers')
    } catch {
      error('Delete failed', 'Please try again.')
    } finally {
      setShowDeleteDialog(false)
    }
  }

  const status = form.watch('status')

  return (
    <>
      <FormLayout
        title={isNew ? STRINGS.newTitle : form.watch('driverName') || 'Driver'}
        badge={!isNew ? <StatusBadge status={status} /> : undefined}
        isNew={isNew}
        tabs={[...STRINGS.tabs]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onDelete={!isNew ? () => setShowDeleteDialog(true) : undefined}
        onClose={() => router.push('/master/drivers')}
      >
        {activeTab === 'general' && <GeneralSection form={form} isNew={isNew} />}
        {activeTab === 'license' && <LicenseSection form={form} />}
        {activeTab === 'emergency' && <EmergencyContactSection form={form} />}
      </FormLayout>

      <ConfirmDialog
        open={showDeleteDialog}
        title={STRINGS.deleteTitle}
        message={STRINGS.deleteMessage}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/drivers/DriverProfileClient.tsx
git commit -m "feat: DriverProfileClient with react-hook-form, zod, tabs"
```

---

## Task 18: Driver Profile Route Files

**Files:**
- Create: `src/app/(dashboard)/master/drivers/[id]/page.tsx`
- Create: `src/app/(dashboard)/master/drivers/[id]/loading.tsx`
- Create: `src/app/(dashboard)/master/drivers/[id]/error.tsx`

- [ ] **Step 1: Create page.tsx**

`src/app/(dashboard)/master/drivers/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { DriverProfileClient } from '@/components/drivers/DriverProfileClient'
import { getDriver } from '@/lib/data/drivers'
import { NEW_DRIVER_DEFAULTS } from '@/types/driver'

interface DriverProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function DriverProfilePage({ params }: DriverProfilePageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <DriverProfileClient
        driver={NEW_DRIVER_DEFAULTS}
        driverID="new"
        isNew={true}
      />
    )
  }

  const driverID = parseInt(id, 10)
  if (isNaN(driverID)) notFound()

  const driver = await getDriver(driverID)
  if (!driver) notFound()

  return (
    <DriverProfileClient
      driver={driver}
      driverID={id}
      isNew={false}
    />
  )
}

export async function generateMetadata({ params }: DriverProfilePageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Driver — GECKO Fleet' }
  const driver = await getDriver(parseInt(id, 10))
  return { title: driver ? `${driver.driverName} — GECKO Fleet` : 'Driver — GECKO Fleet' }
}
```

- [ ] **Step 2: Create loading.tsx**

`src/app/(dashboard)/master/drivers/[id]/loading.tsx`:
```tsx
export default function DriverProfileLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          {[1,2,3].map(i => <div key={i} className="h-8 w-28 bg-gray-200 rounded animate-pulse" />)}
        </div>
      </div>
      <div className="flex-1 px-6 py-6 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-4">
            {[1,2,3].map(j => (
              <div key={j} className="space-y-1">
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-9 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create error.tsx**

`src/app/(dashboard)/master/drivers/[id]/error.tsx`:
```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function DriverProfileError({ error }: { error: Error }) {
  const router = useRouter()
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error-100">
        <AlertCircle className="h-6 w-6 text-error-600" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-gray-900">Driver not found</h2>
        <p className="mt-1 text-sm text-gray-500">This driver may have been deleted or the ID is invalid.</p>
      </div>
      <button
        onClick={() => router.push('/master/drivers')}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Drivers
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Verify profile page renders**

With dev server running, navigate to:
- `http://localhost:5001/master/drivers/1` — should show Somchai Jaidee's profile with 3 tabs
- `http://localhost:5001/master/drivers/new` — should show blank form with "New" badge
- `http://localhost:5001/master/drivers/9999` — should show error UI

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/master/drivers/[id]/
git commit -m "feat: driver profile route (page, loading, error)"
```

---

## Task 19: Smoke Test + Update TODO

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run --reporter=verbose
```

Expected: All tests PASS (schema tests + data layer tests).

- [ ] **Step 2: Manual smoke test — list page**

Navigate to `http://localhost:5001/master/drivers`:
- [ ] 12 drivers show in the table
- [ ] Sorting by Driver Code and Name works
- [ ] Pagination controls work (change to 25 per page)
- [ ] Search by name "somchai" returns 1 result
- [ ] Filter by status "ACTIVE" returns only active drivers
- [ ] Reset clears filters and shows all 12
- [ ] Expired license dates show in red (DRV-003, DRV-005, DRV-010, DRV-012)
- [ ] Delete button hidden for INACTIVE drivers (DRV-003, DRV-010)
- [ ] Click delete on DRV-007 → confirm dialog opens → confirm → driver removed + toast shown
- [ ] Click "Add Driver" → navigates to `/master/drivers/new`
- [ ] Click pencil icon on any row → navigates to profile

- [ ] **Step 3: Manual smoke test — profile page**

Navigate to `http://localhost:5001/master/drivers/1`:
- [ ] "Somchai Jaidee" shown in header with "Active" badge
- [ ] All 3 tabs clickable and switch content
- [ ] General tab: all fields populated from mock data
- [ ] DOB field shows `1985-03-15`, Age shows calculated value
- [ ] Driver Code field is disabled (not new)
- [ ] License tab shows LIC-0001 and 2027-06-30
- [ ] Emergency Contact tab shows Malee Jaidee
- [ ] Save button disabled when form is clean
- [ ] Edit any field → Save button enables
- [ ] Save → toast "Driver saved" → Save button disables
- [ ] Delete button → confirm dialog → confirm → redirects to list
- [ ] Close button → navigates to list

Navigate to `http://localhost:5001/master/drivers/new`:
- [ ] "New Driver" title with "New" badge
- [ ] All fields blank, Status defaults to "Active"
- [ ] Driver Code field is enabled
- [ ] Save without required fields → inline error messages
- [ ] Fill required fields → save → toast → redirected to new ID

- [ ] **Step 4: Mark TODO.md**

In `TODO.md`, update the Driver section:
```markdown
### Driver
- ✅ `/master/drivers` — Driver list (DataTable: code, name, license, status, expiry)
- ✅ `/master/drivers/[id]` — Driver profile form (tabs: General, License, Emergency Contact)
- ⬜ `/master/drivers/[id]/images` — Driver photo upload & gallery
```

Also update the Phase count table:
```markdown
| ⬜ 2 | Master Data | 13 | 2 |
```

- [ ] **Step 5: Final commit**

```bash
git add TODO.md
git commit -m "feat: mark driver list and profile pages complete in TODO"
```

---

## Summary

**20 tasks** — install deps → types → mock → data layer → hooks → toast → 6 shared components → 3 driver components → 3 section components → 6 route files → smoke tests.

**Shared components built (reused by all Phase 2+ pages):**
`SearchInput` · `StatusBadge` · `ConfirmDialog` · `DataTable` · `ListPage` · `FormLayout`

**New files:** 31 · **Modified files:** 3 (`providers.tsx`, `package.json`, `TODO.md`)
