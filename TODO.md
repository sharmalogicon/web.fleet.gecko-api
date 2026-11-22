# Fleet Migration TODO
## Angular → Next.js 14+ (Gecko Design System)

> **Source:** `D:\SHARMA\PROJECT\DMS PROJECT 08102022\dms.web\dms.web\src`
> **Target:** `D:\SHARMA\PROJECT\gecko\web.fleet.gecko-api`
> **Design System CSS:** `D:\SHARMA\PROJECT\gecko\design-system\gecko-design-system.css`
> **Reference Project:** `D:\SHARMA\PROJECT\gecko\EDI\app.gecko-api` (same structure/patterns)

**Legend:** ✅ Done · 🔄 In Progress · ⬜ Not Started

---

## API Integration — ui-prompts/01_API_CONNECTION_P0.md (started 2026-11-19)
> Recovery: read `ui-prompts/README.md` + `ui-prompts/01_API_CONNECTION_P0.md`, then continue from the first ⬜ below.
> Reference implementation copied from `D:\SHARMA\PROJECT\gecko\web.trucking.gecko-api` (minus its /[locale] routing).
> APIs NOT running during the offline build; live checks are listed in step 15.

- ✅ 1. `next.config.ts` rewrites (`/api/fleet` → 5300 first, `/api` + `/auth` → 5100) + `resolveOrigin()`; `.env.example`
- ✅ 2. `npm run dev` over https on port 5001 (copy trucking `certificates/`, gitignore them)
- ✅ 3. Deps: `@tanstack/react-query` (+ devtools), `openapi-typescript` (dev); remove `next-auth` once login works
- ✅ 4. `src/lib/api/client.ts` + `problem.ts` ported from trucking (only module that calls fetch)
- ✅ 5. `api:types` script → `src/lib/api/fleet.schema.ts` + `platform.schema.ts` (generated, never hand-edited)
- ✅ 6. `AuthContext` (loading / authenticated / anonymous / offline) + `/login` page (no locale), EN/TH
- ✅ 7. Auth gate on the `(dashboard)` layout: offline banner, redirect to /login, "Fleet not enabled" page when `me.modules` lacks FLEET
- ✅ 8. Logout wired in the existing sidebar UserMenu (real name/e-mail from `/auth/me`)
- ✅ 9. React Query provider inside AuthProvider (retry network only, no refetch on focus, 401 → clear cache + /login)
- ✅ 10. Fleet access: `GET /api/fleet/access` query + `canAnywhere / canAt / branchesFor` helpers
- ✅ 11. Route guard map (route → permission), sidebar hides links, 403 page for direct URLs
- ✅ 12. Branch context: `GET /api/branches`, Zustand store persisted per user id, header switcher
- ✅ 13. Read-only Fleet Setup page `/master/fleet-setup` (number series + settings, empty states)
- ✅ 14. Vitest (29 new, 45 total pass); `tsc` clean; `next build --webpack` passes
  - Turbopack `npm run build` crashes with out-of-memory in loader workers on this PC (19 workers, ~4 GB free): environmental, retry with more free RAM
  - `npm run lint` was broken since the first commit (FlatCompat vs eslint-config-next 16): config replaced with trucking's flat config. It now runs; new code is clean, **55 pre-existing errors remain in old screen code** (44 no-explicit-any, 7 require, 3 set-state-in-effect, 1 triple-slash): owner to decide whether to clean up
- 🔄 15. LIVE checks (needs APIs on 5100/5300)
  - ✅ offline: proxy routes /auth→5100, /api/fleet→5300; APIs down → 500 → offline banner (unit-tested); /login renders on https
  - ✅ (2026-11-20) login, reload keeps session (refresh cookie HttpOnly + Secure + SameSite=Strict, path /auth; token dropped → /auth/refresh → 200), logout → refresh 401 (LIVE_TEST_FINDINGS §E)
  - ✅ (2026-11-20, APIs run from platform/ via dotnet run) owner: 43 fleet perms, every read endpoint of 03–13 = 200 through the proxy · ops.lcb branch-limited (asset.view at 2 branches, no setup) · gate1.lcb: 403 on fleet data · SSS owner sees none of SCT-TEST's assets
  - ✅ SCT-TEST seeded via the UI calls: setup initialize (17 series / 14 settings / 10 axle layouts), sync 3 assets + 2 drivers from Trucking; FLEET_TYRE_CONDITION returns 14 codes
  - ✅ write flows on SCT-TEST through the proxy (2026-11-20): A tyres 48/52, B stock + purchasing 47/49, C tariff + recharge + invoice 45/48; findings in ui-prompts/replies/LIVE_TEST_FINDINGS.md; owner decisions applied: A2 store on map remove/replace (done, verified live), C1 withdraw hidden on DRAFT (done); A1 + C2 = backend
  - ✅ write flows 03–10 all pass (no UI change needed); consolidated backend list: ui-prompts/replies/BACKEND_TODO.md (P1 blocking 1–4, P2 fields/filters 5–15, P3 confirm 16–20)
  - ✅ owner 2026-11-20: adjustment Approve/Reject gated by fleet.stock.approve (as the API checks) — AdjustmentViews.tsx; 202 tests pass
  - ⬜ browser walk-through (sidebar, login reload, logout) — needs a browser · tenant without FLEET → "not enabled": no test tenant lacks FLEET (SCT-TEST + SSS both have it), needs one from the backend
  - ✅ (2026-11-20) `next-auth` removed (unused in src); tsc clean, Vitest 202 pass
- ✅ 16. Adapter pattern documented (below) + `ui-prompts/replies/01_REPLY.md` (4 questions for the backend)

## Fleet Setup screens — ui-prompts/02_SETUP_SCREENS_P1.md (started 2026-11-20)
> Recovery: read `ui-prompts/02_SETUP_SCREENS_P1.md`, then continue from the first ⬜ below. APIs still offline.

- ✅ 1. `npm run api:types`; replace hand-written `NumberSeries` with generated `NumberSeriesDto` (backend answer 01 Q1)
- ✅ 2. `src/lib/api/fleet/setup.ts`: catalogue, initialize, number-series CRUD, settings effective/upsert/delete, approval policies CRUD, labour rates CRUD + mutations (invalidate list keys)
- ✅ 3. `src/lib/fleet-setup/numberSeries.ts`: example-number formatter + form rules (pure) + Vitest (19 pass; rules copied from platform/Gecko.Fleet NumberSeriesEndpoints.cs)
- ✅ 4. FLEET_TRADE code list (`useCodeList` in setup.ts) from Platform API (`/api/master/code-lists/FLEET_TRADE`)
- ✅ 5. Tabs shell on `/master/fleet-setup` (writes need `fleet.setup.manage` TENANT-WIDE per the API → else Settings read-only only)
- ✅ 6. Number series tab: list + side panel form with live example, issued-lock, branch override, "Set up defaults"
- ✅ 7. Settings tab: branch picker, effective rows, editor by type, source chip, reset to tenant
- ✅ 8. Approvals tab: grouped by document type, modal add/edit, delete confirm
- ✅ 9. Labour cost rates tab: grouped by trade, "New rate from…", delete latest only
- ✅ 10. 409 → "changed by someone else" + refetch; 400 → field errors beside inputs
- ✅ 11. EN + TH strings
- ✅ 12. `tsc` clean, Vitest 77 pass (32 new), lint clean on new code, `next build --webpack` passes (needs PLATFORM_API_ORIGIN + FLEET_API_ORIGIN set)
- ✅ 13. `ui-prompts/replies/02_REPLY.md` (4 questions)
- ✅ 14. LIVE checks (2026-11-20): 38/38 — four tabs CRUD + 409/400, initialize idempotent (17/14), UI example = API example (LTX-SCT-LCB01-2611-00001), ops.lcb read-only (LIVE_TEST_FINDINGS §E)

## Equipment on the API — ui-prompts/03_ASSET_REGISTER_P1.md (started 2026-11-20)
> Recovery: read `ui-prompts/03_ASSET_REGISTER_P1.md`, then continue from the first ⬜. NO REDESIGN: same list/form/tabs/labels.
> Backend source for rules: `platform/Gecko.Fleet/Endpoints/Assets/AssetEndpoints.cs`.

- ✅ 1. Adapter `src/lib/api/fleet/assets.ts`: calls, `toViewModel` / `toCreateRequest` / `toUpdateRequest` (field map §3.2, spec §4 incl. mm↔m), hooks
- ✅ 2. Vitest for the adapter mapping (15 pass)
- ✅ 3. `types/equipment.ts`: empty number inputs → undefined (not 0); `axleLayoutId` field
- ✅ 4. List page → client data (search/status server-side; category + UNDER REPAIR filtered on the loaded page), Sync from Trucking button (tenant-wide `fleet.asset.manage`)
- ✅ 5. Form page → `useAsset(id)`; linked = Trucking fields disabled + "Managed in Trucking" badge; dropdowns from catalogue; axle layout select; 409/400
- ✅ 6. No asset delete endpoint: Delete disabled with tooltip (asked in reply)
- ✅ 7. EN + TH; tsc clean, Vitest 92 pass, lint 0 errors (2 old-pattern warnings), build passes. Removed unused `lib/hooks/useEquipment.ts` + `lib/data/equipment.ts` (mock list itself kept for PM/report/lookup)
- ✅ 8. `ui-prompts/replies/03_REPLY.md` (7 points: delete, disposal date, owner party, empty category list, branch filter, mocks, axle map)
- ✅ 9. LIVE checks — done 2026-11-20 (LIVE_TEST_FINDINGS §D): list/form/sync on SCT-TEST owner, linked read-only, FLEET editable, 409/400

## Technicians page — ui-prompts/04_TECHNICIANS_P1.md (started 2026-11-20)
> Recovery: read `ui-prompts/04_TECHNICIANS_P1.md`; copy the Drivers list/form style. Rules: `platform/Gecko.Fleet/Endpoints/People/TechnicianEndpoints.cs`.

- ✅ 1. Adapter `src/lib/api/fleet/technicians.ts` + `src/types/technician.ts` (zod) + Vitest
- ✅ 2. Reusable inline line-items editor `src/components/shared/LineItemsEditor.tsx` + Vitest (used for skills)
- ✅ 3. List `/master/technicians` (code+name · trade+skill chips · branch · employment · status; filters search/trade/status/branch)
- ✅ 4. Form `/master/technicians/[id]` (General + Rates + Skills sections; costRate text; login picker only with `user.manage`)
- ✅ 5. Menu item after Drivers + route guard `fleet.people.view`; EN + TH
- ✅ 6. tsc clean, Vitest 107 pass, lint 0 errors, build passes
- ✅ 7. `ui-prompts/replies/04_REPLY.md` (3 questions)
- ✅ 8. LIVE checks — done 2026-11-20 (LIVE_TEST_FINDINGS §D): create/edit/skills, 400/409

## Drivers on the API — ui-prompts/05_DRIVERS_P1.md (started 2026-11-20)
> Recovery: read `ui-prompts/05_DRIVERS_P1.md`. NO REDESIGN. Rules: `platform/Gecko.Fleet/Endpoints/People/DriverEndpoints.cs`.

- ✅ 1. Adapter `src/lib/api/fleet/drivers.ts` (status map, rates, personal → form, never-cached personal query) + Vitest
- ✅ 2. `types/driver.ts`: rates via optNum; e-mail no longer validated (read-only personal)
- ✅ 3. List → API: source badge in code cell, branch filter, Sync from Trucking (tenant-wide `fleet.people.manage`), Delete hidden
- ✅ 4. Form → API: TRUCKING = identity disabled + "From Trucking" badge by title; personal read-only ("On file in Trucking"); rates hidden; 400/409
- ✅ 5. Images page keeps the mock gallery but takes the API driver (UUID ids)
- ✅ 6. EN + TH; tsc clean, Vitest 111 pass, lint 0 errors, build passes (removed unused lib/data/drivers*.ts, lib/hooks/useDriver.ts)
- ✅ 7. `ui-prompts/replies/05_REPLY.md` (4 notes)
- ✅ 8. LIVE — done 2026-11-20 (LIVE_TEST_FINDINGS §D): list/form/create/edit/sync, personal shown with manage only, TRUCKING read-only

## Transporters = suppliers (TRANSPORT) — ui-prompts/06_SUPPLIERS_P1.md (started 2026-11-20)
> Recovery: read `ui-prompts/06_SUPPLIERS_P1.md`. Platform API `/api/master/suppliers`. NO REDESIGN.

- ✅ 1. Adapter `src/lib/api/platform/suppliers.ts` (map, terms sent back unchanged, otherRoles → party fields read-only) + Vitest
- ✅ 2. List + form on the API (partyCode in URLs; Delete hidden; New/Save only with `mdm.supplier.manage`); 400/403/409
- ✅ 3. EN + TH; tsc clean, Vitest 117 pass, lint 0 errors, build passes (removed unused lib/data/transporters.ts, lib/hooks/useTransporter.ts)
- ✅ 4. `ui-prompts/replies/06_REPLY.md`
- ✅ 5. LIVE — done 2026-11-20 (LIVE_TEST_FINDINGS §D): list/create/edit on SCT-TEST; party with other roles read-only

## Service Types + Stock + Stores — ui-prompts/07_SERVICE_TYPES_STOCK_STORES_P1.md (started 2026-11-20)
> Recovery: read the prompt. Shared save-error helper: `src/lib/api/saveErrors.ts` (use it from here on).

- ✅ 1. Service Types → `src/lib/api/fleet/serviceTasks.ts`; list/form on API; categories from FLEET_SERVICE_CATEGORY; Delete hidden; manage = tenant-wide `fleet.pm.manage`
- ✅ 2. Stores adapter `src/lib/api/fleet/warehouses.ts` + new page `/master/stores` (list + form + bins via LineItemsEditor) + menu after Stock + route guard
- ✅ 3. Stock adapter `src/lib/api/fleet/items.ts` (stockPolicies: default store of the header branch; aliases/vendors null) + Vitest
- ✅ 4. Stock list/form on API; category list FLEET_ITEM_CATEGORY, type + UoM from catalogue; policy inputs disabled without a default store; price/ledger fields stay mock
- ✅ 5. EN + TH; tsc clean, Vitest 126 pass, lint 0 errors, build passes
- ✅ 6. `ui-prompts/replies/07_REPLY.md`
- ✅ 7. LIVE checks — done 2026-11-20 (LIVE_TEST_FINDINGS §D)

## Meters + PM Scheduler + PM Due — ui-prompts/08_METERS_PM_P2.md (started 2026-11-20)
> Recovery: read the prompt. No GET /meter-readings/{id}: a saved reading opens from the list's cached row (asked in reply).

- ✅ 1. Adapter `src/lib/api/fleet/meters.ts` (KM/HOUR/BOTH → RecordMeterRequest by asset meterType; list view; review/reverse) + Vitest
- ✅ 2. Shared meter bits: status badge, Accept/Reject/Reverse dialog, asset + driver pickers (datalist inputs)
- ✅ 3. Meter Logs (kind KM) list + form (new = record; saved = read-only + Reverse / Accept / Reject)
- ✅ 4. Meter HR Logs (kind HOUR) list + form, same rules
- ✅ 5. PM Scheduler adapter `src/lib/api/fleet/pm.ts` + list/form (tasks replaced whole; assignments add/remove via own endpoints)
- ✅ 6. New page `/fleet/pm-due` (menu after PM Scheduler, guard fleet.pm.view) + baseline dialog + recalculate
- ✅ 7. EN + TH; tsc clean, Vitest 138 pass, lint 0 errors, build passes (removed unused meter + PM mock adapters)
- ✅ 8. `ui-prompts/replies/08_REPLY.md`
- ✅ 9. LIVE checks — done 2026-11-20 (LIVE_TEST_FINDINGS §D)

## Work Requests + Work Orders — ui-prompts/09_WORK_REQUESTS_ORDERS_P3.md (started 2026-11-20)
> Recovery: read the prompt. Status is the API's (actions, never saved). Lines: whole list with ids; null = unchanged.

- ✅ 1. Shared pickers: party (Platform /api/master/parties) + supplier lookup inputs
- ✅ 2. WR adapter `src/lib/api/fleet/workRequests.ts` (status map, request, actions, convert) + Vitest
- ✅ 3. WR list + form on API (status read-only; Save / Submit / Approve / Reject / Convert / Cancel)
- ✅ 4. WO adapter `src/lib/api/fleet/workOrders.ts` (status map, header, tasks/parts/labor → request with ids + taskSeqNo + charge) + Vitest
- ✅ 5. WO list + form header on API + action toolbar (moves, hold reason, complete meter-out, approval, warning toast) + status log
- ✅ 6. WO line grids editable (services/tasks, parts, labour) via LineItemsEditor
- ✅ 7. EN + TH; tsc clean, Vitest 151 pass, lint 0 new errors, build passes (old WO section files + WR/WO mock adapters removed; monitoring page still mock)
- ✅ 8. `ui-prompts/replies/09_REPLY.md`
- ✅ 9. LIVE checks — done 2026-11-20 (LIVE_TEST_FINDINGS §D)

## WO photos + Inspections — ui-prompts/10_ATTACHMENTS_INSPECTIONS_P3.md (started 2026-11-20)
> Recovery: read the prompt. New pages: /fleet/inspections, /fleet/inspections/checklists, /fleet/defects.

- ✅ 1. `apiUpload` in client.ts; attachments adapter + upload check (type/size) + WO Photos tab (blob URLs, stage, caption, remove)
- ✅ 2. Inspections adapter `src/lib/api/fleet/inspections.ts` (templates, inspections, defects; answer→request, severity→priority) + Vitest
- ✅ 3. Checklists list + form (line grid with move up/down)
- ✅ 4. Inspections list + new form (clientRef, all lines answered) + read-only view with defects
- ✅ 5. Defects list + raise WR / defer / resolve (shared defect row)
- ✅ 6. Sidebar (after Work Requests) + route guards; EN + TH; tsc, Vitest, lint, build
- ✅ 7. `ui-prompts/replies/10_REPLY.md`
- ✅ 8. LIVE checks — done 2026-11-20 (LIVE_TEST_FINDINGS §D)

## Stock + purchasing — ui-prompts/11_INVENTORY_PURCHASING_P4.md (started 2026-11-20)
> Recovery: read the prompt (9 parts A–I). Common: DRAFT then actions; PUT replaces lines; DocumentActionRequest; 409 also = not enough stock / over PO.

- ✅ 1. A: stock form qty (sum of `/stock?itemId=`, pending from `/purchase-orders/open-lines?itemId=`); ledger → question
- ✅ 2. Shared doc helpers `src/lib/api/fleet/documents.ts` (action/approval calls, line types) + status maps B/C + Vitest
- ✅ 3. B: Goods Requests + Requisitions → `components/goods-requests/GoodsRequestViews.tsx` (both routes)
- ✅ 4. C: Purchase Orders → `components/purchase-orders/PurchaseOrderViews.tsx` (shared `components/docs/DocBits.tsx`: fmt, Alert, useSaveFailure, useDocActions); `new?goodsRequestId=` prefill
- ✅ 5. D: Goods Receipts → `components/goods-receipts/GoodsReceiptViews.tsx` (open PO lines picker, bin/lot/serial/expiry/direct-to-WO, Post / Cancel·Reverse); hooks `useOpenPoLines`, `useStockBalances` in documents.ts
- ✅ 6. E: Return to Vendor → `components/return-to-vendor/ReturnViews.tsx` (posted receipt lines picker, reason, Post / Cancel·Reverse)
- ✅ 7. F+G: Goods Adjustments → `components/goods-adjustments/AdjustmentViews.tsx` (signed qty, TRANSFER saves via stock-transfers, `?kind=transfer` route, Ship / Receive all; list merges both)
- ✅ 8. H: Stock Counts → `components/stock-counts/StockCountViews.tsx` + `/fleet/stock-counts` pages; sidebar after Goods Adjustments; guard fleet.stock.adjust
- ✅ 9. I: Spare Parts Monitoring ← stock-issues (`SparePartsMonitorView.tsx`); WO Parts tab "Issue from stock" (`work-orders/IssueFromStockDialog.tsx`, ISSUE / RETURN, issued qty from the WO's posted issues)
- ✅ 10. EN + TH (`docs.*`, nav.stockCounts); tsc clean, Vitest 171 pass, lint clean on new files, build passes; old mock clients/hooks/data removed; `ui-prompts/replies/11_REPLY.md` (7 points)
- ✅ 12. Owner answers (11_REPLY Q1–7): Stock Movement Report (ledger) in Operations Reports, issuedBaseQty, receipt VAT % + discount, supplierName / workOrderNo / assetCode params, transfer-targets endpoint with fallback; backend table at the end of 11_REPLY.md
- ✅ 11. LIVE checks — done 2026-11-20 (LIVE_TEST_FINDINGS §B) (see 11_REPLY.md)

## Repair tariff + recharge — ui-prompts/12_REPAIR_TARIFF_RECHARGE_P5.md (started 2026-11-20)
> Recovery: read the prompt (A tariff pages, B WO buttons, C new Recharges page, D WO invoices). Tariff + invoices are on the PLATFORM API (/api/revenue/...).

- ✅ 1. `npm run api:types` (fleet 130 paths, platform 410); tsc clean
- ✅ 2. Tariff adapter `src/lib/api/platform/repairTariffs.ts` (list/one/save/actions/price-check; lineKind → Applies-to inputs; status badge) + Vitest
- ✅ 3. A: `components/tariff/RepairTariffViews.tsx` (both pages) (Applies-to cell, Submit/Approve/Reject/Withdraw, Copy to new card, Check a price)
- ✅ 4. Recharge adapter `src/lib/api/fleet/recharges.ts` (preview/release/candidates/list/one/retry/refresh/cancel; status + mode badges) + Vitest
- ✅ 5. B: WO form Preview / Release charges (COMPLETED/CLOSED, fleet.recharge.release) + preview dialog
- ✅ 6. C: new `/fleet/recharges` page (To release / Released tabs, row actions, detail drawer) + sidebar after WO Monitoring + route guard
- ✅ 7. D: WO invoices adapter (Platform /api/revenue/fleet/...) + list / detail / new (pick an invoiceable payer)
- ✅ 8. EN + TH (recharge.*, tariff.*, woInvoice.*, nav.recharges); tsc clean, Vitest 183 pass, lint clean, build passes; static `new/` pages + old mock clients removed; `ui-prompts/replies/12_REPLY.md` (8 questions)
- ✅ 10. Owner answers (12_REPLY Q1–8): agent/forwarder removed, standard cards open-ended, canAtBranch() for revenue.* (header / payer branch), withdraw on DRAFT, invoice line fields, invoice list params; cards tenant-wide + permission at current branch (decided); every call sends X-Branch-Id (client.ts, set by useBranchContext); table at the end of 12_REPLY.md
- ✅ 9. LIVE checks — done 2026-11-20 (LIVE_TEST_FINDINGS §C)

## Tyres + axle map 2D / 3D — ui-prompts/13_TYRES_P6.md (started 2026-11-20)
> Recovery: read the prompt (A axle map, B profiles, C changes + maintenance, D pending recap + inquiry). One adapter: `src/lib/api/fleet/tyres.ts`.
> Map: keep the components; `VehicleConfig` gets optional `geometry2D` / `geometry3D` / `label`; `Tire` gets optional `id`, `health`, `pressureAlert`, `costPerKm`, `thresholds` (API values win over the constants).

- ✅ 1. `npm run api:types` (fleet json still 130 paths; all tyre endpoints present); tsc clean
- ✅ 2. Adapter `src/lib/api/fleet/tyres.ts` (map → Vehicle/VehicleConfig both geometries, tyre → Tire, action lines, reason/dest codes, tyreStatus derivation, change lines old/new serial, hooks) + Vitest
- ✅ 3. A: axle map client on the API (asset picker, format 2d / 3d per page, 409 → asset link, actions → POST /tyre-changes one line + refetch, inventory = IN_STOCK tyres); 2D + 3D use API geometry
- ✅ 4. B: tyre profiles list + form on the API (derived status + API status badge, supplier picker, read-only lifetime / installation / costs, history)
- ✅ 5. C: tyre changes + maintenance list / read-only view / new (posted at once)
- ✅ 6. D: pending recap (AT_RECAP, Receive from recap) + inquiry on tyre-events
- ✅ 7. EN + TH (tyre.*, tireMap.*); tsc clean, Vitest 192 pass, lint clean, build passes; old tyre clients/hooks/data/mocks + unused mock type files (11–13) removed; `ui-prompts/replies/13_REPLY.md` (7 questions)
- ✅ 9. Owner answers (13_REPLY Q1–7): documentDate on change/maintenance, driver on map, Repaired action + last-event column, event documentNo/assetCode, FLEET_TYRE_CONDITION list (seed SQL in replies/13_tyre_condition_seed.sql, NOT run), tread editable; backend to-do table at the end of 13_REPLY.md
- ✅ 8. LIVE checks — done 2026-11-20 (LIVE_TEST_FINDINGS §A)

## Fuel + incidents — ui-prompts/14_INCIDENTS_FUEL_P7.md (started 2026-11-22)
> Recovery: read the prompt (A lookups, B fuel, C accidents, D claims, E violations). Backend complete P0–P14; prompts 15–23 follow.
> Pattern: like Work Requests (adapter + `*Views.tsx` + FormClient on the API, actions via ReasonDialog / useDocActions).

- ✅ 1. `npm run api:types`; tsc clean (fixed workOrders.test fixture: issuedBaseQty)
- ✅ 2. A: lookups adapter `src/lib/api/fleet/lookups.ts` (accident types / responsibilities / violation types, staleTime ∞, TH → nameLocal)
- ✅ 3. B: fuel adapter + 5 tests; list / approval (approve, reject+reason, own entry hidden) / form (store+item for OWN_TANK, read-only API costs, Trucking-linked rows); mocks removed; tsc clean `src/lib/api/fleet/fuelLogs.ts` (+ Vitest: status map, OWN_TANK vs VENDOR request) + list / form / approval on the API + Trucking-linked read-only fuel
- ✅ 4. C: accidents adapter + 5 tests; list (status, lookups, no Delete) / form (one third party, WR link + WO table, Raise WR / Close / Cancel, Photos tab via shared `AttachmentsTab` + generic owner hooks in woAttachments.ts); mocks removed; tsc clean
- ✅ 5. D: claims adapter + 4 tests; list (API status, no Delete) / form (accident picker + `new?accidentId=`, editable lines with WO source kept, totals preview, Copy from WOs / Submit / Approve / Reject / Settle / Revise → new draft / Cancel); mocks removed; tsc clean
- ✅ 6. E: violations adapter + 3 tests; list (status, lookups, no Delete, Payroll deductions dialog + CSV) / form (Payment + deduction block, Pay / Deduct / Take back / Refresh / Dispute / Reopen / Cancel); ReasonDialog got reasonLabel + hideReason; mocks removed; tsc clean
- ✅ 7. EN + TH (163 keys, scratchpad merge script); old mocks removed; tsc clean, Vitest 219 pass, lint 0 errors on new files, `next build --webpack` passes
- ✅ 8. `ui-prompts/replies/14_REPLY.md` (6 questions)
- 🔄 9. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## Vendor billing (AP-lite) — ui-prompts/15_VENDOR_BILLING_P8.md (started 2026-11-22)
> Recovery: read the prompt (A unbilled, B invoices, C credit notes, D payments, E export). WO invoices / WO credit notes NOT here.
> P12 (prompt 19) later adds payment approval; P10 (prompt 17) adds the SAP export target.

- ✅ 1. Schemas check (VendorInvoiceDto, UnbilledLineDto, VendorCreditNoteDto, VendorPaymentDto, ApExport*)
- ✅ 2. A: adapter `src/lib/api/fleet/vendorInvoices.ts` unbilled (group per GRN, VAT/net per row) + Vitest; unbilled page on the API, Create Invoice → `/invoice/vendor/new?supplier=&lines=`
- ✅ 3. B (+ 7 tests incl. A/D/E helpers; views in `VendorInvoiceViews.tsx`; tsc clean): invoice adapter (form ↔ request, WHT tick → 3, line sources, actions; own-entry approval hidden) + Vitest; list / form (Add lines picker, Other charge, Submit / Approve / Send back / Cancel, credited / paid / outstanding)
- ✅ 4. C (+ 3 tests; `VendorCreditNoteViews.tsx`, return / invoice-line pickers; mocks removed; tsc clean): credit note adapter `vendorCreditNotes.ts` + Vitest; list / form (invoice / return links, RTV_LINE / INVOICE_LINE / MANUAL lines, Approve / Cancel)
- ✅ 5. D (+ prompt 19 §A payment approval done here: status filter, Approve / Reject, own entry hidden, invoice pendingPaymentAmount; `VendorPaymentViews.tsx`; mocks removed): payments list on `/vendor-payments` (no approval: Approve + Pending hidden) + "Record payment" form (invoice with outstanding > 0, amount, date, ref; reversal) + Vitest
- ✅ 6. E (in `VendorInvoiceViews.tsx`, tabs Pending / History): Export dialog on the invoice list (pending → tick → POST → batch + Download CSV) + history
- ✅ 7. EN + TH (104 keys); old mocks removed; tsc clean, Vitest 230 pass, lint 0 errors, build passes
- ✅ 8. `ui-prompts/replies/15_REPLY.md` (5 questions)
- 🔄 9. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## Dashboard + reports + inquiries — ui-prompts/16_REPORTS_DASHBOARD_P9.md (started 2026-11-22)
> Recovery: read the prompt (A dashboard, B 19 reports, C 5 inquiries, D cost = report only, E fuel summary / driver incidents optional).

- ✅ 1. Survey dashboard / report / inquiry screens + schemas
- ✅ 2. A (header branch; cost figures not shown — no place, asked): dashboard adapter `src/lib/api/fleet/dashboard.ts` (stats → 6 cards, change %, fleet status, recent WOs, upcoming PM) + Vitest; page on the API
- ✅ 3. B (`useReportScreen.ts`, params components take `fields`; 5 tests incl. dashboard): reports adapter `src/lib/api/fleet/reports.ts` (catalogue, params → visible fields, run json, cell formatter, pdf / xlsx download) + Vitest; both report pages + Stock Movement
- ✅ 4. C (generic `InquiryView.tsx`; inquiry route guards → fleet.report.view; old inquiry clients, TyreEventInquiryView + 6 unused mocks removed): 5 inquiry pages on `/inquiry/{code}` (filters mapped, export, WIP daysOpen orange)
- ✅ 5. E: no room on the driver form → asked in the reply (not built): driver incidents on the driver form only if room (else ask)
- ✅ 6. EN + TH (18 keys); old mocks removed; tsc clean, Vitest 234 pass, lint clean, build passes
- ✅ 7. `ui-prompts/replies/16_REPLY.md` (5 questions); commit + push to clean-push
- 🔄 8. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## SAP Business One — ui-prompts/17_SAP_B1_P10.md (started 2026-11-22)
> Recovery: read the prompt (A two Setup tabs, B export target, C retry / payment pull / reconciliation). Simulator: baseUrl `fake://demo`.

- ✅ 1. (4 tests) ERP adapter `src/lib/api/fleet/erp.ts` (connection, test, mappings, pull payments, reconciliation, retry) + mapping rules + Vitest
- ✅ 2. (`fleet-setup/ErpTabs.tsx`) A: Fleet Setup tabs "ERP connection" (+ Test) and "ERP mappings" (grouped by type, GL select, BP supplier picker)
- ✅ 3. (dialog moved to `vendor-invoices/ExportDialog.tsx`, tabs Ready / Earlier / SAP payments / Reconcile; ERP payments not reversible) B: Export dialog target CSV / SAP + per-document result; C: batch view retry, Pull SAP payments, Reconcile tab; SAP badge on payments
- ✅ 4. EN + TH (74 keys); tsc clean, Vitest 238 pass, lint clean, build passes; `replies/17_REPLY.md`; commit + push
- 🔄 5. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## Go-live tools — ui-prompts/18_GO_LIVE_P11.md (started 2026-11-22)
> Recovery: read the prompt (A Opening balances tab with 4 cards, B Sync everything from Trucking, C meter source badges).

- ✅ 1. (2 tests) Adapter `src/lib/api/fleet/openingBalances.ts` (template, check / import, sync) + rules (import only after clean check of the same file) + Vitest
- ✅ 2. (`fleet-setup/OpeningBalancesTab.tsx`) A + B: Fleet Setup tab "Opening balances" (Meters, PM baselines, Stock, Tyres cards; Sync everything from Trucking)
- ✅ 3. (`MeterSourceBadge`, lists + forms) C: OPENING / TRUCKING meter source badge colours
- ✅ 4. EN + TH (37 keys); tsc clean, Vitest 240 pass, lint clean, build passes; `replies/18_REPLY.md`; commit + push
- 🔄 5. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## Gap closing 1 — ui-prompts/19_GAP_CLOSING_P12.md (started 2026-11-22)
> Recovery: A payment approval was DONE in prompt 15 (VendorPaymentViews.tsx); B stock reservations; C depreciation = catalogue column (check only).

- ✅ 1. A: payment approval (status filter, Approve / Reject, own entry hidden, invoice pendingPaymentAmount) — done with prompt 15; VENDOR_PAYMENT_APPROVAL setting appears via the settings catalogue
- ✅ 2. (3 tests) B: reservations adapter (`stockReservations.ts`: list / reserve / release, reserve-qty default) + Vitest
- ✅ 3. (shared `docs/ReserveStockDialog.tsx` + `ItemReservations`) B: Reserve on WO part lines + goods-request lines (store chosen); Stock form: real reserved / available qty + "Reserved" list with Release
- ✅ 4. (no code; live check) C: check the Service Cost Summary preview shows the catalogue's Depreciation column (no code)
- ✅ 5. EN + TH (15 keys); tsc clean, Vitest 244 pass, lint 0 errors, build passes; `replies/19_REPLY.md`; commit + push
- 🔄 6. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## Gap closing 2 — ui-prompts/20_GAP_CLOSING_P12_PART2.md (started 2026-11-22)
> Recovery: read-only "Stock cost corrections" grid (GET /cost-adjustments) on the vendor invoice form (APPROVED+) and the Stock form.

- ✅ 1. (1 test) Adapter `costAdjustments.ts` (rows, reversal flag) + Vitest; shared `docs/CostCorrections.tsx`
- ✅ 2. On the invoice form (header tab, APPROVED / EXPORTED / PAID / CANCELLED) and the Stock form (under Reserved)
- ✅ 3. EN + TH (9 keys); tsc clean, Vitest 245 pass, lint 0 errors, build passes; `replies/20_REPLY.md`; commit + push
- 🔄 4. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## WO credit notes — ui-prompts/21_WO_CREDIT_NOTES_P12.md (started 2026-11-22)
> Recovery: Platform API `/api/revenue/credit-notes` (source=FLEET). Screens: `components/credit-notes/WOCreditNote*`.

- ✅ 1. (3 tests) Adapter `src/lib/api/platform/creditNotes.ts` (list, one, creditable, issue, cancel; status map; credit ≤ remaining) + Vitest
- ✅ 2. (customer filter = PartyCodeInput CUSTOMER) A: list on the API (filters mapped, ISSUED = Active)
- ✅ 3. (`WOCreditNoteViews.tsx`; route guard → revenue.*) B: form — new (customer → WO invoice → creditable lines + Credit amount, reason) / existing read-only + Cancel
- ✅ 4. EN + TH (23 keys); mocks removed; tsc clean, Vitest 248 pass, lint 0 errors, build passes; `replies/21_REPLY.md`; commit + push
- 🔄 5. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## Backend to-do shipped — ui-prompts/22_BACKEND_TODO_P13.md (started 2026-11-22)
> Recovery: remove the UI fallbacks for backend items #1–#20 (no redesign). Findings in replies/22_REPLY.md.

- ✅ 1. Find every fallback (grep: GOOD/FAIR/POOR, transfer-targets 404, client-side filters, invoice line charge join, withdraw on DRAFT, issued qty, tyre last event, axle-map driver, documentDate)
- ✅ 2. Fleet items (#1, #4–#12, #17) fallbacks removed / bound
- ✅ 3. Platform items (#13–#15) fallbacks removed / bound
- ✅ 4. tsc clean, Vitest 247 pass, lint clean, build passes; `replies/22_REPLY.md`; commit + push
- 🔄 5. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## Subcon deduction tax invoice — ui-prompts/23_SUBCON_DEDUCTION_TAX_INVOICE_P14.md (started 2026-11-22)
- ✅ 1. (1 test) Adapter (platform `subconDeductionInvoices.ts`) + show the tax invoice no on DEDUCTED recharges (detail drawer); WO invoice list: propose only
- ✅ 2. EN + TH; checks pass; `replies/23_REPLY.md`; commit + push
- 🔄 3. LIVE (2026-11-22): API flows PASS — see LIVE_TEST_FINDINGS §F; browser walk-through open (PC out of commit memory, F4)

## Backend #21 / #22 (live findings F2 / F3) — shipped by the backend 2026-11-22 (platform db889b7)
- ✅ 1. (2026-11-22, both VERIFIED — LIVE_TEST_FINDINGS re-test section) Re-test on the rebuilt APIs: `npx vitest run --config live/vitest.config.mts live/p_fix2122.live.ts --pool=threads` (APIs were down at 2026-11-22 after the backend change)
- ✅ 2. (it did exist: CANCELLED with 100.00 waiting → rejected by ops.lcb) Check: the backend says `VIN-SCT-LCB01-2611-00185` no longer exists locally — the live run created it on this PC's DB (the re-test prints whether it is there)

## Owner-approved proposals (2026-11-22): transfer targets + WO invoice source filter
- ✅ 1. (`stores/TransferTargetsTab.tsx`; live: LIST saved, transfer elsewhere → 400, reset ANY) Stores form: "Transfer targets" (any active store / only the ticked stores) → PUT /warehouses/{id}/transfer-targets; fleet.inventory.manage at the store's branch
- ✅ 2. (`wo-invoices/SubconDeductionViews.tsx`; live: list answers, none yet) WO invoice list: "Source" select (WO invoices / Subcontractor deductions); deductions from GET /api/revenue/subcon-deduction-invoices, read-only drawer with lines
- ✅ 3. EN + TH (22 keys); Vitest 251 pass; tsc, lint clean; build passes; live check; commit + push

## Conventions for the next prompts (from 03–13)
> Write the step list here first (like the blocks above), then build. Reuse what 03–10 built:
> - adapters `src/lib/api/fleet/<entity>.ts`: `toViewModel`/`toFormValues`, `toRequest` (send fields with no input as read),
>   React Query hooks with keys `['fleet', '<entity>', tenant, ...]`, mutations invalidate the entity key; Vitest per adapter.
> - pages: server `page.tsx` shell → client `*Views.tsx` (`ListPage` + existing list client fed DTO rows mapped to the old
>   row shape; `[id]` view: `new` / loading / 404 / form keyed by `rowVersion`). Delete hidden where the API has none.
> - shared: `LineItemsEditor` (grids), `ReasonDialog` + `ToolbarButton` (status actions), `handleSaveError` (409/400),
>   `AssetCodeInput` / `DriverCodeInput` (meters/MeterBits), `PartyCodeInput` / `SupplierCodeInput` (shared/PartyInputs),
>   `FormField` (Field/inputClass), `optNum` (utils/zod), `useCodeList`, `useDefaultWarehouse`, `useItems`, `useWarehouses`.
> - i18n: a node script in the scratchpad that merges `{key: [en, th]}` into both JSON files; check no key is missing.
> - verify: `npx tsc --noEmit -p .`, `npx vitest run`, `npx eslint <new files>`,
>   `PLATFORM_API_ORIGIN=https://localhost:5100 FLEET_API_ORIGIN=https://localhost:5300 npx next build --webpack`.
> - Do NOT run `next build` while `npm run dev` is running on this PC: Turbopack in the dev server panics (low memory); stop dev first or restart it after.
> - Bash heredocs with long mixed quotes fail: write python/node edit scripts to the scratchpad and run them.

### Adapter pattern for screen migration (prompt 01 §2.9)
When an entity's endpoints are marked "live" in `ui-prompts/README.md`:
1. `src/lib/api/fleet/<entity>.ts`: the calls (`apiGet` / `apiSend` from `client.ts`, types from `fleet.schema.ts`) plus
   `toViewModel(dto)` / `toRequest(viewModel)` mapping. UUID strings stay strings; field renames, status mapping and
   read-only flags live here, not in the screens.
2. A React Query hook with the **same signature the screen uses today** (`src/lib/hooks/use<Entity>.ts`); query keys
   `['fleet', '<entity>', ...]` incl. tenant/branch where relevant; mutations invalidate the list key.
3. Swap the hook's import in the screen. Screen layout stays as it is (UI policy).
4. Fields the API does not have yet stay on the mock adapter (merge mock + API in the hook) until the backend adds them.
5. Writes send `rowVersion`; 409 → "changed by someone else" + refetch; 400 → `ApiError.forField()` next to inputs; texts via `errorText(err, t)`.
6. Screens currently read mocks in server components (`src/lib/data/*.ts`): migrated screens become client components that call the hook (the token is in browser memory only).
Mocks stay for every entity not yet live.

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
- ✅ i18n setup (no URL prefix, EN + TH JSON files)
- ✅ Auth (login page, session guard on dashboard layout) — prompt 01 steps 6–8
- ✅ React Query provider + API client base (`lib/api/client.ts`) — prompt 01 steps 4, 9

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
