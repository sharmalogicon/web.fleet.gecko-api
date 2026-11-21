# 13 — Tyres on the real API, axle map in 2D and 3D (P6)

You are the UI session for **Gecko Fleet**. Prerequisites: **01**, **03** (assets + axle layouts). Regenerate the types
(`npm run api:types`; `fleet-api.json` re-exported 2026-11-19: **131 paths, 207 schemas**). Read the UI change policy.

Same screens, real data: `/fleet/tires/profiles` (+ `[id]`), `/fleet/tires/changes` (+ `[id]`), `/fleet/tires/maintenance`
(+ `[id]`), `/fleet/tires/pending-recap`, the axle maps **`/fleet/tires/axle-map` (2D)**, **`/fleet/tires/axle-map-3d` (3D)**,
`/fleet/tires/bay`, and `/inquiry/tire-changes`. No new page. Permissions: `fleet.tyre.view` (read) / `fleet.tyre.manage`.

## A. Axle map — ONE endpoint, TWO formats (owner requirement: 2D and 3D)
`GET /api/fleet/assets/{assetProfileId}/axle-map?format=2d|3d|both` (default `both`) →
- **Shared model (both views):** `assetCode`, `registrationNo`, `layoutCode`, `layoutName`, `bodyStyle` (RIGID / TRACTOR /
  TRAILER / EQUIPMENT → the UI's `body` rigid / tractor / trailer), `spareCount`, `odometerKm`, `axles[]`
  (`axleNo`, `axleKind` STEER/DRIVE/TRAILER/LIFT → steer/drive/trailer/lift, `isDual`, `tyreSizeCode`), and `positions[]` in
  the UI's own order and codes (`1L, 1R, 2LO, 2LI, 2RI, 2RO … SP1` — identical to `positionsFor()`), each with
  `axleNo`, `side` L/R/S, `inner`, and **`tyre`** (null = empty slot): `tyreId, serialNo, brandCode, modelName, sizeCode,
  tyreType` NEW/RECAP, `recapCount, treadMm, originalTreadMm, pressurePsi, targetPsi, km` (all lives, incl. the current
  fitment), `cost, costPerKm, installedAt`, **`health`** good/warning/critical and **`pressureAlert`** — computed by the API
  from the tenant settings in `thresholds` (`treadWarningMm` 7, `treadCriticalMm` 4, `pressureTolerancePct` 10, the values
  hard-coded in `types/tire-axle-map.ts` today: use the API's, drop the constants' role as the source of truth).
- **`geometry2D`** (format 2d / both) — for `AxleDiagram.tsx` / the bay view: SVG top-down, `viewBoxWidth` 400 ×
  `viewBoxHeight`, `centreX` 200, `railOffsetX`, `frameTopY` / `frameBottomY`, `axleY[]`, and `wheels[]` `{ code, x, y (centre),
  width 24, height 50, rotationDeg (90 for spares) }` — the same constants the component uses now (single ±104, dual
  ±118 / ±90), so you can place wheels from the API instead of recomputing.
- **`geometry3D`** (format 3d / both) — for `AxleDiagram3D.tsx`: metres, x = right of the driver, y = up, z = towards the
  rear (front axle z = 0); `wheelRadius` 0.5, `wheelWidth` 0.26, `frameHeight` 0.92, `railOffsetX`, `lengthZ`, `axleZ[]`, and
  `wheels[]` `{ code, x, y, z, radius, width, orientation }` — ROLLING (upright, axle along x) or **FLAT** (a spare under the
  chassis). Steer→drive wheelbase 3.6 m, tandem 1.3 m.
The 2D page asks `format=2d`, the 3D page `format=3d`, the bay view `format=2d`. A 409 means the asset has no axle layout
(link to the asset form). Replace the mock `Vehicle` / `VehicleConfig` with this response (one adapter).

**Actions from the map** (`TireActionDialog`) all go through `POST /api/fleet/tyre-changes` (below) with ONE line:
install → `INSTALL {position, tyreId}`; replace → `REPLACE {position, tyreId (new), reasonCode, destination, treadBeforeMm}`;
remove → `REMOVE {position, reasonCode, destination, warehouseId?, treadMm}`; rotate → `ROTATE {position, toPosition}`
(an occupied target **swaps** the two tyres); inspect → `INSPECT {position, treadMm, pressurePsi, condition}`. Send the
odometer the user keys as `meterKm` (stored as a meter reading; km run is counted from it). After success re-fetch the map.
Reason codes: WORN_OUT, PUNCTURE, SIDEWALL, IRREGULAR_WEAR, SEPARATION, ROTATION, RECAP, OTHER (the UI's `RemovalReason`
in upper snake case); destinations STOCK, RECAP, REPAIR, SCRAP. The inventory panel (tyres to fit) =
`GET /api/fleet/tyres?status=IN_STOCK`.

## B. Tyre profiles (`/fleet/tires/profiles`)
`GET /api/fleet/tyres?search=&status=IN_STOCK|FITTED|AWAITING_REPAIR|AT_RECAP|SCRAPPED&assetProfileId=&warehouseId=&page=&pageSize=`,
`GET …/{id}`, `POST` (register: IN_STOCK at `branchId` / `warehouseId`), `PUT …/{id}` (+ `rowVersion`; status and place change
only through actions).
| Field (`tire-profile.ts`) | API |
|---|---|
| `serialNo`, `brand`, `model`, `tyreSize` | `serialNo` (unique), `brandCode`, `modelName`, `sizeCode` |
| `tyreStatus` NEW / USED / RECAP / SCRAP | read-only, derived: SCRAPPED → SCRAP; `tyreType` RECAP → RECAP; else `lifetimeKm` > 0 → USED, else NEW. Show the API `status` as a second badge |
| `condition`, `tyrePressure`, `tyreThread` | `condition`, `lastPressurePsi`, `currentTreadMm` (also `originalTreadMm`, `targetPsi`) |
| `anticipatedMileage` / `actualMileage`, `anticipatedHour` / `actualHour` | `expectedKm` / `lifetimeKm` (read-only), `expectedHours` / `lifetimeHours` (read-only) |
| `purchasedDate`, `purchasedPrice`, `vendorName`, `vendorInvoiceNo`, `poNo` | `purchasedDate`, `purchaseCost`, `supplierPartyCode` (supplier picker), `vendorInvoiceNo`, `purchaseOrderNo` |
| `warrantyMileage`, `warrantyDate` | `warrantyKm`, `warrantyUntil` |
| `equipmentCode`, `registrationNo`, `tyrePosition`, `dateInstalled` (Installation tab) | read-only `assetCode`, `positionCode`, `installedAt` (registration from the asset) — fitting is done on the axle map / tyre change |
| `timeRecaped`, `recapCost`, `totalInspectionCost`, `totalRepairCost` | `recapCount`, `recapCostTotal`, `inspectionCostTotal`, `repairCostTotal`; plus `totalCost`, **`costPerKm`** |
| `isActive`, `remarks` | `isActive`, `remarks` |
History on the form (optional list): `GET /api/fleet/tyre-events?tyreId=`.

## C. Tyre changes (`/fleet/tires/changes`) and maintenance (`/fleet/tires/maintenance`)
List: `GET /api/fleet/tyre-documents?kind=CHANGE|MAINTENANCE&assetProfileId=&search=&from=&to=&page=&pageSize=`; detail `GET …/{id}`.
New: **`POST /api/fleet/tyre-changes`** `{ assetProfileId, lines, meterKm?, meterHours?, workOrderId?, driverId?, performedByName?, category?, remarks? }`
and **`POST /api/fleet/tyre-maintenance`** `{ branchId, lines, supplierPartyCode?, assetProfileId?, inspectorName?, inspectionDate?,
requiredDate?, billToPartyCode?, taxRate, remarks? }` — both are **posted at once** (numbers FLT_TCH / FLT_TMN); the saved
document is read-only, its `lines` are the tyre events. A wrong line is corrected with a new document (e.g. REMOVE). Errors:
400 `lines` "Line n: …" (taken position, tyre not in stock, unknown position).
| Change header (`tire-change.ts`) | API |
|---|---|
| `documentNo`, `changeDate`, `changeBy` | `documentNo`, `documentDate`, `performedByName` |
| `equipmentCode`, `equipmentType` | `assetProfileId` → `assetCode` (type from the asset) |
| `workOrderNo`, `driverName`, `meterRead`, `totalHrs`, `category`, `remarks` | `workOrderId`, `driverId`, `meterKm`, `meterHours`, `category`, `remarks` |
| lines `tyrePosition`, `oldSerialNo` → `newSerialNo`, `condition`, `remarks` | send REPLACE `{position, tyreId (new), reasonCode, destination}` (or INSTALL / REMOVE / ROTATE); back: events of one `lineNo` — the REMOVE row's `serialNo` = old, the INSTALL row's = new |

| Maintenance header (`tire-maintenance.ts`) | API |
|---|---|
| `documentNo`, `documentDate`, `vendorName`, `inspector`, `inspectionDate`, `requiredDate` | `documentNo`, `documentDate`, `supplierPartyCode`, `inspectorName`, `inspectionDate`, `requiredDate` |
| `equipmentCode`, `billingCustomerName`, `remarks` | `assetProfileId`, `billToPartyCode`, `remarks` |
| `totalAmount`, `vat`, `vatAmount`, `nettAmount` | read-only `subtotalAmount`, `taxRate`, `taxAmount`, `totalAmount` (sum of line costs + VAT) |
| lines `transactionType` INSPECTION / REPAIR / RETREAD, `serialNo`, `tyreThreadBefore` / `After`, `remarks` | `action` INSPECTION / REPAIR / RETREAD (= send to the recapper) / **RECEIVE_RECAP** (back: type RECAP, recap count + 1, new tread) / SCRAP; `tyreId`, `treadBeforeMm` / `treadMm`, `cost`, `remarks` |

## D. Pending recap and the inquiry
- `/fleet/tires/pending-recap` = `GET /api/fleet/tyres?status=AT_RECAP` (add a second tab "Awaiting repair" = `status=AWAITING_REPAIR`
  only if the page has tabs; otherwise ask in the reply). Row action **Receive from recap** → `POST /tyre-maintenance` with one RECEIVE_RECAP line.
- `/inquiry/tire-changes` = `GET /api/fleet/tyre-events?assetProfileId=&tyreId=&type=&from=&to=&page=&pageSize=` (event type, serial,
  from / to position, km, tread, reason, document no via `tyreDocumentId`).

## Done when
- [ ] 2D map (`format=2d`), 3D map (`format=3d`) and bay view on the API, positions / health / alerts from the response,
      actions through `/tyre-changes`; profiles, changes, maintenance, pending recap and the inquiry on the API.
- [ ] EN + TH strings; Vitest for the response → `Vehicle` adapter (both geometries), the tyreStatus derivation and the
      REPLACE line → old / new serial mapping; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/13_REPLY.md`.

**This closes P6.** Next: P7 (incidents and fuel). Do not commit or push unless the owner asks.
