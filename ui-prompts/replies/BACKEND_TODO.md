# Backend to-do for Fleet (consolidated, 2026-11-20)

> **2026-11-21: ALL items #1–#20 shipped by the backend (P13). See prompt `22_BACKEND_TODO_P13.md` for names, rules and the UI actions.**
> **2026-11-22: two new items from the live run of prompts 14–23 — #21 (F2) and #22 (F3), section P4 below. No UI change is needed for either.**
> **2026-11-22 (later): #21 and #22 shipped by the backend (platform `db889b7`, local; Fleet API needs a rebuild). #21: any file that does not open as an .xlsx → 400 on `file` "This is not an Excel workbook (.xlsx). Download the template, fill it and upload it again." (ClosedXML threw `FileFormatException` / `NullReferenceException`). #22: option A — cancel → 409 "A payment on this invoice waits for approval: approve or reject it first."; approving a payment on a CANCELLED invoice → 409 "The invoice is cancelled."; reject still allowed. No API fields changed (no OpenAPI re-export). Data: `VIN-SCT-LCB01-2611-00185` no longer exists locally and no waiting payment is on any cancelled invoice — nothing to reject.**

One list for the API owner, from the owner's answers in `11_REPLY.md`, `12_REPLY.md`, `13_REPLY.md` and the live tests
(`LIVE_TEST_FINDINGS.md`). **The UI is already built for every item** (it sends / reads the names below and falls
back while they are missing), so no UI work is waiting on this list. Use the exact names. When an item ships,
re-export `fleet-api.json` / `platform-api.json` into `ui-prompts/openapi/` and tell the UI session: it re-runs the
live test for that item and removes the fallback.

Code paths are in `platform/` (Gecko.Fleet = Fleet API :5300; Gecko.MasterData / Gecko.Revenue = Platform API :5100).

## P1 — blocking (wrong results or errors in screens that are live)
| # | Item | Where | Done when |
|---|---|---|---|
| 1 | **Tyre condition from the code list.** Drop `[AllowedValues(null,"GOOD","FAIR","POOR")]` on `Condition`; validate against the tenant's active `FLEET_TYRE_CONDITION` codes (seeded: 14 codes). Same for `TyreAction.condition`. | `Gecko.Fleet/Endpoints/Tyres/TyreEndpoints.cs:26` (+ tyre-change / maintenance line validation) | `POST /tyres` with `condition: "NEW"` → 200; an unknown code → 400 naming the field. (live A1) |
| 2 | **Customer card falls back to the standard card.** Price each WO line from the payer's customer card first, then the standard card (labour, flat, markup, part price, sundries incl. shop supplies / minimum charge / call-out). `rateCardRef` names the card that priced the line. | Gecko.Revenue repair-tariff pricing (preview / release / price-check) | Customer card with LABOR only → parts priced with the standard MARKUP, shop-supplies sundry added. (live C2, owner decision) |
| 3 | **Branch-scoped permissions via `X-Branch-Id`.** Every UI call now sends the header-switcher branch. Check branch-scoped codes (`revenue.tariff.*`, `revenue.invoice.issue`, …) at that branch → 403 when not held there; refuse a branch the user has no access to (403); tenant-wide grants ignore it. Repair cards stay tenant-wide (no `branchId`). | Platform API authorization | `ops`-type user without `revenue.tariff.manage` at branch X gets 403 when `X-Branch-Id: X`. (12 Q3) |
| 4 | **Removed tyre to STOCK needs a store.** When a REMOVE / REPLACE to STOCK has no `warehouseId` and the branch has no default store → 400 "Line n: no default store at this branch — choose a store". (The UI now sends `warehouseId` from a Store field.) | tyre-change line handling | No silent `warehouseId: null` on an IN_STOCK tyre. (live A2) |

## P2 — fields and filters the UI already uses
| # | Item | API | Source |
|---|---|---|---|
| 5 | `documentDate?: date` on `TyreChangeRequest` and `TyreMaintenanceRequest` (empty = today); dates the document and its events | Fleet | 13 Q1 |
| 6 | `driverId`, `driverCode`, `driverName` (current driver) on `AxleMapDto` | Fleet | 13 Q2 |
| 7 | `lastEventAt`, `lastEventType`, `lastDocumentNo`, `lastPartyCode` on `TyreDto` (recapper / repairer of the last send) | Fleet | 13 Q3 |
| 8 | `documentNo`, `assetCode` on `TyreEventDto` (every endpoint returning events) | Fleet | 13 Q4 |
| 9 | `issuedBaseQty` (net of returns) on `WoPartDto` | Fleet | 11 Q3 |
| 10 | Goods receipt: compute `taxAmount` / `totalAmount` from the keyed `taxRate` and header `discountAmount`; default VAT from the PO when not sent (works today — keep it) | Fleet | 11 Q4 |
| 11 | List params (contains, case-insensitive): `supplierName` on `GET /purchase-orders`, `/goods-receipts`, `/vendor-returns`; `workOrderNo`, `assetCode` on `GET /stock-issues` — today ignored | Fleet | 11 Q5, live B1 |
| 12 | Transfer targets: configured list per sending store + `GET /api/fleet/warehouses/{id}/transfer-targets` → `WarehouseDto[]`; refuse a transfer to a store not on the list (400) | Fleet | 11 Q6, live B3 |
| 13 | `assetCode`, `sourceLineType`, `rateCardRef`, `rechargeNo` on `FleetInvoiceLineDto` | Platform (Revenue) | 12 Q6, live C3 |
| 14 | `search` (invoice no / payer), `status`, `from`, `to` on `GET /api/revenue/fleet/invoices` — today ignored | Platform (Revenue) | 12 Q7, live B1 |
| 15 | Withdraw from DRAFT (today 409 "A draft card cannot be withdrawed" — also fix the wording: "withdrawn"). The UI hides Withdraw on DRAFT until this ships. | Platform (Revenue) | 12 Q4, live C1 |

## P3 — confirm / nice to have
| # | Item | Source |
|---|---|---|
| 16 | Optionally refuse `effectiveTo` on a standard card (standard cards are always open-ended; the UI never sends it) | 12 Q2 |
| 17 | Recharge status back from Revenue / Trucking (event) so ACCEPTED → INVOICED / DEDUCTED without a manual Refresh | live C5 |
| 18 | Confirm: recharge total (e.g. 971.56) and invoice total (972, VAT whole baht) may differ by the rounding | live C4 |
| 19 | Amounts with 4 decimals on stock documents (e.g. −103.5556) — round to 2 on documents shown to people? | live B4 |
| 20 | Wording: "A approved / A invoiced / A draft …" → "An approved …" in 409 messages | live B, C |

## P4 — from the live run of prompts 14–23 (2026-11-22, `LIVE_TEST_FINDINGS.md` §F)

### #21 (F2) — ✅ SHIPPED 2026-11-22 (db889b7) — Opening-balance import: a file that is not a spreadsheet → 500 instead of 400 on `file`
**Evidence.** `POST /api/fleet/opening-balances/STOCK?commit=false`, multipart `file` = the bytes `not a spreadsheet` named
`x.xlsx`, owner of SCT-TEST → **500** "Something failed on our side…" (reference `b15f245127ae3edb45208231f50fb625`).
Prompt 18 promises **400 on `file`** for a wrong file, missing columns or an empty sheet; the UI's card shows the 400 message
under the file picker and only a generic text for a 500.

**Where.** `Gecko.Fleet/Endpoints/Setup/GoLiveEndpoints.cs`, `ImportAsync`, line ~135:
`catch (Exception e) when (e is FormatException or InvalidDataException or ArgumentException) { return Invalid("file", e.Message); }`.
`new XLWorkbook(stream)` (in `Read`, line ~98) on bytes that are not an .xlsx (not a zip, a zip that is not OOXML, an .xls, a
.csv renamed) throws a packaging / OOXML exception (e.g. `System.IO.FileFormatException`, `DocumentFormat.OpenXml.Packaging.OpenXmlPackageException`,
or a `NotSupportedException`) — none of the three filtered types. Reproduce first and name the exact type in the commit.

**Fix.**
1. Catch the reader's failures around `new XLWorkbook(...)` only, and return
   `400 { errors: { file: ["This is not an Excel workbook (.xlsx). Download the template, fill it and upload it again."] } }`.
   Do not let the raw exception text out for this case (it is meaningless to a user).
2. Keep the existing 400s (missing columns, no rows, > 5,000 rows) as they are.
3. Optional: check the first bytes (`PK`) before opening, for a clear message without an exception.

**Test** (`Gecko.Fleet.Tests/Api/…GoLive…`): for each kind, upload (a) plain text, (b) an empty zip, (c) a zip without
`[Content_Types].xml` → 400 with an error on `file`; a real template still → 200.

**Done when.** No input file can make the import answer 500; the four kinds answer 400 on `file` for a non-workbook.

### #22 (F3) — ✅ SHIPPED 2026-11-22 (db889b7, option A) — A vendor invoice can be cancelled while a payment waits for approval
**Evidence.** SCT-TEST, `VENDOR_PAYMENT_APPROVAL = true`: invoice `VIN-SCT-LCB01-2611-00185` APPROVED → `POST …/payments`
`{ amount: 100 }` → the payment waits (`paidAmount` 0, `pendingPaymentAmount` 100, payment status PENDING_APPROVAL) →
`POST …/cancel { reason }` → **200 CANCELLED**. The payment is still PENDING_APPROVAL on the cancelled invoice and
`POST /api/fleet/vendor-payments/{id}/approval { decision: APPROVED }` by another approver is still possible, which would record
money paid on a cancelled invoice.

**Where.** `Gecko.Fleet/Endpoints/Billing/VendorInvoiceEndpoints.cs`, `CancelAsync` (line ~543): it refuses
`doc.PaidAmount != 0` ("Payments are recorded on this invoice: reverse them first.") but `PaidAmount` only counts approved
payments; waiting ones (`PendingQuery(db)`, line ~595) are not checked. The payment approval endpoint does not check the
invoice status either.

**Fix — owner decision 2026-11-22: option A (refuse the cancel). Do not build B.**
- **A — refuse (CHOSEN):** in `CancelAsync`, after the `PaidAmount` check:
  `if (await PendingQuery(db).AnyAsync(p => p.VendorInvoiceId == doc.VendorInvoiceId, ct)) return Conflict("A payment on this invoice waits for approval: approve or reject it first.");`
- ~~**B — reject with the cancel:**~~ (not chosen) inside the cancel transaction, add a `PaymentApproval { Decision = "REJECTED", Reason = "Invoice cancelled: <reason>" }`
  for each waiting payment.
- **Either way, also guard the approval:** `POST /vendor-payments/{id}/approval` with `decision: APPROVED` on a payment whose invoice
  is CANCELLED → 409 "The invoice is cancelled." (REJECTED stays allowed, so the existing waiting payment can be cleaned up.)

**Test** (`Gecko.Fleet.Tests/Api/PaymentApprovalTests.cs`): approval on → pay → cancel → 409; reject the payment → cancel → 200;
approving a payment of a cancelled invoice → 409.

**Data.** Clean up the test row left by the live run: reject the waiting 100.00 payment on `VIN-SCT-LCB01-2611-00185` (SCT-TEST).

**Done when.** No payment can be PENDING_APPROVAL or approved on a CANCELLED invoice. The UI needs no change: the 409 shows as the
cancel dialog's error, and the Approve / Reject buttons already follow the payment status.

## Already verified live (no action)
Prompts 01–13 read endpoints; setup initialize; asset / technician / driver / supplier / service type / item edits;
meters + PM + baseline; work requests → work orders (moves, hold reasons, photos); inspections → defects (retry-safe
`clientRef`); full stock cycle (goods request → PO → receipt → issue / return → vendor return → adjustment → transfer
→ count); tariff cards, recharge preview / release, fleet invoice issue; tyres (map 2D / 3D, every map action, recap,
repair). Details: `LIVE_TEST_FINDINGS.md`.
