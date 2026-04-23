# Fleet Migration TODO
## Angular → Next.js 14+ (Gecko Design System)

> **Source:** `D:\SHARMA\PROJECT\DMS PROJECT 08102022\dms.web\dms.web\src`
> **Target:** `D:\SHARMA\PROJECT\gecko\web.fleet.gecko-api`
> **Design System CSS:** `D:\SHARMA\PROJECT\gecko\design-system\gecko-design-system.css`
> **Reference Project:** `D:\SHARMA\PROJECT\gecko\EDI\app.gecko-api` (same structure/patterns)

**Legend:** ✅ Done · 🔄 In Progress · ⬜ Not Started

---

## Infrastructure & Shell
- ✅ Next.js 14 project setup (App Router, TypeScript, Tailwind v4)
- ✅ Gecko theme (colors, fonts, CSS tokens)
- ✅ Sidebar navigation (collapsible, 11 fleet groups, 50+ links)
- ✅ Header (breadcrumbs, search, notifications)
- ✅ Dashboard layout shell
- ✅ Fleet Dashboard page (KPIs, Quick Actions, Recent WOs, Fleet Status, PM Schedule)
- ✅ Shared UI: Card, Badge, StatCard
- ✅ Zustand UI store (sidebar collapse persisted)
- ⬜ i18n setup (next-intl, no URL prefix, EN + TH JSON files)
- ⬜ Auth (login page, session guard on dashboard layout)
- ⬜ React Query provider + API client base (`lib/api/client.ts`)

---

## Phase 2 — Master Data

### Driver
- ✅ `/master/drivers` — Driver list (multi-line DataTable: Driver, License, Contact, Status, Actions)
- ✅ `/master/drivers/[id]` — Driver profile form (tabs: General, License, Emergency Contact)
- ⬜ `/master/drivers/[id]/images` — Driver photo upload & gallery (deferred)

### Equipment
- ✅ `/master/equipment` — Equipment list (multi-line DataTable: Equipment, Category/Brand, Meter, Status, Actions)
- ✅ `/master/equipment/[id]` — Equipment profile (tabs: General, Spec, Details)
- ✅ `/master/equipment-types` — Equipment type & size list (DataTable: Type/Size, ISO/TEU, Gross/Tare, Flags, Actions)
- ✅ `/master/equipment-types/[id]` — Equipment type detail form

### Stock
- ✅ `/master/stock` — Stock profile list (multi-line DataTable: Item, Category/Brand, Qty/Reorder, Price, Actions)
- ✅ `/master/stock/[id]` — Stock profile form (tabs: General, Reorder, Pricing)
- ✅ `/master/stock-labor-prices` — Stock & labor price overview (markup stats + labor rate table)
- ⬜ `/master/stock-labor-prices/[id]/markup` — Labor markup detail (deferred)

### Other Master
- ✅ `/master/transporters` — Transporter list (DataTable: Name/RegNo, Contact, Status, Actions)
- ✅ `/master/transporters/[id]` — Transporter registration form

---

## Phase 3 — Fleet Operations: Work Management

### Work Request
- ✅ `/fleet/work-requests` — Work request list (multi-line DataTable: WR/Equip, Requested By, Date/Priority, Status, Actions)
- ✅ `/fleet/work-requests/[id]` — Work request form (tabs: General, Description)

### Work Order
- ✅ `/fleet/work-orders` — Work order list (multi-line DataTable: WO/Equip, Type/Service, Scheduled, Status/Priority, Actions)
- ✅ `/fleet/work-orders/[id]` — Work order form (tabs: General, Services, Parts, Labor)
- ✅ `/fleet/work-orders/monitoring` — WO monitoring Kanban board (Open/In Progress/Completed/Invoiced columns)

### PM Scheduler
- ✅ `/fleet/pm-scheduler` — PM scheduler list (DataTable: Schedule, Interval, Next Due, Status, Actions)
- ✅ `/fleet/pm-scheduler/[id]` — PM schedule form (tabs: Schedule Details, Equipment, Services)
- ⬜ Modal: Add equipment to PM popup (deferred)

### Service Type
- ✅ `/fleet/service-types` — Service type list (DataTable: Code/Service, Category/Status, Duration/Notify, Actions)
- ✅ `/fleet/service-types/[id]` — Service type form (General + PM notification settings)

---

## Phase 4 — Fleet Operations: Fuel, Meters & Inventory

### Fuel & Meters
- ⬜ `/fleet/fuel-logs` — Fuel log list (DataTable: equipment, date, liters, driver, station)
- ⬜ `/fleet/fuel-logs/[id]` — Fuel log entry form
- ⬜ `/fleet/fuel-logs/approval` — Fuel log approval queue
- ⬜ `/fleet/meter-logs` — Meter log list
- ⬜ `/fleet/meter-logs/[id]` — Meter log entry form
- ⬜ `/fleet/meter-hr-logs` — Meter hour log
- ⬜ `/fleet/meter-hr-logs/[id]` — Meter hour log detail

### Inventory Flow
- ⬜ `/fleet/goods-requests` — Goods request list
- ⬜ `/fleet/goods-requests/[id]` — Goods request form
- ⬜ `/fleet/goods-requisitions` — Goods requisition list
- ⬜ `/fleet/goods-requisitions/[id]` — Goods requisition form + line items + modal
- ⬜ `/fleet/purchase-orders` — Purchase order list
- ⬜ `/fleet/purchase-orders/[id]` — PO form + line items detail + add-items modal
- ⬜ `/fleet/goods-receipts` — Goods receipt list
- ⬜ `/fleet/goods-receipts/[id]` — Receipt form + line items + select-PO-lines modal
- ⬜ `/fleet/goods-adjustments` — Stock adjustment list
- ⬜ `/fleet/goods-adjustments/[id]` — Adjustment form + lines + item modal
- ⬜ `/fleet/return-to-vendor` — Return to vendor list
- ⬜ `/fleet/return-to-vendor/[id]` — Return form + lines + item modal
- ⬜ `/fleet/spare-parts/monitoring` — Spare parts monitoring list

---

## Phase 5 — Tire & Incident Management

### Tire
- ⬜ `/fleet/tires/profiles` — Tire profile list/form
- ⬜ `/fleet/tires/changes/[id]` — Tire change record
- ⬜ `/fleet/tires/maintenance/[id]` — Tire maintenance record
- ⬜ `/fleet/tires/pending-recap` — Pending tire recap list

### Incidents
- ⬜ `/fleet/accidents` — Accident report list
- ⬜ `/fleet/accidents/[id]` — Accident report form
- ⬜ `/fleet/accidents/[id]/images` — Accident photo gallery
- ⬜ `/fleet/accidents/[id]/location` — Accident location (map/address)
- ⬜ `/fleet/insurance-claims` — Insurance claim list
- ⬜ `/fleet/insurance-claims/[id]` — Insurance claim form + detail lines
- ⬜ `/fleet/traffic-violations/[id]` — Traffic violation record

---

## Phase 6 — Tariff / Tariff Plan

- ⬜ `/tariff/customer-rates` — Customer rate list (DataTable: customer, effective date, status)
- ⬜ `/tariff/customer-rates/[id]` — Customer rate header form
- ⬜ `/tariff/customer-rates/[id]/details` — Rate line items (editable table)
- ⬜ `/tariff/standard-rates` — Standard rate list/form
- ⬜ `/tariff/standard-rates/[id]` — Standard rate detail breakdown

---

## Phase 7 — Invoice / Billing (Fleet)

- ⬜ `/invoice/vendor` — Vendor invoice list (DataTable: invoice no, vendor, amount, status)
- ⬜ `/invoice/vendor/[id]` — Vendor invoice header form
- ⬜ `/invoice/vendor/[id]/detail` — Invoice line items table
- ⬜ Modal: Select WO lines popup (link WO to vendor invoice)
- ⬜ `/invoice/vendor/unbilled` — Unbilled vendor invoices list
- ⬜ `/invoice/work-order/[id]` — WO invoice view
- ⬜ `/invoice/credit-notes/wo/[id]` — WO credit note
- ⬜ `/invoice/credit-notes/vendor/[id]` — Vendor credit note
- ⬜ `/invoice/vendor-payments/[id]` — Vendor payment detail

---

## Phase 8 — Inquiry Pages (Read-Only + Export)

- ⬜ `/inquiry/work-orders` — Work order inquiry (filters: date range, equipment, status)
- ⬜ `/inquiry/wip` — Work in progress inquiry
- ⬜ `/inquiry/purchase-orders` — Purchase order inquiry
- ⬜ `/inquiry/tire-changes` — Tire change history inquiry
- ⬜ `/inquiry/truck-movements` — Truck movement inquiry

---

## Phase 9 — Reports

- ⬜ `/reports/management` — Management report viewer (type selector + date params)
- ⬜ Modal: Report parameter dialog (date range, equipment filter, export format)
- ⬜ `/reports/operations` — Operation report viewer

---

## Phase 10 — Shared Components & i18n

### Shared Lookup Hooks (used across all forms)
- ⬜ `useEquipmentSearch()` — autocomplete for equipment code
- ⬜ `useDriverSearch()` — autocomplete for driver name
- ⬜ `useVendorSearch()` — autocomplete for vendor
- ⬜ `useStockItemSearch()` — autocomplete for stock items
- ⬜ `useDocumentStatusLookup()` — select dropdown
- ⬜ `useFuelTypeLookup()` — select dropdown
- ⬜ `useEquipmentCategoryLookup()` — select dropdown
- ⬜ `useTyreBrandLookup()` — select dropdown
- ⬜ `useTyreSizeLookup()` — select dropdown
- ⬜ `useUomLookup()` — unit of measure dropdown
- ⬜ `useServiceTypeCategoryLookup()` — select dropdown

### Shared UI Components (build once, reuse)
- ✅ `<DataTable>` — sortable, paginated TanStack Table v8, multi-line cell support
- ✅ `<FormLayout>` — stacked section cards with gray header bars
- ✅ `<ListPage>` — standard list wrapper (filter bar, table, pagination)
- ✅ `<SearchInput>` — debounced search input with external value sync
- ✅ `<ConfirmDialog>` — native `<dialog>` with focus restoration, destructive variant
- ✅ `<StatusBadge>` — CVA-based status badge (Active/Inactive/etc.)
- ✅ `<Toast>` / `useToastStore` — Zustand toast store, auto-dismiss after 5s
- ⬜ `<DatePicker>` — single date picker
- ⬜ `<DateRangePicker>` — date range filter
- ⬜ `<DateTimePicker>` — date + time picker (24h)
- ⬜ `<Autocomplete>` — async search dropdown with loading state
- ⬜ `<ImageGallery>` — photo upload + lightbox

### i18n
- ⬜ `messages/en.json` — all English strings (all modules)
- ⬜ `messages/th.json` — all Thai strings (all modules)
- ⬜ Language toggle component (in header, cookie-based, no URL change)

---

## Page Count Summary

| Phase | Module | Total Pages | Done |
|-------|--------|-------------|------|
| ✅ 1 | Shell + Dashboard | 1 | 1 |
| ✅ 2 | Master Data | 14 | 12 |
| ✅ 3 | Fleet Operations (Work) | 10 | 9 |
| ⬜ 4 | Fuel, Meters & Inventory | 20 | 0 |
| ⬜ 5 | Tire & Incidents | 11 | 0 |
| ⬜ 6 | Tariff | 5 | 0 |
| ⬜ 7 | Invoice | 9 | 0 |
| ⬜ 8 | Inquiry | 5 | 0 |
| ⬜ 9 | Reports | 3 | 0 |
| ⬜ 10 | Shared Components + i18n | — | partial |
| | **Total** | **78** | **22** |
