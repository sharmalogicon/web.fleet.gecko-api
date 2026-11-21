# Fleet UI prompts (handoff from the backend session)

Prompts for the **UI Claude session** working in `D:\SHARMA\PROJECT\gecko\web.fleet.gecko-api`.
The backend session (gecko_fleet database + `Gecko.Fleet.Api`) writes them; the UI session carries them out.

## UI change policy (owner, 2026-11-19): READ FIRST
The existing Fleet UI is the product. **Do not redesign screens, tabs, columns, labels or menus.** A prompt may:
swap a page's data source to the API, make API-owned fields read-only, add a button or a field the API needs, and add a
page only for a concept that has no screen today (e.g. Fleet Setup). Anything else is asked in `replies/` first.
When the back end lacks a field a screen shows, the BACK END is extended; the field is never removed from the UI.

## How to use
1. Start a Claude session in `D:\SHARMA\PROJECT\gecko\web.fleet.gecko-api`.
2. Paste: `Read ui-prompts/README.md, then carry out ui-prompts/<NN>_<name>.md.`
3. The UI session keeps its own progress in the root `TODO.md` (update it after every step — sessions drop often).
4. Questions or API requests for the backend go in `ui-prompts/replies/<NN>_REPLY.md` (one file per prompt).
   The backend session reads that folder and answers in the next prompt or in the reply file.

## Prompts
| No | File | Status |
|---|---|---|
| 01 | `01_API_CONNECTION_P0.md` — API client, login, token refresh, route guard, branch context, React Query, env, OpenAPI types | ready |
| 02 | `02_SETUP_SCREENS_P1.md` — editable Fleet Setup: number series, settings, approval policies, labour cost rates (after 01) | ready |
| 03 | `03_ASSET_REGISTER_P1.md` — equipment list + form on the real API, same screens (read-only Trucking fields, sync button, axle layout select) | ready (rewritten 2026-11-19: no redesign; §4 updated: Spec tab now on the API) |
| 04 | `04_TECHNICIANS_P1.md` — one new master page (no screen exists today), copied from the Drivers pages (after 01) | ready |
| 05 | `05_DRIVERS_P1.md` — Drivers list + form on the real API, same screens (Trucking drivers read-only, personal data read live, sync button) | ready |
| 06 | `06_SUPPLIERS_P1.md` — Transporters page on the Platform API supplier endpoints (category TRANSPORT), same screen | ready |
| 07 | `07_SERVICE_TYPES_STOCK_STORES_P1.md` — Service Types + Stock on the API; one new Stores page (stores + bins) — **P1 complete** | ready |
| 08 | `08_METERS_PM_P2.md` — Meter Logs / HR Logs + PM Scheduler on the API; one new PM Due page — **P2 complete** | ready |
| 09 | `09_WORK_REQUESTS_ORDERS_P3.md` — Work Requests + Work Orders on the API (actions, line grids, workshop flag) | ready |
| 10 | `10_ATTACHMENTS_INSPECTIONS_P3.md` — WO Photos tab; new Inspections / Defects / Checklists pages (defect → work request) — **P3 complete** | ready |
| 11 | `11_INVENTORY_PURCHASING_P4.md` — goods requests, POs, receipts, returns, adjustments (+ transfers), spare-parts monitoring on the API; stock qty on the Stock form; one new Stock Counts page — **P4 complete** | ready |
| 12 | `12_REPAIR_TARIFF_RECHARGE_P5.md` — Tariff pages = repair tariff (Platform API); WO Preview / Release charges; new Recharges page; WO invoices from Revenue — **P5 complete** | ready |
| 13 | `13_TYRES_P6.md` — tyre profiles / changes / maintenance / pending recap / inquiry on the API; axle map ONE endpoint, TWO formats (2D + 3D geometry) — **P6 complete** | ready |
| 14 | `14_INCIDENTS_FUEL_P7.md` — fuel logs (+ approval; Trucking-linked assets read-only), accidents (+ WR, photos, third party), insurance claims, traffic violations (+ driver deduction, payroll export) — **P7 complete** | ready |
| 15 | `15_VENDOR_BILLING_P8.md` — unbilled list, vendor invoices (3-way match, exception approval, WHT), vendor credit notes, payments recorded on invoices, CSV export to accounting — **P8 complete** | ready |
| 16 | `16_REPORTS_DASHBOARD_P9.md` — live dashboard, the 19 reports (preview + PDF + Excel, filters from the catalogue), the 5 inquiries (+ export), asset cost ledger (read-only), fuel summary, driver incident history — **P9 complete** | ready |
| 17 | `17_SAP_B1_P10.md` — Fleet Setup tabs ERP connection (+ test) and ERP mappings; export target SAP Business One with per-document result, retry, SAP payment pull, reconciliation (built-in fake:// simulator until SCT's SAP details arrive) — **P10 complete** | ready |
| 18 | `18_GO_LIVE_P11.md` — Fleet Setup tab "Opening balances" (Excel templates, check, import: meters, PM baselines, stock, tyres), "Sync everything from Trucking", meter source badges — **P11 complete (backend)** | ready |
| 19 | `19_GAP_CLOSING_P12.md` — vendor payment approval (Approve / Reject), stock reservations (Reserve / Release, real reserved / available qty), Depreciation column in Service Cost Summary — **P12 part 1** | ready |
| 20 | `20_GAP_CLOSING_P12_PART2.md` — stock cost corrections from invoice price variance (read-only grids on vendor invoice + stock form), "Price variance" column — **P12 part 2** | ready |
| 21 | `21_WO_CREDIT_NOTES_P12.md` — WO credit notes from mock to the Revenue API (list, issue from a WO invoice with a credit amount per line, cancel) — **P12e** | ready |
| 22 | `22_BACKEND_TODO_P13.md` — the 20 backend to-do items shipped (tyre condition list, documentDate, axle-map driver, tyre last event, issued qty, list filters, transfer targets, invoice line fields + filters, withdraw DRAFT card, recharge catch-up): remove the fallbacks — **P13** | ready |
| 23 | `23_SUBCON_DEDUCTION_TAX_INVOICE_P14.md` — SCT tax invoice per PAID subcontractor statement (automatic): show its number on DEDUCTED recharges; list via `/api/revenue/subcon-deduction-invoices` — **P14** | ready |

## Fleet API status (what is real, what is still mock)
Updated by the backend session as phases land. Anything not listed is still mock: keep the mock behind the adapter
for that entity (01 explains) until it appears here.

| Phase | Endpoint | Status |
|---|---|---|
| P0 | `GET /api/fleet/access` | live locally |
| P0 | `GET /api/fleet/setup/number-series` (needs `fleet.setup.manage`) | live locally |
| P0 | `GET /api/fleet/setup/settings` | live locally |
| P1 | `GET /setup/catalogue`, `POST /setup/initialize` (default series + settings) | live locally |
| P1 | number series `POST/PUT/DELETE /setup/number-series` | live locally |
| P1 | settings `GET /setup/settings/effective`, `PUT /setup/settings/{code}`, `DELETE /setup/settings/{id}` | live locally |
| P1 | approval policies `GET/POST/PUT/DELETE /setup/approval-policies` | live locally |
| P1 | labour cost rates `GET/POST/PUT/DELETE /setup/labor-cost-rates` (trades = gecko_master `FLEET_TRADE`) | live locally |
| P1 | `POST /setup/initialize` also writes 10 default axle layouts (`axleLayoutsAdded`) | live locally |
| P1 | asset register `GET /assets/catalogue`, `GET/POST /assets`, `GET/PUT /assets/{id}`, `POST /assets/sync-from-trucking` | live locally |
| P1 | axle layouts `GET/POST /axle-layouts`, `GET/PUT/DELETE /axle-layouts/{id}` | live locally |
| P1 | asset Spec tab: `specification` object on the asset endpoints (weights, dimensions, engine, fuel tank, payload, licence no) | live locally |
| P1 | automatic Trucking → Fleet sync on vehicle / chassis change (events) | not started (manual sync for now) |
| P1 | technicians `GET/POST /technicians`, `GET/PUT /technicians/{id}` (skills, cost rate) | live locally |
| P1 | drivers `GET /drivers/catalogue`, `GET/POST /drivers`, `GET/PUT /drivers/{id}`, `GET /drivers/{id}/personal` (live from Trucking, never stored), `POST /drivers/sync-from-trucking` | live locally |
| P1 | suppliers (Platform API) `GET/POST /api/master/suppliers`, `GET/PUT /api/master/suppliers/{partyCode}` (`mdm.supplier.*`) | live locally |
| P1 | service tasks `GET/POST /service-tasks`, `GET/PUT /service-tasks/{id}` | live locally |
| P1 | stores + bins `GET/POST /warehouses`, `GET/PUT /warehouses/{id}`, `POST/PUT /warehouses/{id}/bins[/{binId}]` | live locally |
| P1 | items `GET /items/catalogue`, `GET/POST /items`, `GET/PUT /items/{id}` (aliases, vendors, stock policies) | live locally |
| P1 | inspection tables (templates, inspections, results, defects) | tables only; screens in P3, mobile phase 2 |
| P2 | meters `GET/POST /meter-readings`, `POST /meter-readings/{id}/review|reverse`, `GET /assets/{id}/meters`, `POST /assets/{id}/meter-segments` | live locally |
| P2 | PM `GET/POST /pm-programs`, `GET/PUT /pm-programs/{id}`, `POST /pm-programs/{id}/assignments`, `PUT /pm-assignments/{id}`, `GET /pm/due`, `PUT /pm-task-states/{id}/baseline`, `POST /pm/recalculate` | live locally |
| P2 | odometer from Trucking job orders / trips (events) and PM due notifications | DEFERRED with the automatic sync (P11) |
| P3 | work requests `GET/POST /work-requests`, `GET/PUT /work-requests/{id}`, `POST …/{id}/submit|approve|reject|cancel|convert` | live locally |
| P3 | work orders `GET/POST /work-orders`, `GET/PUT /work-orders/{id}`, `GET …/{id}/status-log`, `POST …/{id}/status`, `POST …/{id}/approval` | live locally |
| P3 | WO attachments `GET/POST /work-orders/{id}/attachments`, `GET …/{attachmentId}/content`, `DELETE …/{attachmentId}` | live locally |
| P3 | inspections `GET/POST /inspection-templates`, `PUT /inspection-templates/{id}`, `GET/POST /inspections`, `GET /inspections/{id}`, `GET /defects`, `POST /defects/{id}/raise-work-request|defer|resolve` | live locally |
| P4 | stock `GET /stock`, `GET /items/{id}/ledger`, `GET /stock/reorder-suggestions`, `POST /stock/opening-balances`; issues `/stock-issues` (+ post, cancel) | live locally |
| P4 | adjustments `/stock-adjustments` (+ submit, approval, cancel), transfers `/stock-transfers` (+ ship, receive, cancel), counts `/stock-counts` (+ counts, post, cancel) | live locally |
| P4 | goods requests `/goods-requests` (+ submit, approval, cancel), POs `/purchase-orders` (+ submit, approval, send, close, cancel, `GET open-lines`) | live locally |
| P4 | goods receipts `/goods-receipts` (+ post, cancel), vendor returns `/vendor-returns` (+ post, cancel) | live locally |
| P4 | unit conversions on items, stock reservations, PO PDF | not yet (PDF with reports) |
| P5 | repair tariff (Platform API) `GET/POST /api/revenue/repair-tariffs`, `GET/PUT …/{id}`, `POST …/{id}/submit|approve|reject|withdraw`, `POST …/price-check` | live locally |
| P5 | recharge `POST /work-orders/{id}/recharges/preview|release`, `GET /recharges/candidates`, `GET /recharges[/{id}]`, `POST /recharges/{id}/retry|refresh|cancel` | live locally |
| P5 | fleet invoices (Platform API) `GET /api/revenue/fleet/charges`, `GET /api/revenue/fleet/invoiceable`, `GET/POST /api/revenue/fleet/invoices`, `GET …/{invoiceId}` | live locally |
| P5 | subcontractor deductions on Trucking statements (made in Trucking's statement screens) | live locally (statement step not yet tested) |
| P5 | WO credit notes (`/invoice/credit-notes/wo`) | prompt 21 |
| P6 | tyres `GET/POST /tyres`, `GET/PUT /tyres/{id}`, `POST /tyre-changes`, `POST /tyre-maintenance`, `GET /tyre-documents[/{id}]`, `GET /tyre-events` | live locally |
| P6 | axle map `GET /assets/{id}/axle-map?format=2d|3d|both` (shared model + geometry2D + geometry3D) | live locally |
| P7 | lookups `GET /lookups/accident-types|accident-responsibilities|violation-types` | live locally |
| P7 | fuel logs `GET/POST /fuel-logs`, `GET/PUT /fuel-logs/{id}`, `POST …/{id}/submit|approve|reject|cancel`; `GET /assets/{id}/fuel` (Trucking rows, read-only) | live locally |
| P7 | accidents `GET/POST /accidents`, `GET/PUT /accidents/{id}`, `POST …/{id}/work-request|close|cancel`, attachments `GET/POST …/{id}/attachments`, `GET …/content`, `DELETE …/{attachmentId}` | live locally |
| P7 | insurance claims `GET/POST /insurance-claims`, `GET/PUT …/{id}`, `POST …/{id}/lines/from-work-orders|submit|decision|settle|revise|cancel` | live locally |
| P7 | traffic violations `GET/POST /traffic-violations`, `GET/PUT …/{id}`, `POST …/{id}/pay|deduct|deduction/cancel|deduction/refresh|dispute|reopen|cancel`, `GET /traffic-violations/payroll-deductions`, `POST …/payroll-deductions/export` | live locally |
| P8 | vendor invoices `GET /vendor-invoices/unbilled`, `GET/POST /vendor-invoices`, `GET/PUT …/{id}`, `POST …/{id}/submit|approval|cancel|payments`; `GET /vendor-payments` | live locally |
| P8 | vendor credit notes `GET/POST /vendor-credit-notes`, `GET/PUT …/{id}`, `POST …/{id}/approve|cancel` | live locally |
| P8 | export to accounting `GET /ap-exports[/pending]`, `POST /ap-exports` (CSV), `GET /ap-exports/{id}[/file]`; SAP B1 target = P10 | live locally |
| P9 | reports `GET /reports` (catalogue), `GET /reports/{code}?format=json|pdf|xlsx`, inquiries `GET /inquiry/{code}`, `GET /dashboard` | live locally |
| P9 | asset cost `POST /cost/sync`, `GET /cost/entries`, `GET /cost/monthly`; `GET /fuel-logs/summary`; `GET /drivers/{id}/incidents` | live locally |
| P10 | ERP setup `GET/PUT /setup/erp-connection`, `POST /setup/erp-connection/test`, `GET/PUT/DELETE /setup/erp-mappings` | live locally |
| P10 | SAP posting `POST /ap-exports` (target SAP_B1), `POST /ap-exports/{id}/retry`, `POST /erp/payments/pull`, `GET /erp/reconciliation` | live locally (simulator; real SAP needs SCT's connection data) |
| P11 | opening balances `GET /opening-balances/{kind}/template`, `POST /opening-balances/{kind}?commit=`; `POST /sync/trucking` (+ nightly job, off until enabled) | live locally |
| — | all backend phases P0–P11 built; go-live steps: `docs/backend-analysis/P11_GO_LIVE_RUNBOOK.md` | — |
| P12 | payment approval `POST /vendor-payments/{id}/approval`, `GET /vendor-payments?status=`; reservations `GET/POST /stock-reservations`, `POST …/{id}/release`; DEPRECIATION in the cost ledger | live locally |
| P13 | backend to-do #1–#20: `GET/PUT /warehouses/{id}/transfer-targets`; new fields / filters listed in prompt 22; Platform fleet invoice filters + line fields, DRAFT card withdraw | live locally |
| P14 | subcontractor deduction tax invoices `GET /api/revenue/subcon-deduction-invoices[/{invoiceId}]` (issued when Trucking marks a statement PAID) | live locally |

## OpenAPI documents
`openapi/fleet-api.json` and `openapi/platform-api.json` — exported from the running APIs by the backend session.
**Last export: 2026-11-21 (P14, prompt 23)** — Fleet 208 paths / 285 schemas; Platform 425 paths / 563 schemas (response types included — regenerate types for every prompt) incl.
`/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout` (unchanged).
Regenerate the TypeScript types from them (`npm run api:types`, see 01). When an endpoint changes, the backend
session re-exports these files and says so here.
