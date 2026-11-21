# 14 — Fuel logs, accidents, insurance claims, traffic violations on the real API (P7)

You are the UI session for **Gecko Fleet**. Prerequisites: **01**, **03** (assets), **05** (drivers), **09** (work
requests / orders), **11** (stores + items, for own-tank fuel). Regenerate the types (`npm run api:types`;
`fleet-api.json` re-exported 2026-11-20: **168 paths, 239 schemas**). Read the UI change policy.

This answers `replies/P7_UI_NEEDS.md` (owner answers Q1–Q6). Same screens, real data — no new page:
`/fleet/fuel-logs` (+ `[id]`, `/approval`), `/fleet/accidents` (+ `[id]`, tabs General / Location / Photos),
`/fleet/insurance-claims` (+ `[id]`), `/fleet/traffic-violations` (+ `[id]`).

Common: UUID ids; `rowVersion` on every write (409 = changed by someone else → refetch); 400 = field errors (use
`saveErrors.ts`); lists take `search, status, branchId, assetProfileId, driverId, from, to, page, pageSize` and return
`PagedResult` like P3–P6; the branch is the asset's. Numbers come from the series `FLT_FUEL`, `FLT_ACC`, `FLT_CLM`,
`FLT_TVN` — a tenant set up before P7 gets the two new ones by running Setup → **Set up defaults** again (initialize is
idempotent); without them create returns 409 "No active … number series".

Permissions (owner Q2, no new codes): fuel view `fleet.fuel.view`, fuel create / edit / submit / approve / reject / cancel
`fleet.fuel.approve`; accidents, claims, violations view `fleet.incident.view`, change `fleet.incident.manage`; claim
**decision** and **settle** `fleet.claim.approve`. Own-entry fuel approval → 403 (hide Approve / Reject on your own log).

## A. Lookups (owner Q4: fixed lists)
`GET /api/fleet/lookups/accident-types`, `/lookups/accident-responsibilities`, `/lookups/violation-types` →
`[{ code, name, nameLocal }]` (English + Thai). Fill the screens' selects from these (show `nameLocal` when the UI language
is TH); the codes are the screens' own (COLLISION, ROLLOVER, FIRE, THEFT, OTHER · DRIVER, THIRD_PARTY, SHARED, UNKNOWN ·
SPEEDING, PARKING, RED_LIGHT, NO_SEATBELT, OTHER …). Cache them (staleTime: Infinity).

## B. Fuel logs
`GET /api/fleet/fuel-logs?…&fuelSource=OWN_TANK|VENDOR&status=`, `GET …/{id}`, `POST` / `PUT …/{id}` with
`SaveFuelLogRequest`, actions `POST …/{id}/submit|approve|reject|cancel` `{ reason?, rowVersion }` (reason required for
reject + cancel). The approval page = `status=PENDING_APPROVAL`.
| Screen field | API |
|---|---|
| `equipmentCode` (+ registration) | `assetProfileId` → `assetCode`, `registrationNo` |
| `meterUpdateDate` | `fuelledAt` (not in the future) |
| `voucherNo` | `voucherNo` (station receipt, free text); the document's own number is `documentNo` (read-only) |
| `tankMeter` | `liters` (> 0) |
| `meterRead`, `hourMeter` | `meterKm`, `meterHours` — on approval they become a meter reading (source FUEL) → `meterReadingId` |
| `driverName`, `driverCard` | `driverId` → `driverCode`, `driverName`; `fuelCardNo` (defaults to the driver's card) |
| `fuelSource` | `OWN_TANK` → **`warehouseId` + `itemId` required** (the fuel store and the fuel item; item kept in LTR or with a LTR conversion), **no price** (the API costs it at the store's average on approval); `VENDOR` → **`unitPrice` required**, `supplierPartyCode` optional |
| `vendorName` | `supplierPartyCode` → `supplierName` (VENDOR only) |
| `costPerLiter`, `totalAmount` | `unitPrice`, `amount` — read-only for OWN_TANK (filled on approval) |
| `totalDistance`, `avgCostPerKM`, `totalHour`, `avgCostPerHour` | read-only `distanceKm`, `costPerKm`, `hours`, `costPerHour`, plus `kmPerLiter` — from the previous APPROVED log of the asset |
| status / approved by + on | `status` DRAFT → PENDING_APPROVAL → APPROVED / REJECTED, CANCELLED; `decidedAt`, `decidedBy`, `rejectReason`, `cancelReason` |
| `remarks` | `remarks` |
Save with **`submit: true`** for the screen's Save-and-submit: with no `FUEL_LOG` approval policy the log is approved and
posted at once (status APPROVED in the response); with a policy it waits in PENDING_APPROVAL. Edit only DRAFT /
PENDING_APPROVAL (a changed pending log goes back to DRAFT). **Cancel** of an APPROVED own-tank log puts the litres back
in the store. 409 "Not enough fuel in the store".

**Trucking-linked assets (owner Q3):** a fuel log for an asset with source TRUCKING returns **409** "its fuel is recorded
in Trucking". For such an asset show Trucking's fuel read-only: `GET /api/fleet/assets/{id}/fuel` →
`{ isLinked, source, truckingRows[] }` (`txnAt, txnType, fuelType, quantity, quantityUnit, odometerKm, unitCost, amount,
sourceDocRef, …`). Put a "From Trucking" badge (same as linked assets) and no New button for that asset; in the list, keep
showing only Fleet logs.

## C. Accident reports
`GET /api/fleet/accidents?…&accidentType=`, `GET …/{id}`, `POST` / `PUT …/{id}` with `SaveAccidentRequest`.
| Screen field | API |
|---|---|
| `documentNo`, `accidentDate` | `documentNo` (read-only), `occurredAt` |
| `equipmentCode`, `driverName` / `driverID` | `assetProfileId`, `driverId` (or free `driverName` when not on file) |
| `accidentType`, `responsibility` | `accidentType`, `responsibility` (lookups, §A) |
| `accidentLocation`, `address`, `city`, `country` | `locationText`, `address`, `city`, `countryCode` (2 letters); optional `latitude` / `longitude` |
| `policeStation`, `policeReportNo` | same |
| `insPolicyNo`, `insClaimable`, `refClaimNo` | `insurancePolicyNo`, `isClaimable`, read-only `claimNo` + `claimStatus` (latest claim) |
| `aboutAccident`, `damageDetails` | `description`, `damageDetails`; also `hasInjuries`, `estimatedCost` (add only if the screen has a spot; else ask) |
| third party (owner Q5 — General tab only) | `parties[]` `{ partyName (required), partyCode?, vehiclePlate?, vehicleDescription?, insurerName?, insurerPolicyNo?, contactName?, contactPhone?, statement? }` — the UI shows ONE third party: send a one-item list (empty list = none); `null` = unchanged |
Status OPEN → UNDER_REPAIR → CLOSED, CANCELLED. Actions:
- **Raise work request** `POST …/{id}/work-request { priority (default HIGH), problem?, meterKm?, billToPartyCode?, rowVersion }`
  → status UNDER_REPAIR, `workRequestId` / `workRequestNo` (link to the WR form). Needs `fleet.workrequest.create` too.
  One per accident (409 after that). The WR converts to a WO the usual way; the WO carries the accident.
- `workOrders[]` (read-only list on the form: `documentNo, status, documentDate, totalCost`, link to the WO).
- **Close** `POST …/{id}/close` — 409 while a repair WO is still open. **Cancel** `POST …/{id}/cancel { reason }` — OPEN only.
- **Photos tab** = same component as WO photos: `GET/POST /accidents/{id}/attachments` (multipart `file`, `stage`
  SCENE | DAMAGE | POLICE | REPAIR | OTHER, `caption`), `GET …/{attachmentId}/content`, `DELETE …/{attachmentId}`.
  JPEG / PNG / WebP / PDF, ≤ 10 MB.

## D. Insurance claims
`GET /api/fleet/insurance-claims?…&accidentId=`, `GET …/{id}`, `POST` (start a claim for an accident) / `PUT …/{id}`
(DRAFT only; `lines: null` = unchanged, a list replaces the lines).
| Screen field | API |
|---|---|
| `documentNo`, `documentDate` | same |
| `accidentRefNo` | `accidentId` → `accidentNo` (fixed after create); asset / driver read-only from the accident (`assetCode`, `driverCode`, `driverName`) |
| `claimRefNo` | `insurerClaimNo` |
| `vendorName`, `contactPerson`, `claimBy` | `insurerPartyCode` or free `insurerName`, `contactPerson`, `claimedByName`; also `policyNo` |
| lines (`activityDescription`, `stockCode`, `quantity`, `unitPrice`, `totalAmount`) | `lines[]` `{ lineKind LABOR/PART/SUBLET/OTHER, description, qty, unitPrice, itemId?, remarks? }` → back with `amount`, `source`, `workOrderNo`, `itemCode`, `approvedAmount` |
| `totalAmount`, `discountAmount`, `vat`, `vatAmount`, `nettAmount` | read-only `subtotalAmount`, `discountAmount` (keyed), `taxRate` (keyed), `taxAmount`, `totalAmount` |
| `revisedFrom` | `revisedFromClaimId` → `revisedFromNo` |
| `isCancel`, `remarks` | `status`, `cancelReason`, `remarks` |
Button **Copy from work orders** → `POST …/{id}/lines/from-work-orders { rowVersion }`: adds the parts / labour / sublet
lines of the accident's WOs not on the claim yet (DRAFT only). When you PUT the lines afterwards, send those rows back with
their `source` (WO_PART / WO_LABOR / WO_SUBLET) and `sourceLineId` unchanged (else 400 / they become MANUAL). One open claim per accident (409 → revise the open one).
Status DRAFT → SUBMITTED → APPROVED / REJECTED → SETTLED; CANCELLED; REVISED. Actions:
- `submit { rowVersion }` — needs lines and an insurer (400 `insurerName`).
- `decision { decision APPROVED|REJECTED, approvedAmount (APPROVED), deductibleAmount?, insurerClaimNo?, reason (REJECTED) }` — `fleet.claim.approve`.
- `settle { settledAmount, settledAt?, settlementRef? }` — APPROVED only, `fleet.claim.approve`.
- `revise { reason? }` — from SUBMITTED / APPROVED / REJECTED: returns the NEW DRAFT claim (open it); the old one becomes REVISED.
- `cancel { reason }` — DRAFT / SUBMITTED.
Settlement to accounting is P10 (SAP): show `erpRef` read-only if the screen has a spot, else skip.

## E. Traffic violations
`GET /api/fleet/traffic-violations?…&violationType=`, `GET …/{id}`, `POST` / `PUT …/{id}` (OPEN / DISPUTED only).
| Screen field | API |
|---|---|
| `ticketNo` | `ticketNo` (unique per tenant, case-insensitive → 409) ; `documentNo` = FLT_TVN (read-only) |
| `violationDate` | `occurredAt` |
| `equipmentCode`, `driverName` / `driverID` | `assetProfileId`, `driverId` → `driverCode`, `driverName`, `driverEmployment` (EMPLOYEE / CONTRACT / SUBCON) |
| `violationType`, `violationTypeDescription` | `violationType` (lookup), `description` |
| `violationAmount` | `fineAmount` |
| `remarks` | `remarks`; optional `issuingAuthority`, `locationText`, `points`, `dueDate` |
New read-only block on the form (owner Q6): **Payment + deduction** — `paidBy`, `paidAt`, `paymentRef`, `deductionMode`
(PAYROLL / SUBCON), `deductionAmount`, `deductionPartyCode`, `deductionRef`, `deductedAt`, `payrollExportedAt`.
Status OPEN → PAID → DEDUCTED; DISPUTED; CANCELLED. Actions (`fleet.incident.manage`):
- **Pay** `POST …/{id}/pay { paidBy COMPANY|DRIVER, paidAt?, paymentRef? }`.
- **Deduct from driver** `POST …/{id}/deduct { amount? (default = fine, ≤ fine) }` — only when PAID by COMPANY and a
  driver is set. SUBCON driver → a deduction request on the subcontractor's Trucking statement (`deductionMode` SUBCON);
  own driver → a payroll line (`deductionMode` PAYROLL).
- **Take back deduction** `POST …/{id}/deduction/cancel { reason }` → back to PAID. 409 once exported to payroll or once a
  Trucking statement holds it. `POST …/{id}/deduction/refresh` re-reads the Trucking request status.
- `dispute { reason }` (OPEN), `reopen` (DISPUTED), `cancel { reason }` (OPEN / DISPUTED).
Payroll hand-off (no screen today — add a **button on the violations list**, "Payroll deductions", opening a dialog, ask in
the reply if you prefer otherwise): `GET /traffic-violations/payroll-deductions` (not yet exported) → table; **Mark exported**
`POST /traffic-violations/payroll-deductions/export { ids? (null = all pending) }` → returns the rows with `exportedAt`;
offer a CSV download of the returned rows (client-side).

## Done when
- [ ] The four list + form pages and the fuel approval page on the API; lookups from §A; Trucking-linked asset fuel read-only.
- [ ] Accident: raise WR, WO list, close / cancel, Photos tab; claim: copy from WOs, submit / decision / settle / revise / cancel;
      violation: pay / deduct / take back / dispute / reopen / cancel + payroll dialog.
- [ ] EN + TH strings; Vitest for the four adapters (status maps, OWN_TANK vs VENDOR request, one third party ↔ `parties[]`,
      claim totals read-only); build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/14_REPLY.md`.

**This closes P7.** Next: P8 (vendor billing, AP-lite). Do not commit or push unless the owner asks.
