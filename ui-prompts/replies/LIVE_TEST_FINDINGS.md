# Live test findings (2026-11-20)

**Status of every UI item below: PROPOSED — owner review required before any UI change.** No UI code was changed
during the live tests (owner instruction). Backend items are for the API owner.

Setup: Platform API (5100) + Fleet API (5300) from `platform/` (`dotnet run`, Development), web app `npm run dev`
(https://localhost:5001). All calls go through the app's proxy with the same paths and bodies the screens send.
Test company **SCT-TEST** only (`admin@sct-test.example`; prompt 01 §4: safe to change). Scripts:
session scratchpad `lt/*.mjs` (not part of the repo).

## 0. Baseline
- Every read endpoint used by prompts 03–13 → 200 for the owner; `ops.lcb` branch-limited; `gate1.lcb` 403 on fleet
  data; SSS owner sees none of SCT-TEST's assets.
- Seeded through the UI calls: Fleet Setup initialize (17 series / 14 settings / 10 axle layouts), Sync from Trucking
  (3 assets, 2 drivers). `FLEET_TYRE_CONDITION` returns the 14 seeded codes.

## A. Tyres (prompt 13) — 48 / 52 pass
Passed: asset PUT with an axle layout; 409 "no axle layout" on another asset; store create; tyre register (4);
duplicate serial refused; `PUT /tyres/{id}` keeps `currentTreadMm` (13 Q7); map 2D (geometry2D only, one wheel per
position, positions `1L 1R 2LO 2LI 2RI 2RO SP1`, tenant thresholds 7 / 4 / 10 %) and 3D (FLAT spare); INSTALL × 2;
INSTALL on a taken position → 400 "Line 1: …"; ROTATE onto an occupied position swaps; INSPECT 3.5 mm / 90 psi →
health `critical` + `pressureAlert`; REPLACE (old → RECAP → `AT_RECAP`); RECEIVE_RECAP → type RECAP, count 1, new
tread, IN_STOCK; REMOVE → REPAIR → `AWAITING_REPAIR`; REPAIR line → back IN_STOCK (confirms 13 Q3); change documents
numbered, REPLACE = REMOVE + INSTALL of one `lineNo`; maintenance 3 500 + 7 % = 3 745; `documentDate` accepted
(ignored until added).

| # | Finding | Evidence | Backend | UI (PROPOSED — owner review) |
|---|---|---|---|---|
| A1 | **Tyre condition is validated against a fixed list** `GOOD / FAIR / POOR` (`[AllowedValues(null,"GOOD","FAIR","POOR")]` in `Gecko.Fleet/Endpoints/Tyres/TyreEndpoints.cs:26`). The owner decided a code list (13 Q6) and the UI now offers the 14 `FLEET_TYRE_CONDITION` codes → `NEW`, `WORN`, … are refused with 400 "The Condition field does not equal any of the values specified". | register with `condition: "NEW"` → 400 | Replace `AllowedValues` with a check against `FLEET_TYRE_CONDITION` (active codes of the tenant). **Blocking** for the profile form and tyre-change lines. | None if the backend changes. Fallback if it will not: limit the UI list to GOOD / FAIR / POOR (`DEFAULT_TYRE_CONDITIONS` in `lib/api/fleet/tyres.ts`). |
| A2 | **REMOVE → STOCK with no `warehouseId` and no default store** leaves the tyre IN_STOCK with `warehouseId: null`, no error. 13 Q5 assumed the branch default store; SCT-TEST's branch has none. | tyre `LT…-1` after REMOVE: `IN_STOCK`, `warehouseId null` | Refuse (400 "Line n: no default store at this branch — choose a store") or require `warehouseId` when there is no default. | Add an optional **Store** select to the map's remove / replace dialog when the destination is STOCK (prefilled with the branch default). Touches `TireActionDialog.tsx` + `TireAxleMapClient.tsx`. |
| A3 | Driver on the map (13 Q2) not in the response yet | `AxleMapDto` keys | add `driverId/driverCode/driverName` | none (UI already reads it) |
| A4 | Last-event fields on tyres (13 Q3) not in the response yet | `TyreDto` keys | add `lastEventAt/lastEventType/lastDocumentNo/lastPartyCode` | none (UI already reads them) |
| A5 | `documentNo` / `assetCode` on tyre events (13 Q4) not in the response yet | `TyreEventDto` keys | add them | none (UI already reads them) |

## B. Stock and purchasing (prompt 11) — 47 / 49 pass (+ filter probes)
Passed: default store + bin + store at another branch; items (NONE + LOT tracked) with a stock policy; supplier create
(Platform); work order with a STOCK part; goods request create + submit (APPROVED at once, no policy) → numbered
`GRQ-SCT-LCB01-2611-…`; **PO from the request's open lines** + submit → APPROVED; totals exact (10 × 120 − 10 % = 1 080;
20 × 250 − 100 = 4 900; subtotal 5 980 − 50 + VAT 7 % = **6 345.10**); send; request lines ordered (10/0, 20/0) and
cancel then refused 409; receipt of a LOT item without lot → 400; receipt post 6 + 20 with lot / expiry, VAT 7 % and
discount 10 → 5 548 − 10 + 387.66 = 5 925.66 (11 Q4 works on the API); PO → PARTIALLY_RECEIVED; over-receipt → 409
"Line 1: 10 H87 is more than the 4 still open on the PO …"; stock on hand 6 @ avg 108, pending 4 (stock form);
ledger shows the receipt (Stock Movement Report); issue 2 to the WO part + return 1; over-issue → 409 "Not enough
stock: 5 available, 999 needed"; WO part cost from the stock average (108); return to vendor posted (credit 108);
cancelling a receipt with a return → 409; adjustment INCREASE posted, DECREASE sent as −1 (amount −103.5556), positive
DECREASE refused; transfer ship → IN_TRANSIT → receive; stock count: post before counting refused, counts + post →
linked COUNT adjustment.

| # | Finding | Evidence | Backend | UI (PROPOSED — owner review) |
|---|---|---|---|---|
| B1 | New list params are **ignored** today: `supplierName` (PO / receipts / returns), `workOrderNo` / `assetCode` (stock issues), `search` on fleet invoices — a value matching nothing still returns every row. `search` on POs works. | probes in `c_filters.mjs` | Add them (11 Q5, 12 Q7). | none — the screens still filter the loaded rows meanwhile. |
| B2 | `issuedBaseQty` not on `WoPartDto` yet (11 Q3) | WO part keys | add it | none (UI reads it when present) |
| B3 | `GET /warehouses/{id}/transfer-targets` → 404 (11 Q6) | status 404 | add the configured list + endpoint | none (UI falls back to all stores) |
| B4 | Amounts come back with 4 decimals (adjustment −103.5556, average cost) | adjustment `totalAmount` | fine for stock value; round to 2 on documents shown to people? | none — the screens already format money to 2 decimals. |

## C. Repair tariff, recharge, WO invoice (prompt 12) — 45 / 48 pass
Passed: "Line 1: LABOR needs a time band and a rate per hour." (400); standard card DRAFT, open-ended; submit;
approve (self-approval **allowed** in SCT-TEST); PUT on an APPROVED card → 409 "frozen … Copy it into a new card";
customer card for CUS-BKF; standard / customer lists separated; price check → `WO_LABOR 2×400 = 800 [LT-CUS-…:1]`;
WO save with billable lines and **no bill-to / mode → API filled CUS-BKF / INVOICE**; preview before COMPLETED →
409; completing needs meter-out (the WO form's Complete dialog sends it — same order as the screen); candidates;
preview = one INVOICE group (PART 108 at COST, LABOR 800 from the customer card); release → `…-R1` ACCEPTED, WO
BILLED; second release → 409; recharge split L 800 / P 108, VAT 63.56; invoiceable + READY charges (with asset /
source / ref); invoice issued `INV-SCT-LCB01-2611-00105` 908 + 64 = 972 (VAT whole baht); refresh → recharge
INVOICED with the invoice no; cancel after invoicing → 409.

| # | Finding | Evidence | Backend | UI (PROPOSED — owner review) |
|---|---|---|---|---|
| C1 | **Withdraw from DRAFT refused** (12 Q4 said DRAFT / PENDING / APPROVED): 409 "A draft card cannot be withdrawed." (also: "withdrawed" → "withdrawn") | withdraw on a DRAFT card | allow DRAFT → WITHDRAWN (or tell us to drop it) | The UI already offers Withdraw on DRAFT (after 12 Q4) → users get a 409 until the backend changes. Option: keep as is (backend fix coming) **or** hide Withdraw on DRAFT for now in `RepairTariffViews.tsx`. Owner to choose. |
| C2 | **A customer card replaces the standard card entirely**: CUS-BKF's card has only LABOR, so its parts were priced **at COST** (not the standard 20 % markup) and **no shop-supplies sundry** was added (the standard card's SUNDRY line). | preview: `PART 1×108=108 [COST]`, 0 sundries on the WO | **Decision needed (owner):** should missing kinds fall back to the standard card (usual tariff behaviour), or is a customer card complete on its own? | none either way (UI shows what the API prices). If "complete on its own" is intended, a hint on the customer-card form ("lines missing here are charged at cost") could help — PROPOSED. |
| C3 | Invoice lines do not carry `assetCode / sourceLineType / rateCardRef / rechargeNo` yet (12 Q6) | invoice line keys | add them | none (UI joins `/fleet/charges` meanwhile) |
| C4 | Recharge total 971.56 vs invoice total 972 (VAT rounded to whole baht on the invoice only) | R1 971.56 / INV 972 | expected per prompt 12 §D — confirm it is fine that the two differ by the rounding | none |
| C5 | After release the recharge is ACCEPTED; it shows INVOICED / DEDUCTED only after someone presses **Refresh** | refresh → INVOICED | could Revenue / Trucking push the status back (event) so no manual refresh is needed? | PROPOSED (optional): Recharges page refreshes ACCEPTED rows automatically when opened. Owner to decide. |

## Owner decisions on the review items (2026-11-20)
| # | Decision | Status |
|---|---|---|
| A1 | Bind the 14 codes from the lookup API. | **UI: already done** — the profile form and tyre-change lines read `GET /api/master/code-lists/FLEET_TYRE_CONDITION` (existing Platform endpoint; built-in copy of the same 14 codes only while it is unavailable). **Backend to do (blocking):** drop `[AllowedValues(null,"GOOD","FAIR","POOR")]` on `Condition` in `Gecko.Fleet/Endpoints/Tyres/TyreEndpoints.cs:26` and validate against the tenant's active `FLEET_TYRE_CONDITION` codes (same for `TyreAction.condition`). |
| A2 | Optional Store on remove / replace to STOCK — agreed. | **UI: done** — `TireActionDialog` shows a Store select (stores of the vehicle's branch, prefilled with the default; empty = branch default; amber hint when the branch has no default); `REMOVE` / `REPLACE` lines send `warehouseId`. Verified live: the removed tyre lands in the picked store. **Backend (recommended):** refuse STOCK with no store and no default (400). |
| C1 | Hide Withdraw on DRAFT for now. | **UI: done** — Withdraw shows on PENDING / APPROVED only (`RepairTariffViews.tsx`). |
| C2 | Anything missing from a customer card always falls back to the standard card. | **Backend to do:** price each line from the customer card first, then the standard card (labour, flat, markup, part price, sundries incl. shop supplies / minimum charge); `rateCardRef` should name the card that priced the line. UI: no change. |
Checks after the UI changes: `tsc` clean, Vitest 202 pass, lint clean on the changed files, `next build --webpack` passes.

## D. Prompts 03–10 — all pass (42 checks after correcting the test script)
Asset edit (remarks) + stale `rowVersion` → 409; technician create with skills / duplicate code → 409 / edit;
FLEET driver create + edit; a TRUCKING driver's identity is not changed by PUT; supplier edit with the UI's body
(terms as read + `rowVersion` + party fields + `partyRowVersion`); service type create; item policy edit; meter record
(returns an **array** — the UI expects that) + reverse; PM program + assignment + PM-due row + baseline (PUT, date
only — as the UI sends) + recalculate; work request (source MANUAL) submit → APPROVED at once (no policy) → convert to
a WO; reject on an approved request → 409; WO on hold without a reason → 400, with WAITING_PARTS → OK; status log;
WO photo upload (PNG) / list / content / remove; WO cancel; checklist (PASS_FAIL + NUMBER with range); inspection
with a missing answer → 400; inspection with a FAIL + tread 3 mm (< 4) → `INS-…` result FAIL, 2 defects; same
`clientRef` again → the same inspection (retry-safe); defect → raise WR / defer to a past date → 400 / defer / resolve.

The first run's failures were all **test-script values**, checked against the UI code: skill level `JUNIOR` (UI offers
TRAINEE / SKILLED / SENIOR / MASTER = the API's list), WR source `WORKSHOP` (UI sends MANUAL), baseline sent as POST +
date-time (UI sends PUT + date), inspection `clientRef` not a UUID (UI uses `crypto.randomUUID()`), no "get one
checklist" endpoint (the UI uses the list, which carries the items). **No UI change needed for 03–10.**

## E. Prompt 02 (Fleet Setup) + session — 38 / 38 pass (2026-11-20, second run)
Script: session scratchpad `lt/setup02.mjs`. Every row it creates is deleted again (overrides at SCT-LCB01).
- Session: login → token + refresh cookie (`HttpOnly; Secure; SameSite=Strict; Path=/auth`, 30 days); token dropped
  (= page reload) → `/auth/refresh` 200 → `/auth/me` modules incl. FLEET; logout 204 → refresh 401.
- Initialize again = 0 / 0 / 0 added (idempotent); catalogue 17 series / 14 settings.
- Number series: branch override create / update / 409 stale / 400 (`datePartFormat`, `numberLength`) / 409 duplicate /
  delete. API example `LTX-SCT-LCB01-2611-00001` = the UI's `exampleNumber()` for the same fields.
- Settings: branch override → effective source BRANCH; 409 stale; 400 out of range; delete → source TENANT.
- Approvals + labour rates: create / update / 409 / 400 / delete.
- ops.lcb: effective settings 200; number series list + setting save 403 (UI shows Settings read-only: matches).
- Not testable: "Fleet not enabled" page — every test tenant has FLEET (SCT-TEST, SSS). Needs a tenant without it.
No UI change needed.
