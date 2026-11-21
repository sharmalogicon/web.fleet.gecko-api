# 12 — Repair tariff and recharge on the real API (P5)

You are the UI session for **Gecko Fleet**. Prerequisites: **01**, **09** (work orders, incl. the line `charge` block).
Regenerate the types (`npm run api:types`): **both** documents were re-exported 2026-11-19 — `fleet-api.json` 123 paths,
`platform-api.json` 419 paths (the tariff and invoice endpoints below are on the **Platform API**, `/api/revenue/...`).
Read the UI change policy in `ui-prompts/README.md`.

Background (doc 01 §15.2 / §16): SCT charges others for workshop work in two ways —
**INVOICE** (customer-caused damage → a Revenue tax invoice) and **DEDUCTION** (work on a subcontractor's / owner-driver's
truck → a deduction on that subcontractor's Trucking statement). Prices come from a **repair tariff** (a standard card and
per-customer cards). Labour and parts are always separate charge lines (customers withhold 3 % on labour, not on parts).

## A. Tariff pages = the repair tariff (`/tariff/customer-rates`, `/tariff/standard-rates`, + `[id]`)
Owner decision Q7 (doc 03 §2): these two pages carried **haulage** fields from the DMS menu; they become the **repair
tariff** pages. Keep the pages, their layout, list columns and toolbar; the line grid's haulage-only columns change as
described below (this is the decided replacement, not a redesign).

| Method + path (Platform API) | Permission |
|---|---|
| `GET /api/revenue/repair-tariffs?search=&partyCode=&standard=true|false&status=&page=&pageSize=` | `revenue.tariff.view` |
| `GET /api/revenue/repair-tariffs/{id}` | same |
| `POST /api/revenue/repair-tariffs` · `PUT …/{id}` (+ `rowVersion`; DRAFT or REJECTED only, lines replaced) | `revenue.tariff.manage` |
| `POST …/{id}/submit` · `…/approve` · `…/reject` (`reason`) · `…/withdraw` — body `{ reason?, rowVersion }` | manage / approve / approve / approve |
| `POST /api/revenue/repair-tariffs/price-check { on, partyCode?, roadside, lines: [{ lineType, lineId?, qty, unitCost, description, tradeCode?, timeBand?, serviceTaskCode?, itemCode?, itemCategoryCode? }] }` | view |

`/tariff/standard-rates` lists `standard=true` (no party); `/tariff/customer-rates` lists `standard=false`.

| Header field (`customer-rate.ts` / `standard-rate.ts`) | API |
|---|---|
| `quotationNo` / `rateCode` | `cardCode` (upper case, unique) |
| `quotationDate` / `rateDate` | `cardDate` |
| `effectiveDate`, `expiryDate` | `effectiveFrom`, `effectiveTo` (empty = open-ended) |
| `customerCode` / `customerName` | `partyCode` (party picker, any active party — customers and subcontractors) / `partyName` |
| `description`, `salesPerson`, `contactNo`, `remarks` | `description`, `salesPerson`, `contactNo`, `remarks` |
| `agentCode`, `forwarderCode` | not part of a repair card: show them disabled (empty); ask in `replies/12_REPLY.md` whether to hide them |
| `isApproved`, `approvedBy/On` | `status` (DRAFT / PENDING / APPROVED / REJECTED / WITHDRAWN) badge, `approvedAt` |
| (currency) | `currencyCode` (default THB) |

Line grid: one row per price, **`lineKind`** in the screen's `chargeType` column (select). `chargeCode` (default by kind:
WO_LABOR, WO_PARTS, WO_SUBLET, WO_SUNDRY), `chargeDescription` → `description`, `billingUnit` → read-only
`billingUnitCode`, `sellRate` → **`rate`**. The haulage columns (`orderType`, `movementCode`, `size`, `paymentType`,
`billTo`) are replaced by ONE multi-line "Applies to" cell whose inputs depend on the kind:

| `lineKind` | "Applies to" inputs | `rate` means |
|---|---|---|
| LABOR | `tradeCode` (FLEET_TRADE, empty = any), `timeBand` NORMAL/OT/HOLIDAY, `minQty` (minimum hours) | per hour |
| FLAT | `serviceTaskCode` (from `/api/fleet/service-tasks`), `stdHours` | fixed price (or empty → std hours × labour rate) |
| MARKUP | `costFrom`, `costTo` (unit-cost band), `itemCategoryCode` (FLEET_ITEM_CATEGORY or `SUBLET`, empty = any) | markup % |
| PART_PRICE | `itemCode` (stock item) | price per unit |
| SUNDRY | `sundryKind` SHOP_SUPPLIES (rate %, `capAmount`) / MIN_CHARGE / CALL_OUT / TOWING | % or amount |

400 `lines` errors name the line ("Line 2: LABOR needs a time band and a rate per hour."). An APPROVED card is frozen
(409): offer **Copy to new card**. Self-approval is refused (403) unless the tenant allows it. Add a small
**"Check a price"** panel on the card form that calls `price-check` (optional, nice to have).

## B. Recharge on the work order (prompt 09's form) — buttons only
The line grids already have Billable / Bill-to / Mode (prompt 09 `charge`). New since P5: **bill-to and mode are
optional** on a billable line — the API fills them: bill-to = the WO's default bill-to, else the owner of a SUBCON /
CUSTOMER asset; mode = DEDUCTION when a subcontractor pays for its own truck, else INVOICE. A keyed `unitPrice` is kept;
lines without one are priced from the tariff at release.

On a COMPLETED / CLOSED work order (`fleet.recharge.release`):
| Button | Call |
|---|---|
| **Preview charges** | `POST /api/fleet/work-orders/{id}/recharges/preview` → groups `{ billToPartyCode, billToName, rechargeMode, rateCardCode, netAmount, lines[] }` (nothing saved) |
| **Release charges** | `POST /api/fleet/work-orders/{id}/recharges/release` → the recharges made (one per bill-to × mode) |
Each priced line shows `rateCardRef`: `CARD:3` (which card line), `COST` (no rate: at cost), `KEYED`, `FLAT-INCLUDED`
(0, inside a flat-rate job), `TARIFF:…` (a sundry the card added: shop supplies, call-out, minimum charge — it appears as
a new sundry line on the WO). After release the WO's `billingStatus` is BILLED (the screen's **INVOICED** status, prompt 09).

## C. Recharges — NEW page `/fleet/recharges` (no screen today; copy the Work Orders list look)
Sidebar: Fleet Operations, after WO Monitoring. Two tabs:
- **To release**: `GET /api/fleet/recharges/candidates?branchId=` — COMPLETED / CLOSED WOs with unreleased billable lines
  (`billableLines`, `costAmount`); row action Preview / Release (as in B).
- **Released**: `GET /api/fleet/recharges?status=&mode=&workOrderId=&billToPartyCode=&page=&pageSize=` — columns:
  Recharge no / WO no · Bill-to / mode badge (INVOICE blue, DEDUCTION purple) · Labour / Parts / Sublet / Sundry ·
  Net / VAT / Total · Status. Status: RELEASED, ACCEPTED (delivered), **FAILED** (red, show `deliveryError`), INVOICED,
  DEDUCTED, CANCELLED; `externalRef` = the Revenue invoice no / Trucking statement no.
  Row actions: **Retry** (FAILED: `POST …/{id}/retry`), **Refresh** (`POST …/{id}/refresh` — reads INVOICED / DEDUCTED back),
  **Cancel** (`POST …/{id}/cancel { reason, rowVersion }`; refused with 409 once invoiced / on a statement; the lines can
  then be released again). Detail drawer: `GET /api/fleet/recharges/{id}` with its lines.

## D. WO invoices (`/invoice/work-order` + `[id]`) = Revenue invoices of fleet recharges (Platform API)
| Method + path | Permission |
|---|---|
| `GET /api/revenue/fleet/invoiceable?branchId=` → per payer: lines, work orders, amount, VAT, oldest | `revenue.charge.view` |
| `GET /api/revenue/fleet/charges?branchId=&payerPartyCode=&status=READY|INVOICED|CANCELLED&workOrderNo=` | same |
| `POST /api/revenue/fleet/invoices { branchId, payerPartyCode, rechargeIds? \| fleetChargeIds?, invoiceDate?, remarks? }` | `revenue.invoice.issue` at the branch |
| `GET /api/revenue/fleet/invoices?branchId=&payerPartyCode=&page=&pageSize=` · `GET …/{invoiceId}` | `revenue.charge.view` |

| Screen field (`wo-invoice.ts`) | API |
|---|---|
| `receiptNo`, `cashReceiptDate` | `invoiceNo`, `issuedAt` (date part) |
| `customerCode` / `customerName`, `address` | `payerPartyCode` / `payerName`; address from the party (Platform `/api/master/parties/{code}`) |
| `creditTerm` | `paymentTermCode` (CREDIT) |
| `nettAmount`, `vatAmount`, `totalAmount`; `vat` | `subtotalAmount`, `taxAmount` (VAT rounded to whole baht on the invoice), `totalAmount`; VAT % = 7 |
| `workOrderDiscount` | not on the invoice (discounts are already in the line amounts): show 0, read-only |
| `status` ACTIVE / CANCELLED | `status` ISSUED → ACTIVE (voiding is Revenue's credit-note flow, later) |
| lines `workOrderNo`, `chargeCode`, `quantity`, `unitPrice`, `totalAmount` | `workOrderNo`, `chargeCode` (+ `chargeName`), `quantity`, `unitRate`, `amount` |
| lines `equipmentCode`, `serviceType`, `transactionType`, `stockType` | from the matching charge (`fleetChargeId` → `/fleet/charges`): `assetCode`, `sourceLineType` (LABOR / PART / SUBLET / SUNDRY), `rateCardRef` |
"New invoice" = pick a row of `invoiceable` (or tick recharges) → `POST /fleet/invoices` → open the issued invoice.
Invoices are issued at once (no draft). **WO credit notes** (`/invoice/credit-notes/wo`) stay on mock (later phase).

## Done when
- [ ] Tariff pages on the repair-tariff API (lists filtered standard / customer; form + line grid with the "Applies to" cell; actions).
- [ ] WO form Preview / Release; new Recharges page with both tabs and its actions; sidebar + route guards.
- [ ] WO invoice list / detail / new on the Revenue fleet invoice API.
- [ ] EN + TH strings; Vitest for the line-kind → inputs mapping and the recharge status badges; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/12_REPLY.md`.

**This closes P5.** Next: P6 (tyres). Do not commit or push unless the owner asks.
