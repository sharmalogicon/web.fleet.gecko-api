# Fleet Module Migration Plan
## Angular → Next.js 14+ (Gecko Design System)

**Source:** `D:\SHARMA\PROJECT\DMS PROJECT 08102022\dms.web\dms.web\src`
**Target:** `D:\SHARMA\PROJECT\gecko\web.fleet.gecko-api`
**Framework:** Next.js 14+ (App Router) with Gecko Design System
**i18n:** next-intl (JSON language files, no URL prefixes like /en or /th)
**State:** React Query + Zustand

---

## Scope: Fleet-Related Pages Only

This migration covers **5 modules** that constitute the Fleet management system:
1. Master Data (fleet-relevant entities)
2. Tariff / Tariff Plan
3. Invoice / Billing (fleet-specific)
4. Inquiry (fleet-specific)
5. Reports (fleet-related)
6. Fleet Operations (core fleet module)

---

## Module 1: Master Data (Fleet-Relevant)

These master data pages from the Angular `master` module are required by fleet operations.

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 1 | `driver/driver-list` | `/master/drivers` | Driver list with search |
| 2 | `driver/driver-profile` | `/master/drivers/[id]` | Driver profile form (General, License, etc.) |
| 3 | `driver/driver-image` | `/master/drivers/[id]/images` | Driver photo management |
| 4 | `equipment-profile-new/equipment-profile-newlist` | `/master/equipment` | Equipment list |
| 5 | `equipment-profile-new/equipment-profile-new` | `/master/equipment/[id]` | Equipment profile (tabbed: General, Spec, Details) |
| 6 | `equipment-profile-new/equipment-profile-add-details` | embedded in `/master/equipment/[id]` | Equipment additional details sub-panel |
| 7 | `equipment-profile-general` | `/master/equipment/[id]/general` | Equipment general info |
| 8 | `equipment-profile-spec` | `/master/equipment/[id]/spec` | Equipment specifications |
| 9 | `equipment-type-size` | `/master/equipment-types` | Equipment type & size list |
| 10 | `equipment-type-size-detail` | `/master/equipment-types/[id]` | Equipment type detail form |
| 11 | `stockprofile/stock-profile-general` | `/master/stock/[id]` | Stock profile general |
| 12 | `stockprofile/stock-ledger` | `/master/stock/[id]/ledger` | Stock ledger view |
| 13 | `stockprofile/stock-location` | `/master/stock/[id]/location` | Stock location management |
| 14 | `stockprofile/vendor-info` | `/master/stock/[id]/vendor` | Stock vendor information |
| 15 | `stock-labor-price/stock-labor-price` | `/master/stock-labor-prices` | Stock & labor price list |
| 16 | `stock-labor-price/labor-markup` | `/master/stock-labor-prices/[id]/markup` | Labor markup detail |
| 17 | `transporter-registration` | `/master/transporters` | Transporter registration list/form |
| 18 | `work-request` (master) | `/master/work-requests` | Work request master list |

### Master Data — Gecko Components
- `<DataTable>` for all list pages with pagination, sorting, column filters
- `<Card>` with `<TabGroup>` for profile forms (General / Spec / Details tabs)
- `<Autocomplete>` for equipment code, driver, vendor lookups
- `<FileUpload>` / `<ImageGallery>` for driver/equipment images
- `<Button variant="primary">` Save, `<Button variant="outlined">` Cancel/Back

---

## Module 2: Tariff / Tariff Plan

Source module: `tariffplan/components`

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 1 | `customer-rete-list/customer-rate-list` | `/tariff/customer-rates` | Customer rate list |
| 2 | `customer-rate/customer-rate` | `/tariff/customer-rates/[id]` | Customer rate header form |
| 3 | `customer-rate-details/customer-rate-details` | `/tariff/customer-rates/[id]/details` | Customer rate line items detail |
| 4 | `standard-rate/standard-rate` | `/tariff/standard-rates` | Standard rate form/list |
| 5 | `standard-rate-details/standard-rate-details` | `/tariff/standard-rates/[id]` | Standard rate detail breakdown |

### Tariff — Gecko Components
- `<DataTable>` for rate lists with editable inline rows
- `<Select>` for equipment category, charge code lookups
- `<Input type="number">` for rate amounts
- `<DatePicker>` for effective date / expiry date
- `<Card>` for header + detail layout (master-detail pattern)

---

## Module 3: Invoice / Billing (Fleet-Specific)

Fleet invoicing lives across two Angular modules: `fleet/components` (vendor-side) and `billing/components` (customer-side). Include only fleet-relevant billing.

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 1 | `fleet/vendor-invoice/vendor-invoice-list` | `/invoice/vendor/list` | Vendor invoice list |
| 2 | `fleet/vendor-invoice/vendor-invoice` | `/invoice/vendor/[id]` | Vendor invoice header |
| 3 | `fleet/vendor-invoice/vendor-invoice-detail` | `/invoice/vendor/[id]/detail` | Vendor invoice line items |
| 4 | `fleet/vendor-invoice/vendor-invoice-popup` | modal in `/invoice/vendor/[id]` | Work order line selection popup |
| 5 | `fleet/unbilled-vendor-invoice` | `/invoice/vendor/unbilled` | Unbilled vendor invoices list |
| 6 | `fleet/wo-invoice` | `/invoice/work-order/[id]` | Work order invoice |
| 7 | `fleet/wo-credit-note` | `/invoice/credit-notes/wo/[id]` | WO credit note |
| 8 | `fleet/vendor-credit-note` | `/invoice/credit-notes/vendor/[id]` | Vendor credit note |
| 9 | `fleet/credit-note/credit-note-vendor-inovice` | `/invoice/credit-notes/vendor-invoice/[id]` | Credit note linked to vendor invoice |
| 10 | `billing/vendor-payment-detail` | `/invoice/vendor-payments/[id]` | Vendor payment detail |

### Invoice — Gecko Components
- `<DataTable>` for invoice line items (editable amounts, quantities)
- `<Card>` for invoice header (document no, date, vendor, total)
- `<Modal>` for work order / PO selection popup
- `<Badge>` for document status (Draft / Posted / Cancelled)
- `<Button>` for Post, Print, Cancel actions
- `<Input readonly>` for computed totals

---

## Module 4: Inquiry (Fleet-Specific)

Source module: `inquiry/components` — fleet-relevant inquiries only.

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 1 | `workorderinquiry/workorderinquiry` | `/inquiry/work-orders` | Work order inquiry with filters |
| 2 | `work-in-progress-inquiry/work-in-progress-inquiry` | `/inquiry/wip` | Work in progress inquiry |
| 3 | `purchase-order-inquiry/purchase-order-inquiry` | `/inquiry/purchase-orders` | Purchase order inquiry |
| 4 | `tire-change-inquiry/tire-change-inquiry` | `/inquiry/tire-changes` | Tire change history inquiry |
| 5 | `truck-movement-inquiry/truck-movement-inquiry` | `/inquiry/truck-movements` | Truck movement inquiry |

### Inquiry — Gecko Components
- `<DataTable>` read-only with export (Excel/PDF)
- `<DateRangePicker>` for date filter range
- `<Select>` / `<Autocomplete>` for equipment, driver, status filters
- `<Button variant="outlined">` for Search, Reset, Export
- `<Card>` as filter panel + results panel layout

---

## Module 5: Reports (Fleet-Related)

Source module: `reports/components`

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 1 | `management-reports/management-reports` | `/reports/management` | Management report selection & viewer |
| 2 | `management-reports/management-reports-dialog` | modal in `/reports/management` | Report parameter dialog |
| 3 | `operation-reports/operation-reports` | `/reports/operations` | Operational report selection & viewer |

### Reports — Gecko Components
- `<Select>` for report type selection
- `<Modal>` / `<Dialog>` for report parameter input
- `<DateRangePicker>` for report period
- `<Button variant="primary">` Generate, `<Button variant="outlined">` Export
- PDF viewer embed or download trigger

---

## Module 6: Fleet Operations (Core Fleet Module)

Source module: `fleet/components` — all operational transactions.

### 6.1 Work Management

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 1 | `work-request/work-request-list` | `/fleet/work-requests` | Work request list |
| 2 | `work-request/work-request` | `/fleet/work-requests/[id]` | Work request form |
| 3 | `work-order/work-order-list` | `/fleet/work-orders` | Work order list |
| 4 | `work-order/work-order` | `/fleet/work-orders/[id]` | Work order form (tabs: General, Parts, Labor, Service) |
| 5 | `wo-monitoring/wo-monitoring` | `/fleet/work-orders/monitoring` | WO monitoring dashboard |
| 6 | `woi-vi-popup` | modal in WO pages | WO / Vendor Invoice link popup |

### 6.2 PM Scheduler

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 7 | `pm-scheduler/pm-scheduler-list` | `/fleet/pm-scheduler` | PM scheduler list |
| 8 | `pm-scheduler/pm-scheduler` | `/fleet/pm-scheduler/[id]` | PM scheduler form |
| 9 | `pm-scheduler/pm-scheduler-details` | `/fleet/pm-scheduler/[id]/details` | PM schedule details |
| 10 | `pm-scheduler/pm-scheduler-add-popup` | modal | Add equipment popup |
| 11 | `pm-scheduler/pm-inspection-eqp-details` | sub-panel | Equipment inspection sub-panel |
| 12 | `pm-scheduler/pm-labor-details` | sub-panel | Labor details sub-panel |
| 13 | `pm-scheduler/pm-part-details` | sub-panel | Parts sub-panel |
| 14 | `pm-scheduler/pm-service-details` | sub-panel | Service type sub-panel |

### 6.3 Fuel & Meter Logs

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 15 | `fuel-log/fuel-log-list` | `/fleet/fuel-logs` | Fuel log list |
| 16 | `fuel-log/fuel-log` | `/fleet/fuel-logs/[id]` | Fuel log entry form |
| 17 | `fuel-log-approval/fuel-log-approval` | `/fleet/fuel-logs/approval` | Fuel log approval queue |
| 18 | `meter-log/meter-log-list` | `/fleet/meter-logs` | Meter log list |
| 19 | `meter-log/meter-log` | `/fleet/meter-logs/[id]` | Meter log entry form |
| 20 | `meter-hr-log/meter-hr-log` | `/fleet/meter-hr-logs` | Meter hour log |
| 21 | `meter-hr-log/meter-log-detail` | `/fleet/meter-hr-logs/[id]` | Meter hour log detail |

### 6.4 Inventory / Stock

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 22 | `goods-request/goods-request-list` | `/fleet/goods-requests` | Goods request list |
| 23 | `goods-request/goods-request` | `/fleet/goods-requests/[id]` | Goods request form |
| 24 | `goods-requisition/goods-requisition-list` | `/fleet/goods-requisitions` | Goods requisition list |
| 25 | `goods-requisition/goods-requisition` | `/fleet/goods-requisitions/[id]` | Goods requisition form |
| 26 | `goods-requisition/goods-requisition-detail` | sub-panel | Requisition line items |
| 27 | `goods-requisition/goods-requisitionpopup` | modal | Add items popup |
| 28 | `purchase-order/purchase-order-list` | `/fleet/purchase-orders` | Purchase order list |
| 29 | `purchase-order/purchase-order` | `/fleet/purchase-orders/[id]` | Purchase order form |
| 30 | `purchase-order/purchase-order-detail` | sub-panel | PO line items detail |
| 31 | `purchase-order/purchase-order-add-list` | modal | Add items to PO popup |
| 32 | `goods-receive/goods-receive-list` | `/fleet/goods-receipts` | Goods receipt list |
| 33 | `goods-receive/goods-receive` | `/fleet/goods-receipts/[id]` | Goods receipt form |
| 34 | `goods-receive/goods-receive-detail` | sub-panel | Receipt line items |
| 35 | `goods-receive/goods-receive-popup` | modal | Select PO lines popup |
| 36 | `goods-adjustment/goods-adjustment-list` | `/fleet/goods-adjustments` | Stock adjustment list |
| 37 | `goods-adjustment/goods-adjustment` | `/fleet/goods-adjustments/[id]` | Stock adjustment form |
| 38 | `goods-adjustment/goods-adjustment-detail` | sub-panel | Adjustment detail lines |
| 39 | `goods-adjustment/goods-adjustment-popup` | modal | Item selection popup |
| 40 | `return-roods-to-vendor/return-goods-list` | `/fleet/return-to-vendor` | Return to vendor list |
| 41 | `return-roods-to-vendor/return-goods-to-vendor` | `/fleet/return-to-vendor/[id]` | Return form |
| 42 | `return-roods-to-vendor/return-goods-to-vendor-details` | sub-panel | Return line items |
| 43 | `return-roods-to-vendor/return-goods-add-list` | modal | Select items popup |
| 44 | `spare-parts/spare-part-monitoring-list` | `/fleet/spare-parts/monitoring` | Spare parts monitoring |

### 6.5 Tire Management

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 45 | `tire-profile` | `/fleet/tires/profiles` | Tire profile list/form |
| 46 | `tire-change` | `/fleet/tires/changes/[id]` | Tire change record |
| 47 | `tire-maintenance` | `/fleet/tires/maintenance/[id]` | Tire maintenance record |
| 48 | `pending-tire-recap/pending-tire-recap` | `/fleet/tires/pending-recap` | Pending tire recap list |

### 6.6 Incidents & Insurance

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 49 | `accident-report/accident-report-list` | `/fleet/accidents` | Accident report list |
| 50 | `accident-report/accident-report` | `/fleet/accidents/[id]` | Accident report form |
| 51 | `accident-report/accident-images` | `/fleet/accidents/[id]/images` | Accident photos |
| 52 | `accident-report/accident-location` | `/fleet/accidents/[id]/location` | Accident location map |
| 53 | `insurance-claim/insurance-claim-list` | `/fleet/insurance-claims` | Insurance claim list |
| 54 | `insurance-claim/insurance-claim` | `/fleet/insurance-claims/[id]` | Insurance claim form |
| 55 | `insurance-claim/insurance-claim-detail` | sub-panel | Claim detail |
| 56 | `insurance-claim/insurance-claim-add-list` | modal | Add items to claim |
| 57 | `traffic-violation` | `/fleet/traffic-violations/[id]` | Traffic violation record |

### 6.7 Service & Other

| # | Angular Component | Next.js Route | Description |
|---|-------------------|---------------|-------------|
| 58 | `service-type/service-type-list` | `/fleet/service-types` | Service type list |
| 59 | `service-type/service-type` | `/fleet/service-types/[id]` | Service type form |

---

## Custom Components → Shared Dropdowns

The Angular `fleet/customcomponents` are dropdown/autocomplete lookup components. In Next.js, these become **shared Zustand-cached lookup hooks** + Gecko `<Select>` / `<Autocomplete>` components.

| Angular Custom Component | Next.js Implementation |
|--------------------------|----------------------|
| `country` | `useCountryLookup()` + `<Select>` |
| `currency` | `useCurrencyLookup()` + `<Select>` |
| `discount-type` | `useDiscountTypeLookup()` + `<Select>` |
| `document-status` | `useDocumentStatusLookup()` + `<Select>` |
| `driver-status` | `useDriverStatusLookup()` + `<Select>` |
| `equipment-category` | `useEquipmentCategoryLookup()` + `<Select>` |
| `equipmentstatus` | `useEquipmentStatusLookup()` + `<Select>` |
| `fuel-type` | `useFuelTypeLookup()` + `<Select>` |
| `location` | `useLocationLookup()` + `<Autocomplete>` |
| `metertype` | `useMeterTypeLookup()` + `<Select>` |
| `ordertype` | `useOrderTypeLookup()` + `<Select>` |
| `ownership` | `useOwnershipLookup()` + `<Select>` |
| `priority-type` | `usePriorityTypeLookup()` + `<Select>` |
| `responsibility` | `useResponsibilityLookup()` + `<Select>` |
| `search` (equipment code) | `useEquipmentCodeSearch()` + `<Autocomplete>` |
| `service-type-category` | `useServiceTypeCategoryLookup()` + `<Select>` |
| `stock-brand` | `useStockBrandLookup()` + `<Select>` |
| `stock-category` | `useStockCategoryLookup()` + `<Select>` |
| `stock-type` | `useStockTypeLookup()` + `<Select>` |
| `tyre-brand` | `useTyreBrandLookup()` + `<Select>` |
| `tyre-condition` | `useTyreConditionLookup()` + `<Select>` |
| `tyre-status` | `useTyreStatusLookup()` + `<Select>` |
| `tyre-transaction` | `useTyreTransactionLookup()` + `<Select>` |
| `tyresize` | `useTyreSizeLookup()` + `<Select>` |
| `uom` | `useUomLookup()` + `<Select>` |
| `usertype` | `useUserTypeLookup()` + `<Select>` |
| `vendor-category` | `useVendorCategoryLookup()` + `<Select>` |
| `violation-type` | `useViolationTypeLookup()` + `<Select>` |
| `warranty-period` | `useWarrantyPeriodLookup()` + `<Select>` |
| `driver-search` | `useDriverSearch()` + `<Autocomplete>` |

---

## Next.js Project Structure (No Subfolders in Root)

All files are placed directly in `D:\SHARMA\PROJECT\gecko\web.fleet.gecko-api` — no subfolders are created at the root level. The Next.js App Router convention creates the internal `app/`, `components/`, `lib/` structure.

```
web.fleet.gecko-api/
├── Claude.md                    ← existing
├── MIGRATION_PLAN.md            ← this file
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── middleware.ts                ← i18n middleware (next-intl)
├── app/
│   ├── layout.tsx               ← Root layout with i18n provider
│   ├── page.tsx                 ← Dashboard/home redirect
│   ├── master/
│   │   ├── drivers/
│   │   ├── equipment/
│   │   ├── stock/
│   │   └── ...
│   ├── tariff/
│   │   ├── customer-rates/
│   │   └── standard-rates/
│   ├── invoice/
│   │   ├── vendor/
│   │   └── credit-notes/
│   ├── inquiry/
│   │   ├── work-orders/
│   │   ├── purchase-orders/
│   │   └── ...
│   ├── reports/
│   │   ├── management/
│   │   └── operations/
│   └── fleet/
│       ├── work-orders/
│       ├── work-requests/
│       ├── pm-scheduler/
│       ├── fuel-logs/
│       ├── meter-logs/
│       ├── goods-requests/
│       ├── goods-requisitions/
│       ├── purchase-orders/
│       ├── goods-receipts/
│       ├── goods-adjustments/
│       ├── return-to-vendor/
│       ├── spare-parts/
│       ├── tires/
│       ├── accidents/
│       ├── insurance-claims/
│       ├── traffic-violations/
│       └── service-types/
├── components/
│   ├── shared/                  ← Reusable UI components
│   └── lookups/                 ← Autocomplete/Select hooks
├── lib/
│   ├── api/                     ← React Query fetchers
│   ├── store/                   ← Zustand stores
│   └── i18n/                    ← next-intl config
└── messages/
    ├── en.json                  ← English strings
    └── th.json                  ← Thai strings
```

---

## i18n Strategy

Per Claude.md: use JSON language files, **no URL prefixes** (`/en`, `/th`).

```typescript
// middleware.ts — detect locale from browser/cookie only
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'th'],
  defaultLocale: 'en',
  localeDetection: true,
  localePrefix: 'never',   // ← no /en or /th in URL
});
```

**JSON key structure** (one file per language):
```json
// messages/en.json
{
  "fleet": {
    "workOrder": {
      "title": "Work Order",
      "documentNo": "Document No.",
      "woRequestNo": "WO Request No.",
      "orderDateTime": "Order Date Time",
      "startDate": "Start Date",
      "partsTotal": "Parts Total"
    },
    "fuelLog": {
      "title": "Fuel Log",
      "registrationNo": "Registration No.",
      "dateTimeUpdated": "Date/Time Updated",
      "fuelCardNo": "Fuel Card No.",
      "mileageMeterKm": "Mileage/Meter (km)",
      "driverName": "Driver Name"
    }
  },
  "master": { ... },
  "tariff": { ... },
  "invoice": { ... },
  "inquiry": { ... },
  "reports": { ... }
}
```

---

## Migration Phases

### Phase 1 — Project Setup & Design System Integration
- Initialize Next.js 14 App Router project
- Install & configure Gecko Design System CSS
- Configure next-intl (no URL prefix)
- Set up React Query + Zustand
- Create base layout, navigation shell, and shared components
- Set up API client layer

### Phase 2 — Master Data Pages
- Driver list + profile + images
- Equipment profile (general, spec, new list)
- Equipment type/size
- Stock profile (general, ledger, location, vendor)
- Stock labor price + markup
- Transporter registration

### Phase 3 — Fleet Operations — Work Management
- Work Request (list + form)
- Work Order (list + form with tabs: General, Parts, Labor, Service)
- WO Monitoring dashboard
- PM Scheduler (list, form, details, sub-panels)

### Phase 4 — Fleet Operations — Fuel, Meters & Stock
- Fuel Log (list, form, approval)
- Meter Log & Meter HR Log
- Goods Request → Requisition → Purchase Order → Receipt
- Goods Adjustment, Return to Vendor
- Spare Parts Monitoring

### Phase 5 — Tire & Incident Management
- Tire Profile, Tire Change, Tire Maintenance
- Pending Tire Recap
- Accident Report (with images + location)
- Insurance Claim
- Traffic Violation

### Phase 6 — Tariff / Tariff Plan
- Customer Rate (list, form, details)
- Standard Rate (form, details)

### Phase 7 — Invoice / Billing (Fleet)
- Vendor Invoice (list, form, detail, popup)
- Unbilled Vendor Invoice
- WO Invoice, WO Credit Note
- Vendor Credit Note
- Vendor Payment Detail

### Phase 8 — Inquiry Pages
- Work Order Inquiry
- Work In Progress Inquiry
- Purchase Order Inquiry
- Tire Change Inquiry
- Truck Movement Inquiry

### Phase 9 — Reports
- Management Reports (selection + parameter dialog)
- Operation Reports (selection + viewer)

### Phase 10 — i18n Completion & QA
- Complete EN + TH JSON files for all pages
- Language toggle UI (no URL change)
- Cross-browser testing
- Responsive layout verification

---

## Gecko Design System Mapping

| Angular Material | Gecko Component | Usage |
|-----------------|-----------------|-------|
| `mat-card` | `<Card>` | All form containers |
| `mat-tab-group` | `<TabGroup>` | Multi-tab forms (Work Order, Equipment) |
| `mat-table` | `<DataTable>` | All list pages and line item grids |
| `mat-form-field` + `input` | `<Input>` | Text inputs |
| `mat-select` | `<Select>` | Dropdowns |
| `tms-datetimepicker` | `<DateTimePicker>` | Date+time fields |
| `mat-datepicker` | `<DatePicker>` | Date-only fields |
| `mat-autocomplete` | `<Autocomplete>` | Equipment code, driver, vendor search |
| `mat-button` | `<Button variant="primary">` | Primary actions |
| `mat-raised-button` | `<Button variant="outlined">` | Secondary actions |
| `mat-chip` | `<Badge>` | Document status indicators |
| `mat-dialog` | `<Modal>` | Popups (PO add, equipment add) |
| `mat-paginator` | built into `<DataTable>` | Pagination |

---

## API Endpoints (Per Module)

### Master Data
```
GET    /api/master/drivers
GET    /api/master/drivers/{id}
POST   /api/master/drivers
PUT    /api/master/drivers/{id}

GET    /api/master/equipment
GET    /api/master/equipment/{id}
POST   /api/master/equipment
PUT    /api/master/equipment/{id}

GET    /api/master/stock-profiles
GET    /api/master/stock-profiles/{id}
GET    /api/master/equipment-types
GET    /api/master/stock-labor-prices
```

### Fleet Operations
```
GET    /api/fleet/work-orders
GET    /api/fleet/work-orders/{id}
POST   /api/fleet/work-orders
PUT    /api/fleet/work-orders/{id}

GET    /api/fleet/work-requests
POST   /api/fleet/work-requests

GET    /api/fleet/fuel-logs
POST   /api/fleet/fuel-logs
PUT    /api/fleet/fuel-logs/{id}/approve

GET    /api/fleet/pm-schedulers
GET    /api/fleet/pm-schedulers/{id}
POST   /api/fleet/pm-schedulers

GET    /api/fleet/purchase-orders
POST   /api/fleet/purchase-orders
GET    /api/fleet/goods-receipts
POST   /api/fleet/goods-receipts
```

### Tariff
```
GET    /api/tariff/customer-rates
GET    /api/tariff/customer-rates/{id}
POST   /api/tariff/customer-rates
PUT    /api/tariff/customer-rates/{id}

GET    /api/tariff/standard-rates
GET    /api/tariff/standard-rates/{id}
```

### Invoice
```
GET    /api/invoice/vendor
GET    /api/invoice/vendor/{id}
POST   /api/invoice/vendor
POST   /api/invoice/vendor/{id}/post

GET    /api/invoice/wo-invoices/{id}
GET    /api/invoice/credit-notes
POST   /api/invoice/credit-notes
```

### Inquiry
```
GET    /api/inquiry/work-orders?dateFrom=&dateTo=&equipmentCode=&status=
GET    /api/inquiry/wip?dateFrom=&dateTo=
GET    /api/inquiry/purchase-orders?dateFrom=&dateTo=
GET    /api/inquiry/tire-changes?dateFrom=&dateTo=&equipmentCode=
GET    /api/inquiry/truck-movements?dateFrom=&dateTo=
```

### Reports
```
GET    /api/reports/management?reportType=&dateFrom=&dateTo=
GET    /api/reports/operations?reportType=&dateFrom=&dateTo=
GET    /api/reports/{reportType}/export?format=pdf|excel
```

### Lookups (shared)
```
GET    /api/lookup/equipment-codes
GET    /api/lookup/drivers
GET    /api/lookup/vendors
GET    /api/lookup/service-types
GET    /api/lookup/stock-items
GET    /api/lookup/document-statuses
GET    /api/lookup/fuel-types
GET    /api/lookup/equipment-categories
GET    /api/lookup/tyre-brands
GET    /api/lookup/tyre-sizes
```

---

## Page Count Summary

| Module | Pages / Components |
|--------|--------------------|
| Master Data (fleet-relevant) | 18 |
| Tariff / Tariff Plan | 5 |
| Invoice / Billing (fleet) | 10 |
| Inquiry (fleet) | 5 |
| Reports | 3 |
| Fleet Operations — Work Management | 6 |
| Fleet Operations — PM Scheduler | 8 |
| Fleet Operations — Fuel & Meters | 7 |
| Fleet Operations — Inventory/Stock | 23 |
| Fleet Operations — Tire Management | 4 |
| Fleet Operations — Incidents & Insurance | 9 |
| Fleet Operations — Service Type | 2 |
| Shared Lookup Hooks | 28 |
| **Total** | **128** |

---

## Notes & Decisions

1. **No URL-based i18n**: Language is stored in a cookie/localStorage and toggled in-memory. next-intl `localePrefix: 'never'` is used.
2. **Gecko Design System**: All styling uses `gecko-design-system.css` tokens — no custom CSS unless Gecko doesn't cover the use case.
3. **Master-detail pattern**: List pages use `<DataTable>` with row click → navigate to detail page (no inline editing except for rate tables).
4. **Popup/modals**: Angular `mat-dialog` popups (PO add-list, goods receive popup, etc.) become Gecko `<Modal>` with a local state trigger.
5. **Tabs**: Multi-tab forms (Work Order: General/Parts/Labor/Service; Equipment: General/Spec/Details) use Gecko `<TabGroup>` with URL hash or query param to preserve active tab on refresh.
6. **Image gallery**: `fleet/image-gallery` becomes a shared `<ImageGallery>` component using Gecko's `<FileUpload>` + lightbox pattern.
7. **Date-time picker**: Angular `tms-datetimepicker` maps to Gecko `<DateTimePicker>` with 24-hour format.
8. **Approval workflows**: Fuel log approval, WO posting — use optimistic UI with React Query mutations.
9. **Read-only fields**: Computed totals (`totalPartsPrice`, etc.) use `<Input readOnly>` with React Query derived state.
10. **Print/Export**: Invoice and report printing triggers a server-side PDF generation endpoint.

---

*Generated: 2026-04-22*
*Source analysis: Angular DMS fleet module at `D:\SHARMA\PROJECT\DMS PROJECT 08102022\dms.web\dms.web\src`*
