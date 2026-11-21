# 16 — Dashboard, inquiries, reports and asset cost on the real API (P9)

You are the UI session for **Gecko Fleet**. Prerequisites: **01** (and the earlier prompts for the data the reports read).
Regenerate the types (`npm run api:types`; `fleet-api.json` re-exported 2026-11-20: **193 paths, 270 schemas**). Read the UI
change policy.

Same screens, real data — no new page: `/dashboard`, `/inquiry/work-orders`, `/inquiry/wip`, `/inquiry/purchase-orders`,
`/inquiry/tire-changes`, `/inquiry/truck-movements`, `/reports/management`, `/reports/operations`. Permissions: dashboard,
reports and inquiries `fleet.report.view`; cost figures `fleet.cost.view` (hide them without it).
Also from P7's UI needs (§1, §5): a fuel summary and a driver's incident history (optional placement, §E).

## A. Dashboard (`/dashboard`)
`GET /api/fleet/dashboard?branchId=` →
- `stats[]` `{ key, value, previousValue?, unit? }` in this order — map to the six `StatCard`s: `ACTIVE_WORK_ORDERS` → Active
  Work Orders, `PENDING_PM` (due + due soon) → Pending PM, `OPEN_PURCHASE_ORDERS` → Open PO, `TOTAL_VEHICLES` (active assets)
  → Total Vehicles, `OVERDUE_SERVICE` (PM overdue) → Overdue Service, `FUEL_LITERS_MONTH` (unit L) → Fuel (title = the current
  month name, e.g. "Fuel (Nov)"). `change` % = (value − previousValue) / previousValue × 100 when `previousValue` is given and
  not 0 (only Active Work Orders and Fuel have one today); otherwise hide the change line.
- `fleetStatus` `{ ACTIVE, UNDER_MAINTENANCE, IDLE, OUT_OF_SERVICE }` → `FleetStatus` (Active / Under Maintenance / Idle /
  Out of Service). Rules: an open WO that takes the asset out of service → Out of Service; another open WO → Under
  Maintenance; else a meter reading in the last 7 days → Active, none → Idle.
- `recentWorkOrders[]` (latest 5) → `RecentWorkOrders`; `upcomingPm[]` (not OK, earliest due first, 5) → `UpcomingPM`.
- `costThisMonth`, `costLastMonth` — only for `fleet.cost.view`; show them only if the dashboard already has a place (else ask).

## B. Reports (`/reports/management`, `/reports/operations`)
Catalogue `GET /api/fleet/reports` → `[{ code, title, group (management | operations | inquiry), params[], columns[] }]`. The
codes are exactly the sidebar ids already in `ManagementReportClient` / `OperationsReportClient` (19 reports). Use `params` to
decide which filter fields to show (`from`, `to`, `branchId`, `assetProfileId`, `equipmentCode`, `category`, `status`,
`supplier`, `poNo`, `serialNo`, `search`, `woType`) — it replaces the hard-coded `PO_REPORT_IDS` / `TIRE_REPORT_IDS` lists.
Run: `GET /api/fleet/reports/{code}?format=json&from=&to=&…` → preview
`{ code, title, columns: [{ key, header, format, align, sum }], rows: [[…], …], totals: […] | null, rowCount, truncated, parameters }`.
Rows are arrays in column order (dates ISO, numbers raw); format them in `ReportPreview` with the column's `format`
(`dd/MM/yyyy`, `dd/MM/yyyy HH:mm` in Thai time, `#,0.00`, `#,0.##`, `#,0`) and `align`; show `totals` as the last, bold row;
`truncated` = more than 5,000 rows → "narrow the filters" note. Field mapping from the screens: `dateFrom`/`dateTo` → `from`/`to`,
`equipmentCode` → `equipmentCode` (matches code or registration, contains), `equipmentCategory` → `category`,
`status` / `documentStatus` → `status` ("All" = leave it out), `vendorName` → `supplier` (code or name, contains), `poNo`, `serialNo`.
**Export PDF / Export Excel** (now enabled): the same URL with `format=pdf` / `format=xlsx` → a file download (A4, every column
on one sheet). The Stock Movement report keeps its own component but reads `stock-movement-report` (filter `search` = item /
document, `status` = movement type).

## C. Inquiries (`/inquiry/*`)
`GET /api/fleet/inquiry/{code}` with `code` = `work-orders`, `wip`, `purchase-orders`, `tyre-changes`, `truck-movements`
(the `tire-changes` page uses `tyre-changes`) — same response, filters and `format=pdf|xlsx` export as §B. Columns per inquiry
are in the catalogue (`group: inquiry`). Map the pages' filters: WO no → `search`, equipment → `equipmentCode`, type → `woType`,
status → `status`, date range → `from` / `to`; PO doc no → `poNo`, vendor → `supplier`; transaction no → `search`; truck no →
`equipmentCode`, trip type → `tripType`. WIP rows carry `daysOpen` (orange when > 7, as today).
**Truck movements** come from Trucking (job-order legs of the LINKED trucks): `truckNo` = Fleet asset code, `at`, `durationMins`,
`haulier`, `tripType`, `blBooking`, `size` (ft), `containerNo`, `agent`, `orderNo`, `movement`, `route`, `km`. Fleet-only assets
have none; booking/order details beyond these columns are Trucking's screens.

## D. Asset cost (read-only, `fleet.cost.view`)
The cost ledger is filled by the API (`POST /api/fleet/cost/sync`, also run before the dashboard and the cost reports):
`GET /cost/entries?assetProfileId=&category=&sourceDocType=&from=&to=` (rows: date, category PM / REPAIR / BREAKDOWN / ACCIDENT /
TYRE / FUEL / VIOLATION / RECOVERY, amount (+ cost / − recovery), source document) and `GET /cost/monthly?assetProfileId=&from=&to=`
(per month × category). No screen exists for them: the **Service Cost Summary** report (§B) is the cost view. If the equipment
form should get a "Cost" tab, ask in the reply first (policy).

## E. Fuel summary and driver incidents (from P7_UI_NEEDS §1, §5)
- `GET /api/fleet/fuel-logs/summary?assetProfileId=&from=&to=&branchId=` → per asset `logs, liters, distanceKm, kmPerLiter, amount,
  costPerKm` (`fleet.fuel.view`). The Fuel Consumption Summary report shows the same; use the endpoint only if a screen wants it.
- `GET /api/fleet/drivers/{id}/incidents` → accidents + violations, newest first (`kind, documentNo, occurredAt, assetCode, type,
  status, amount, detail`) (`fleet.incident.view`). Place it only where the driver form already has room (else ask).

## Done when
- [ ] Dashboard, the 19 reports (preview + PDF + Excel) and the 5 inquiries (+ export) on the API; report filters driven by `params`.
- [ ] EN + TH strings; Vitest for the dashboard adapter (stats → cards, change %), the report preview cell formatter (each format)
      and the params → visible-fields logic; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/16_REPLY.md`.

**This closes P9.** Next: P10 (SAP Business One integration). Do not commit or push unless the owner asks.
