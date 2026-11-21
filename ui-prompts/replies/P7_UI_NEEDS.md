# P7 Incidents & fuel — what the UI needs from the API (UI → backend, 2026-11-20)

Input for the backend session's P7 step 7a (`docs/backend-analysis/TODO.md` §P7). Built from the four existing mock
screens (no redesign: same pages, columns, form sections) and the conventions used in P1–P6. Field names in the
tables are the screen's (`src/types/*.ts`); the API column is a proposal — rename freely, the UI adapts in one adapter.
Owner decisions still needed are marked **Q** (collected at the end).

Common to all four (as in P4–P6): UUID ids; `rowVersion` on every write; list = `GET ?search=&from=&to=&status=&assetProfileId=&driverId=&page=&pageSize=`
(`search` contains, case-insensitive, also over the party / asset code); 400 field errors, 409 "changed by someone
else"; branch from the asset; `X-Branch-Id` honoured for branch-scoped permissions; numbers from the existing series
`FLT_ACC` / `FLT_CLM` (new: `FLT_FUEL`?, `FLT_TVN`? — **Q1**).

## 1. Fuel logs — `/fleet/fuel-logs`, `/fleet/fuel-logs/[id]`, `/fleet/fuel-logs/approval`
Permissions today: `fleet.fuel.view`, `fleet.fuel.approve`; a `fleet.fuel.record` is needed for create / edit (**Q2**).
| Screen field | Proposed API | Notes |
|---|---|---|
| `equipmentCode` (+ `registrationNo` shown) | `assetProfileId` → `assetCode`, `registrationNo` | asset picker (same as meters) |
| `meterUpdateDate` | `fuelledAt` (date-time) | |
| `voucherNo` | `voucherNo` (vendor voucher / receipt no, free text) | the document's own number = series (Q1) |
| `tankMeter` (litres) | `liters` > 0 | |
| `meterRead`, `hourMeter` | `meterKm`, `meterHours` | **records a meter reading** (same rules as `/meter-readings`: lower than last → pending review); response carries `meterReadingId` |
| `driverName`, `driverCard` | `driverId` → `driverCode`, `driverName`; `fuelCardNo` (default from the driver's `fuel_card_no`) | |
| `fuelSource` OWN_TANK / VENDOR | `fuelSource` | OWN_TANK = **issue from a fuel store** (`warehouseId` + fuel item, stock out at average cost — reuse stock issues); VENDOR = bought at a station (`supplierPartyCode`, optional) — **Q3** |
| `vendorName` | `supplierPartyCode` → `supplierName` | VENDOR only |
| `costPerLiter`, `totalAmount` | `unitPrice` (VENDOR keyed; OWN_TANK = stock average, read-only), `amount` = liters × unitPrice (read-only) | |
| `totalDistance`, `avgCostPerKM`, `totalHour`, `avgCostPerHour` | read-only, computed by the API from the previous fuel log of the asset: `distanceKm`, `costPerKm`, `hours`, `costPerHour`, also `kmPerLiter` | |
| `remarks` | `remarks` | |
| status APPROVED / PENDING, `approvedBy/On` | `status` DRAFT → PENDING_APPROVAL → APPROVED / REJECTED, CANCELLED; `approvedAt`, `approvedByName` | approval queue page = `status=PENDING_APPROVAL`; actions `submit`, `approval { decision, reason }`, `cancel { reason }` — own-entry approval refused like POs |
Also wanted: per-asset efficiency for reports (`GET /fuel-logs/summary?assetProfileId=&from=&to=` → litres, km, km/L, cost/km) — can wait for P8 reports.

## 2. Accident reports — `/fleet/accidents`, `/fleet/accidents/[id]` (tabs General, Location, Photos)
Permission `fleet.incident.view` exists in the UI route guard; need `fleet.incident.manage` (**Q2**). Series `FLT_ACC`.
| Screen field | Proposed API |
|---|---|
| `documentNo` (read-only), `accidentDate` | `documentNo`, `occurredAt` (date-time) |
| `equipmentCode`, `driverName` / `driverID` | `assetProfileId`, `driverId` |
| `accidentType` COLLISION / ROLLOVER / FIRE / THEFT / OTHER | `accidentType` (code list `FLEET_ACCIDENT_TYPE`? — Q4) |
| `responsibility` DRIVER / THIRD_PARTY / SHARED / UNKNOWN | `responsibility` |
| `accidentLocation`, `address`, `city`, `country` | `locationText`, `address`, `city`, `countryCode`, optional `latitude` / `longitude` |
| `policeStation`, `policeReportNo` | same |
| `insPolicyNo`, `insClaimable`, `refClaimNo` | `insurancePolicyNo`, `isClaimable`, read-only `claimNo` (latest claim) |
| `aboutAccident`, `damageDetails` | `description`, `damageDetails` |
| third party (not on the screen today) | optional `thirdPartyPartyCode` / `thirdPartyName` / `thirdPartyPlate` — **Q5** (needed if THIRD_PARTY damage is recharged, P5 flow B) |
| Photos tab | attachments like WO photos: `POST/GET/DELETE /accidents/{id}/attachments` (+ `/content`), same type / size rules |
Status: OPEN → UNDER_REPAIR (a WO / WR is linked) → CLOSED, CANCELLED. Actions: **Raise work request** (`work_request.accident_id` already exists — doc 02), link to WOs (read-only list of WOs with this `accidentId`), close, cancel.

## 3. Insurance claims — `/fleet/insurance-claims` (+ `[id]`, lines Activity / Parts)
Series `FLT_CLM`. Permission: `fleet.incident.manage` (or `fleet.claim.manage`, Q2).
| Screen field | Proposed API |
|---|---|
| `documentNo`, `documentDate` | same (read-only no) |
| `accidentRefNo` (required) | `accidentId` → `accidentNo`; asset / driver follow the accident |
| `claimRefNo` | `insurerClaimNo` (insurer's reference) |
| `equipmentCode`, `equipmentCategory`, `driverName` / `driverID` | read-only from the accident |
| `vendorName`, `contactPerson`, `claimBy` | `insurerPartyCode` → `insurerName`, `contactPerson`, `claimedByName` |
| lines `activityDescription`, `stockCode`, `quantity`, `unitPrice`, `totalAmount` | `lines[]`: `lineKind` LABOR / PART / SUBLET / OTHER, `itemId` or `description`, `qty`, `unitPrice`, `amount`; **prefill from the linked WOs' cost lines** (`POST /claims/{id}/lines/from-work-orders`) |
| `totalAmount`, `discountAmount`, `vat`, `vatAmount`, `nettAmount` | `subtotalAmount`, `discountAmount`, `taxRate`, `taxAmount`, `totalAmount` (read-only) |
| `revisedFrom` | `revisedFromClaimId` → `revisedFromNo` (a revision copies the claim; old one → REVISED) |
| `isCancel`, `remarks` | status, `remarks` |
Status: DRAFT → SUBMITTED (to insurer) → APPROVED (amount agreed: `approvedAmount`) / REJECTED → SETTLED (`settledAmount`, `settledAt`, optional deductible / `excessAmount`), CANCELLED, REVISED. Actions: submit, record decision, settle, revise, cancel. Settlement → accounting is P10 (SAP) — keep `erpRef`.

## 4. Traffic violations — `/fleet/traffic-violations` (+ `[id]`)
| Screen field | Proposed API |
|---|---|
| `ticketNo` (keyed, unique per tenant) | `ticketNo` |
| `violationDate` | `occurredAt` |
| `equipmentCode`, `driverName` / `driverID` | `assetProfileId`, `driverId` |
| `violationType` SPEEDING / PARKING / RED_LIGHT / NO_SEATBELT / OTHER, `violationTypeDescription` | `violationType` (code list `FLEET_VIOLATION_TYPE`? Q4), `description` |
| `violationAmount` | `fineAmount` |
| `remarks` | `remarks` |
New fields the business usually needs (**Q6**): `paidBy` COMPANY / DRIVER, `paidAt`, `dueDate`, and **driver deduction** (company pays, recovers from the driver — for a subcontractor driver via the Trucking statement like recharge mode DEDUCTION, P5). Status: OPEN → PAID → (DEDUCTED), CANCELLED.

## 5. Cross-cutting
- Driver history: `GET /drivers/{id}/incidents` (accidents + violations) for the driver form (optional, P8).
- Dashboard / reports (P8): open accidents, claims outstanding, fuel cost per km by asset.
- The UI will keep each list's columns; multi-line cells as today.

## Questions for the owner (please answer here)
1. **Q1** Number series for fuel logs and traffic violations (`FLT_FUEL`, `FLT_TVN`)? Or fuel logs only by voucher no?
2. **Q2** New permissions: `fleet.fuel.record`, `fleet.incident.manage` (accidents + claims + violations), or a separate `fleet.claim.manage`?
3. **Q3** OWN_TANK fuel = a stock issue from a fuel store (stock and cost through the ledger)? Or fuel tanks are not tracked as stock?
4. **Q4** Accident and violation types as code lists (tenant can add) or fixed lists?
5. **Q5** Record the third party on an accident (needed to recharge THIRD_PARTY damage to a customer / their insurer)?
6. **Q6** Violations: who pays, and should a driver deduction flow exist (own driver: payroll export; subcontractor: Trucking statement)?

## Owner answers (2026-11-20)
1. **Q1 — yes, Gecko pattern.** New series `FLT_FUEL` (fuel logs) and `FLT_TVN` (traffic violations), added to
   `FleetNumberSeries.Known` + the setup catalogue + `initialize`, same shape as the other FLT_ codes and as Trucking's
   `TRK_FUEL_TXN`. `voucherNo` stays a free-text vendor reference beside the document number; `ticketNo` stays the
   police ticket number.
2. **Q2 — no new permissions for now.** Reuse the closest existing ones:
   fuel log create / edit / submit / approve = `fleet.fuel.approve` (view = `fleet.fuel.view`);
   accidents, claims, violations create / edit = `fleet.incident.manage` (view = `fleet.incident.view`);
   claim decision / settle = `fleet.claim.approve`. Own-entry approval still refused.
3. **Q3 — yes, own-tank fuel is taken out of stock; which stock follows the Trucking/Fleet link (like trucks and drivers).**
   Proposed rule (UI side, **awaiting owner confirmation**):
   - Tenant with TRUCKING: depot tanks are Trucking's (`/api/trucking/fuel/tanks`, ledger at weighted average). Fuel for a
     linked asset (issue from tank, station fill) is recorded in Trucking and shown in Fleet **read-only** (source
     TRUCKING badge, like linked assets) via a new read contract on `Gecko.Trucking.Contracts` (fuel movements per
     vehicle, same style as `IFleetAssetDirectory`). Fleet adds meter reading + efficiency. Fleet never writes into
     Trucking's ledger (no cross-database save).
   - Tenant without TRUCKING, or a FLEET-only asset: Fleet fuel log; OWN_TANK = a Fleet stock issue of a fuel item from
     a Fleet store at average cost (reuse stock issues); VENDOR = station fill with supplier + unit price.
4. **Q4 — fixed lists, served from lookups.** No tenant-editable code list: `GET /api/fleet/lookups/accident-types` and
   `/lookups/violation-types` (code + English + Thai label, same shape as Trucking's `/lookups/booking-types`). Also
   `responsibility` the same way if convenient.
5. **Q5 — yes, record the third party** (tracking): `thirdPartyPartyCode` (optional party) or free `thirdPartyName`,
   `thirdPartyPlate`, `thirdPartyInsurer`, `thirdPartyContact`. UI adds them to the existing General tab only
   (no new tab).
6. **Q6 — yes, deduct from the driver.** Violation: `paidBy` COMPANY / DRIVER, `paidAt`, `dueDate`; when the company pays,
   a driver deduction is raised: own driver → payroll export line, subcontractor driver → Trucking statement
   (like recharge mode DEDUCTION, P5). Status OPEN → PAID → DEDUCTED, CANCELLED. UI: read-only deduction status +
   reference on the violation form, action "Deduct from driver" (`fleet.incident.manage`).
