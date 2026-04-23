# Driver Pages Design Spec
**Date:** 2026-04-23  
**Phase:** 2 — Master Data  
**Routes:** `/master/drivers` · `/master/drivers/[id]`  
**Status:** Approved

---

## 1. Context

Migrating the Angular DMS driver module to Next.js 14 App Router. Source files:
- `src/master/components/driver/driver-list.component.html` (127 lines)
- `src/master/components/driver/driver-profile.component.html` (268 lines)
- `src/services/fleet/driver-profile.service.ts`
- `src/models/master/driver.model.ts`

This spec covers the **first two Driver routes** from TODO.md. The image gallery (`/master/drivers/[id]/images`) is a separate scope.

---

## 2. Decisions

| Question | Decision | Reason |
|---|---|---|
| Shared components first or inline? | Shared first | 13 Phase 2 pages benefit immediately |
| Data layer | `async fn` (server) + `useState` (client) with mock | API contract not yet available; designed for easy swap |
| i18n | Deferred | `const STRINGS` object pattern enables one-line migration to `useTranslations()` |
| Form library | `react-hook-form` + `zod` | Production standard; dirty tracking, validation, performance |
| Table library | `@tanstack/react-table` | Production standard; avoids hand-rolling sort/filter/pagination |
| Server vs Client | Server Components for data fetch; Client Components for interactivity | Next.js 14 best practice |
| Status representation | Display strings on frontend, mapped from API numeric lookup ID | Angular API stores status as `lookupID: number`; frontend maps to human-readable strings |
| Validation relaxation | `dateHire`, `licenseNo`, `licenseExpiryDate` made optional | Angular required these but new UX allows draft saves; documented intentionally |

---

## 3. New Dependencies

```
react-hook-form
zod
@hookform/resolvers
@tanstack/react-table
```

---

## 4. File & Folder Structure

```
src/
├── app/(dashboard)/
│   └── master/
│       └── drivers/
│           ├── page.tsx              # Server Component — driver list
│           ├── loading.tsx           # Skeleton for list
│           ├── error.tsx             # Error UI with retry
│           └── [id]/
│               ├── page.tsx          # Server Component — driver profile
│               ├── loading.tsx       # Skeleton for form
│               └── error.tsx         # Not-found + back button
│
├── components/
│   ├── shared/                       # Reused across all Phase 2+ pages
│   │   ├── DataTable.tsx
│   │   ├── ListPage.tsx
│   │   ├── FormLayout.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── SearchInput.tsx
│   │
│   └── drivers/
│       ├── DriversListClient.tsx     # Client wrapper for list page
│       ├── DriverProfileClient.tsx   # Client wrapper for profile form
│       ├── DriverFilters.tsx         # Name / Status / Branch filter bar
│       └── sections/
│           ├── GeneralSection.tsx
│           ├── LicenseSection.tsx
│           └── EmergencyContactSection.tsx
│
├── lib/
│   ├── mock/
│   │   └── drivers.ts                # 12 realistic mock records
│   ├── data/
│   │   └── drivers.ts                # Server-side async functions (getDrivers, getDriver)
│   └── hooks/
│       └── useDriver.ts              # Client hook: save / delete (mock store)
│
└── types/
    └── driver.ts                     # Zod schema + inferred types
```

> **Note on `(dashboard)` layout:** The existing `src/app/(dashboard)/layout.tsx` is a Client Component (uses `useUIStore`). Server Components nested inside a client boundary still avoid client-side JS for their own render path, so `drivers/page.tsx` being a Server Component is still worthwhile for streaming and reduced bundle size on initial load.

---

## 5. Type & Schema (`types/driver.ts`)

### 5.1 Status mapping

The Angular API stores `status` as a numeric `lookupID`. The frontend maps these to display strings:

```ts
export const DRIVER_STATUS_MAP: Record<number, DriverStatus> = {
  1: 'ACTIVE',
  2: 'INACTIVE',
  3: 'ON LEAVE',
  4: 'TERMINATED',
}
export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'ON LEAVE' | 'TERMINATED'
```

When reading from API: `DRIVER_STATUS_MAP[apiDriver.status]`  
When saving to API: reverse lookup `Object.entries(DRIVER_STATUS_MAP).find(([,v]) => v === formStatus)?.[0]`

Mock data uses `DriverStatus` strings directly; the swap adapters live in `lib/data/drivers.ts`.

### 5.2 Form schema

```ts
import { z } from 'zod'

export const driverSchema = z.object({
  driverCode:        z.string().min(1, 'Driver code is required'),
  driverName:        z.string().min(1, 'Driver name is required'),
  dob:               z.string().optional(),
  position:          z.string().optional(),
  idNo:              z.string().optional(),
  ssNo:              z.string().optional(),
  status:            z.enum(['ACTIVE', 'INACTIVE', 'ON LEAVE', 'TERMINATED']),
  // dateHire intentionally optional — new UX allows draft saves (Angular had required)
  dateHire:          z.string().optional(),
  dateRelease:       z.string().optional(),
  standardRate:      z.coerce.number().optional(),
  overtimeRate:      z.coerce.number().optional(),
  fuelCard:          z.string().optional(),
  // licenseNo / licenseExpiryDate intentionally optional — same draft-save rationale
  licenseNo:         z.string().optional(),
  licenseExpiryDate: z.string().optional(),
  remarks:           z.string().optional(),
  // address fields (flattened from Angular contact sub-object — see Section 12)
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
```

### 5.3 Full driver types

```ts
// DriverFormValues + identity fields — used in UI and mock store
export type Driver = DriverFormValues & {
  driverID: number      // API uses integer IDs
  branchID: number      // required for save/delete API calls (from user session)
}

// Raw API response shape — used only in lib/data/drivers.ts adapters
export interface DriverApiResponse {
  driverID:     number
  driverCode:   string
  driverName:   string
  status:       number          // numeric lookupID
  location:     string | null   // branch location — display only, not editable in this form
  contactID:    number | null   // FK to contact sub-object
  createdBy:    string | null
  createdOn:    string | null
  modifiedBy:   string | null
  modifiedOn:   string | null
  imageName:    string | null   // used by image gallery route (out of scope here)
  // ...remaining fields matching DriverFormValues (flat or nested contact object)
}
```

> **`location`, `contactID`, `createdBy/On`, `modifiedBy/On`, `imageName`** are API-only fields. They are not part of the form schema. The adapter in `lib/data/drivers.ts` reads them from the API response and passes `imageName` as a read-only prop to `DriverProfileClient` (for the avatar placeholder); the others are stripped.

### 5.4 Search criteria

```ts
export interface DriverSearchCriteria {
  driverName?: string
  status?: string        // display string — adapter converts to lookupID before API call
  branch?: string
}
```

---

## 6. Shared Components

### 6.1 `SearchInput.tsx`
- Debounced text input (300 ms)
- Props: `value`, `onChange`, `placeholder`
- i18n-ready: `const STRINGS = { placeholder: 'Search...' } as const`

### 6.2 `StatusBadge.tsx`
- Props: `status: DriverStatus` (not `string` — typed to the union to prevent silent mismatches)
- Fallback variant for unknown values: `bg-gray-100 text-gray-500`
- CVA variants:
  - `ACTIVE` → `bg-success-100 text-success-700`
  - `INACTIVE` → `bg-gray-100 text-gray-600`
  - `ON LEAVE` → `bg-warning-100 text-warning-700`
  - `TERMINATED` → `bg-error-100 text-error-700`

### 6.3 `ConfirmDialog.tsx`
- Built on native `<dialog>` element — uses `showModal()` for browser-native focus trap
- `Escape` key closes dialog (native `<dialog>` behavior, confirmed in implementation)
- Focus returns to trigger element on close (`useRef` on trigger button)
- Props: `open`, `title`, `message`, `confirmLabel`, `onConfirm`, `onCancel`
- Confirm button: `bg-error-600` (destructive); Cancel: secondary style
- `aria-labelledby` on dialog, `aria-describedby` on message paragraph

### 6.4 `DataTable.tsx`
- Wraps `@tanstack/react-table` (`useReactTable`)
- Props:
  ```ts
  columns: ColumnDef<T>[]
  data: T[]
  isLoading?: boolean       // shows 5 skeleton rows
  onRowClick?: (row: T) => void
  ```
- Features: client-side sort (click header), pagination (10 / 25 / 50), loading skeletons
- Styled with `@theme` tokens via Tailwind v4

### 6.5 `ListPage.tsx`
- Pure layout — no logic
- Props:
  ```ts
  title: string
  subtitle?: string
  action?: React.ReactNode    // Add button slot
  filters?: React.ReactNode   // Filter bar slot
  children: React.ReactNode   // DataTable slot
  ```

### 6.6 `FormLayout.tsx`
- Client Component
- Props:
  ```ts
  title: string
  badge?: React.ReactNode
  isNew: boolean
  tabs: { id: string; label: string }[]
  activeTab: string
  onTabChange: (id: string) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  onDelete?: () => void
  onClose: () => void
  children: React.ReactNode
  ```
- Sticky top bar: title + badge + Delete + Close buttons
- Tab strip below header
- Scrollable content area
- Sticky bottom bar: Save (primary, disabled when `!isDirty || isSaving`) + Cancel

---

## 7. Driver List Page

### Route files
| File | Type | Purpose |
|---|---|---|
| `drivers/page.tsx` | Server Component | Reads URL search params, calls `getDrivers()`, renders `DriversListClient` |
| `drivers/loading.tsx` | Server | DataTable skeleton (5 rows, same column widths) |
| `drivers/error.tsx` | Client | Error message + Retry button |

### Data flow
```
URL search params (?name=&status=&branch=)
  → page.tsx (Server Component)
  → getDrivers(criteria) [lib/data/drivers.ts]
  → <DriversListClient data={drivers} />
```

### `DriversListClient.tsx`
- `'use client'`
- Filter state synced to URL via `useRouter` + `useSearchParams`
- Renders `<ListPage>` with `<DriverFilters>` in filter slot
- `<DataTable>` columns:

| Column | Source field | Notes |
|---|---|---|
| Driver Code | `driverCode` | Sortable |
| Name | `driverName` | Sortable |
| License No | `licenseNo` | — |
| License Expiry | `licenseExpiryDate` | Formatted `dd-MM-yyyy`; `text-error-600` if date is past |
| Status | `status` | Renders `<StatusBadge status={row.status}>` |
| Actions | — | Edit icon → `/master/drivers/[id]`; Delete icon → `<ConfirmDialog>` (hidden when status is `INACTIVE`) |

- Add Driver button → `/master/drivers/new`

### `DriverFilters.tsx`
- Fields: name text input + status select (All / Active / Inactive / On Leave / Terminated) + branch text input
- Search button submits; Reset button clears all
- `const STRINGS` at top for all labels

---

## 8. Driver Profile Page

### Route files
| File | Type | Purpose |
|---|---|---|
| `drivers/[id]/page.tsx` | Server Component | Fetches driver by id (`new` → empty defaults), renders `DriverProfileClient` |
| `drivers/[id]/loading.tsx` | Server | Form skeleton |
| `drivers/[id]/error.tsx` | Client | Not-found message + Back to list button |

### New driver defaults (`id === 'new'`)

```ts
const NEW_DRIVER_DEFAULTS: DriverFormValues = {
  driverCode:  '',
  driverName:  '',
  status:      'ACTIVE',    // sensible default
  // all other optional fields: undefined
}
```

### Data flow
```
params.id
  → page.tsx (Server Component)
  → id === 'new' ? NEW_DRIVER_DEFAULTS : getDriver(id) [lib/data/drivers.ts]
  → <DriverProfileClient driver={driver} isNew={id === 'new'} />
```

### `DriverProfileClient.tsx`
- `'use client'`
- `useForm<DriverFormValues>({ resolver: zodResolver(driverSchema), defaultValues: driver })`
- `useDriver(id)` for save / delete (client-side mock store)
- `<FormLayout>` with 3 tabs, `isDirty` from `formState.isDirty`
- Age: `useMemo(() => calcAge(dob), [dob])` — display only, not a form field
- **Save happy path:** `handleSubmit → useDriver.save() → toast.success('Saved') → reset(savedValues)`
- **Save error path:** catch block → `toast.error('Save failed, please try again')` — form remains dirty, user can retry
- **Delete:** `<ConfirmDialog>` → `useDriver.remove()` → `router.push('/master/drivers')`

### Tab breakdown

**General tab** (`GeneralSection.tsx`)
```
Row 1: Driver Code* | Driver Name*
Row 2: DOB [date] | Age (read-only display) | Position
Row 3: ID No | SS No | Status* [select]
Row 4: Date Hired [date] | Date Released [date] | Fuel Card No
Row 5: Standard Rate [number] | Overtime Rate [number]
Row 6: Remarks [textarea, full width]
--- Address ---
Row 7: Address 1 [full width]
Row 8: Address 2 [full width]
Row 9: State | Country [text, replaced with lookup later]
Row 10: Post Code | Phone
Row 11: Mobile | Email
```

**License tab** (`LicenseSection.tsx`)
```
Row 1: License No | License Expiry [date]
```
Room for future: license type, class, issuing authority.

**Emergency Contact tab** (`EmergencyContactSection.tsx`)
```
Row 1: Contact Person Name
Row 2: Mobile Phone Number
```
Room for future: relationship, alternate phone, notes.

---

## 9. Validation Rules

| Field | Rule |
|---|---|
| `driverCode` | Required |
| `driverName` | Required |
| `status` | Required, enum-constrained |
| `dateRelease` | Must be strictly after `dateHire` when both provided (zod `.refine()`) |
| `emailID` | Valid email or empty string (uses `z.union([z.string().email(), z.literal('')]).optional()`) |
| `dateHire` | Optional (draft-save allowed; Angular required this but was overly strict) |
| `licenseNo` | Optional (same rationale) |
| `licenseExpiryDate` | Optional (same rationale) |
| Age | Derived from DOB, display only, not validated |

Errors rendered inline below each field via `formState.errors[field]?.message`.

---

## 10. i18n Strategy

Every component file contains a `STRINGS` const at the top:

```ts
const STRINGS = {
  title: 'Drivers',
  addDriver: 'Add Driver',
  columns: { code: 'Driver Code', name: 'Name', ... },
  tabs: { general: 'General', license: 'License', emergency: 'Emergency Contact' },
  // ...
} as const
```

Migration path: replace `const STRINGS = { ... }` with `const t = useTranslations('drivers')` and rename `STRINGS.x` to `t('x')`. One-line change per file, no structural refactor needed.

---

## 11. Mock Data Shape (`lib/mock/drivers.ts`)

12 records covering all 4 status variants. Fields include realistic Thai/English names, valid license numbers, mixed expiry dates (some expired, some future). `driverID` values are integers (1–12). `branchID` defaults to `1` for all mock records. Exported as `MOCK_DRIVERS: Driver[]`.

---

## 12. API Swap Path

### Server-side data functions (`lib/data/drivers.ts`)

```ts
// List — swap mock filter for real fetch:
export async function getDrivers(criteria: DriverSearchCriteria): Promise<Driver[]> {
  // MOCK: return MOCK_DRIVERS.filter(...)
  // REAL: const res = await fetch(`${API_BASE}/api/master/driver/list`, {
  //         method: 'POST', body: JSON.stringify(criteria) })
  //       return (await res.json()).map(adaptDriverFromApi)
}

// Single — swap mock find for real fetch:
export async function getDriver(id: number): Promise<Driver | null> {
  // MOCK: return MOCK_DRIVERS.find(d => d.driverID === id) ?? null
  // REAL: const res = await fetch(`${API_BASE}/api/master/driver/${id}`)
  //       return adaptDriverFromApi(await res.json())
}
```

### Contact sub-object flattening

The Angular API wraps address fields in a nested `contact` object (`driver.contact.address1`, etc.). The adapter `adaptDriverFromApi` flattens these onto the root `Driver` object for the form. On save, `adaptDriverToApi` reconstructs the nested shape:

```ts
function adaptDriverToApi(driver: Driver) {
  const { address1, address2, state, countryCode, postCode,
          phoneNumber, faxNumber, emailID, ...rest } = driver
  return {
    ...rest,
    status: reverseStatusMap[driver.status],   // string → numeric lookupID
    contact: { address1, address2, state, countryCode, postCode,
               phoneNumber, faxNumber, emailID },
  }
}
```

### `branchID` source

The delete endpoint `DELETE /api/master/driver/{branchID}/{driverID}` and save payload both require `branchID`. In mock mode, `branchID = 1`. In production, `branchID` comes from the authenticated user's session (stored in auth context / cookie). The `useDriver` hook reads `branchID` from a `useSession()` call (to be wired when auth is added).

### All API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/master/driver/list` | List with search criteria |
| `GET` | `/api/master/driver/{driverID}` | Single driver |
| `POST` | `/api/master/driver/save` | Create / update |
| `DELETE` | `/api/master/driver/{branchID}/{driverID}` | Delete |

---

## 13. Out of Scope (This Spec)

- `/master/drivers/[id]/images` — photo upload gallery (separate TODO item)
- `imageName` field — present in API response, reserved for image gallery route
- i18n infrastructure setup — deferred to Phase 10
- Auth / session guard — deferred to infrastructure phase
- Branch lookup (filter field uses text input for now)
- Country select (text input for now, replaced with lookup later)
- Print button (present in Angular source, deferred)
