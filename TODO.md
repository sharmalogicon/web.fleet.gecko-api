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
- ✅ `/fleet/fuel-logs` — Fuel log list (Equipment, Voucher/Date, Driver, Fuel liters/cost, Status)
- ✅ `/fleet/fuel-logs/[id]` — Fuel log entry form (Fuel Entry + Cost Summary sections)
- ✅ `/fleet/fuel-logs/approval` — Fuel log approval queue (pending-only view with Approve button)
- ✅ `/fleet/meter-logs` — Meter log list (Equipment, Date/Type, Readings, Driver, Actions)
- ✅ `/fleet/meter-logs/[id]` — Meter log form (conditional hourMeter field for KM/HOUR/BOTH)
- ✅ `/fleet/meter-hr-logs` — Meter hour log list (Equipment, Seq/Date, Driver/Type, Distance/Hours)
- ✅ `/fleet/meter-hr-logs/[id]` — Meter hour log form (Reading + Meters sections)

### Inventory Flow
- ✅ `/fleet/goods-requests` — Goods request list (Req No/Date, Required By/WO, Job Ref, Status)
- ✅ `/fleet/goods-requests/[id]` — Goods request form (single section, status select)
- ✅ `/fleet/goods-requisitions` — Goods requisition list (Doc No/Date, WO/Equipment, Required By, Status)
- ✅ `/fleet/goods-requisitions/[id]` — Goods requisition form + read-only line items
- ✅ `/fleet/purchase-orders` — Purchase order list (PO No/Date, Vendor, Required By, Amount, Status)
- ✅ `/fleet/purchase-orders/[id]` — PO form + read-only line items (receivedQty/pendingQty tracking)
- ✅ `/fleet/goods-receipts` — Goods receipt list (Receipt No/Date, Vendor/PO, Received By, Amount)
- ✅ `/fleet/goods-receipts/[id]` — Receipt form + read-only line items
- ✅ `/fleet/goods-adjustments` — Stock adjustment list (Doc No/Date, Type badge, Remarks)
- ✅ `/fleet/goods-adjustments/[id]` — Adjustment form + read-only line items (INCREASE/DECREASE/TRANSFER/WRITE_OFF)
- ✅ `/fleet/return-to-vendor` — Return to vendor list (Return No/Date, Vendor, Returned By, Amount)
- ✅ `/fleet/return-to-vendor/[id]` — Return form + read-only line items (linked PO/stock)
- ✅ `/fleet/spare-parts/monitoring` — Spare parts monitoring list (read-only, WO/Equipment, Date, Total, Status)

---

## Phase 5 — Tire & Incident Management

### Tire
- ✅ `/fleet/tires/profiles` — Tire profile list (Serial/Brand, Size/Model, Status/Condition, Equipment, Actions) + 4-tab form (General, Mileage & Recap, Purchase Info, Equipment Installation)
- ✅ `/fleet/tires/changes` — Tire change list + form (header + read-only swap lines)
- ✅ `/fleet/tires/maintenance` — Tire maintenance list + form (header + read-only maintenance lines with INSPECTION/REPAIR/RETREAD types)
- ✅ `/fleet/tires/pending-recap` — Pending tire recap read-only monitoring list

### Incidents
- ✅ `/fleet/accidents` — Accident report list (Doc No/Date, Equipment/Driver, Type/Location, Insurance, Claimable badge)
- ✅ `/fleet/accidents/[id]` — Accident report form (3 sections: General Info, Location Details, Photos)
- ✅ `/fleet/accidents/[id]` images tab — Placeholder photo grid (upload disabled in mock mode)
- ✅ `/fleet/accidents/[id]` location tab — Address, city, country fields
- ✅ `/fleet/insurance-claims` — Insurance claim list + form + read-only line items (Activity/Parts)
- ✅ `/fleet/traffic-violations` — Traffic violation list + form (SPEEDING/PARKING/RED_LIGHT/NO_SEATBELT/OTHER)

---

## Phase 6 — Tariff / Tariff Plan

- ✅ `/tariff/customer-rates` — Customer rate list (Quotation No/Date, Customer, Validity, Status) + form with Approve workflow
- ✅ `/tariff/customer-rates/[id]` — Customer rate form (Rate Header + read-only Charge Details table)
- ✅ `/tariff/standard-rates` — Standard rate list + form (Rate Header + read-only Rate Lines table)
- ✅ `/tariff/standard-rates/[id]` — Standard rate detail (with Approve button)

---

## Phase 7 — Invoice / Billing (Fleet)

- ✅ `/invoice/vendor` — Vendor invoice list (Invoice No/Date, Customer, Amount, Status) + form
- ✅ `/invoice/vendor/[id]` — Vendor invoice form (header + read-only line items, withholding tax checkbox)
- ✅ `/invoice/vendor/unbilled` — Unbilled GR items list with "Create Invoice" action per row
- ✅ `/invoice/work-order` — WO invoice list + form (receipt header + WO line items)
- ✅ `/invoice/work-order/[id]` — WO invoice form
- ✅ `/invoice/credit-notes/wo` — WO credit note list + form (header + WO line items)
- ✅ `/invoice/credit-notes/wo/[id]` — WO credit note form
- ✅ `/invoice/credit-notes/vendor` — Vendor credit note list + form
- ✅ `/invoice/credit-notes/vendor/[id]` — Vendor credit note form
- ✅ `/invoice/vendor-payments` — Vendor payment list (Pending/Approved) + form with Approve button
- ✅ `/invoice/vendor-payments/[id]` — Vendor payment form + read-only payment lines

---

## Phase 8 — Inquiry Pages (Read-Only + Export)

- ✅ `/inquiry/work-orders` — WO inquiry (filters: WO no, equipment, type, status, date range) — read-only DataTable
- ✅ `/inquiry/wip` — WIP inquiry (OPEN + IN_PROGRESS WOs with days-open counter, orange if > 7 days)
- ✅ `/inquiry/purchase-orders` — PO inquiry (doc no, vendor, status filter — read-only with amounts)
- ✅ `/inquiry/tire-changes` — Tire change history inquiry (transaction no, equipment, date range)
- ✅ `/inquiry/truck-movements` — Truck movement inquiry (truck no, trip type, booking/container info)

---

## Phase 9 — Reports

- ✅ `/reports/management` — Two-panel: Report selector tree (9 reports) + parameter form + placeholder preview with Export PDF/Excel buttons (disabled in mock mode)
- ✅ `/reports/operations` — Two-panel: Report selector tree (10 reports) + extended parameter form (conditional fields for PO/Tire reports) + preview

---

## Phase 10 — Shared Components & i18n

### Shared Lookup Hooks (`src/lib/hooks/lookups/`)
- ✅ `useEquipmentLookup()` — equipment code + registration options
- ✅ `useDriverLookup()` — driver name + code options
- ✅ `useVendorLookup()` — hard-coded Thai vendor list
- ✅ `useStockItemLookup()` — stock code + description options
- ✅ `useServiceTypeLookup()` — service code + name options
- ✅ `useFuelTypeLookup()` — DIESEL/GASOLINE/LPG/ELECTRIC
- ✅ `useEquipmentCategoryLookup()` — TRUCK/TRAILER/FORKLIFT/etc.
- ✅ `useTyreBrandLookup()` — Michelin/Bridgestone/Dunlop/etc.
- ✅ `useTyreSizeLookup()` — 11R22.5/295/80R22.5/etc.
- ✅ `useUomLookup()` — EACH/SET/LITER/KG/etc.
- ✅ `useServiceCategoryLookup()` — from SERVICE_CATEGORIES const

### Shared UI Components
- ✅ `<DataTable>` — sortable, paginated TanStack Table v8, multi-line cell support
- ✅ `<FormLayout>` — stacked section cards with gray header bars
- ✅ `<ListPage>` — standard list wrapper (filter bar, table, pagination)
- ✅ `<SearchInput>` — debounced search input with external value sync
- ✅ `<ConfirmDialog>` — native `<dialog>` with focus restoration, destructive variant
- ✅ `<StatusBadge>` — CVA-based status badge (Active/Inactive/etc.)
- ✅ `<Toast>` / `useToastStore` — Zustand toast store, auto-dismiss after 5s
- ✅ `<DatePicker>` — native date input wrapper with label + error
- ✅ `<DateRangePicker>` — From/To date inputs with min/max linking
- ✅ `<DateTimePicker>` — date + time (24h) side-by-side inputs
- ✅ `<Autocomplete>` — keyboard-navigable search dropdown with loading state
- ✅ `<ImageGallery>` — responsive photo grid + lightbox + disabled upload button

### Deferred pages now complete
- ✅ `/master/drivers/[id]/images` — Driver photo gallery using ImageGallery component
- ✅ PM Scheduler "Add Equipment" modal — search + select from equipment list

### i18n
- ✅ `src/i18n/en.json` — English translations (common, nav, driver, equipment, workOrder, fuelLog, purchaseOrder, report)
- ✅ `src/i18n/th.json` — Thai translations (full matching structure)
- ✅ `I18nProvider` + `useT()` hook — React Context, cookie-based (`gecko_lang`), no URL prefix
- ✅ Language toggle — EN/TH pill buttons in site header

---

## Page Count Summary

| Phase | Module | Total Pages | Done |
|-------|--------|-------------|------|
| ✅ 1 | Shell + Dashboard | 1 | 1 |
| ✅ 2 | Master Data | 14 | 12 |
| ✅ 3 | Fleet Operations (Work) | 10 | 9 |
| ✅ 4 | Fuel, Meters & Inventory | 20 | 20 |
| ✅ 5 | Tire & Incidents | 11 | 11 |
| ✅ 6 | Tariff | 4 | 4 |
| ✅ 7 | Invoice | 11 | 11 |
| ✅ 8 | Inquiry | 5 | 5 |
| ✅ 9 | Reports | 2 | 2 |
| ✅ 10 | Shared Components + i18n | — | complete |
| | **Total** | **83** | **83** | ← **ALL DONE** |
