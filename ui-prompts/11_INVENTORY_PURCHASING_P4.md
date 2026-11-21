# 11 — Stock and purchasing on the real API (P4)

You are the UI session for **Gecko Fleet**. Prerequisites: **01**, **06** (suppliers), **07** (items, stores), **09** (work
orders). Regenerate the types (`npm run api:types`; `fleet-api.json` re-exported 2026-11-19: **115 paths, 182 schemas**).
Read the UI change policy in `ui-prompts/README.md`.

Same screens, real data: `/fleet/goods-requests`, `/fleet/goods-requisitions`, `/fleet/purchase-orders`,
`/fleet/goods-receipts`, `/fleet/goods-adjustments`, `/fleet/return-to-vendor`, `/fleet/spare-parts/monitoring` and the
qty fields of `/master/stock/[id]`. One new page only: **Stock Counts** (no screen today). Status changes become
**action buttons** on the form toolbar; the API owns every status — never send it in a save.

Common to every document below:
- Create = `POST` (DRAFT, number from the series given; 409 "No active … number series" = Setup → initialize).
  `PUT /{id}` changes a DRAFT, **lines replaced as a whole**, `rowVersion` required. Many creates take
  `submit: true` / `post: true` / `ship: true` to save and act in one call.
- Actions take `{ reason?, rowVersion }` (`DocumentActionRequest`); approvals take `{ decision: APPROVED|REJECTED, reason, rowVersion }`.
- Quantities: a line has `qty` + `uomCode` (empty = the item's base unit) and comes back with `uomFactor` / `baseQty`.
  Conversions other than the base unit are not editable through the API yet (only base units work for now).
- 409 also means "not enough stock" (title says how much is available) and "more than still open on the PO".
- Reading needs `fleet.inventory.view` (stock) / `fleet.purchase.view` (purchasing) at the branch.

## A. Stock screen (`/master/stock/[id]`) — read-only qty fields
| Field (`types/stock.ts`) | API |
|---|---|
| `totalQtyOnHand` | sum of `qtyOnHand` from `GET /api/fleet/stock?itemId={id}&onlyInStock=false` (one row per store × bin × lot; show the rows in a small table under the field if you like) |
| average cost (if shown) | `avgUnitCost` (per store) |
| `pendingQty` | sum of `pendingQty` from `GET /api/fleet/purchase-orders/open-lines?itemId={id}` |
| `minQty` / `maxQty` / `reOrderQty` | stay on the item's stock policies (prompt 07) |
Item movements: `GET /api/fleet/items/{id}/ledger?warehouseId=&from=&to=` (newest first: movement type, qty, unit cost,
value, qty / average after, source document no). Show it as a read-only "Movements" list on the stock form only if a
tab for it exists; otherwise put it in `replies/11_REPLY.md` as a question.

## B. Goods Requests + Goods Requisitions → one API document `/api/fleet/goods-requests` (FLT_GRQ)
Both screens show the same documents: **Goods Requests** = the list / header view, **Goods Requisitions** = the same
document with its lines and approval. `POST` / `PUT` need `fleet.purchase.request`.
| Screen field | API |
|---|---|
| `reqNo` / `documentNo`, `reqDate` / `documentDate` | `documentNo` (read-only), `documentDate` |
| `requireDate` | `requiredDate` |
| `workOrderNo` | `workOrderId` (WO picker; branch and asset follow the WO) |
| `equipmentCode` | `assetProfileId` (or from the WO) |
| `jobRefNo`, `remarks` | `jobRefNo`, `remarks` |
| (store — one select the API needs) | `warehouseId` (optional) |
| lines `stockCode`, `quantity`, `uom`, `remarks` | `lines[]`: `itemId` (or `description` + `uomCode` for a one-off part), `qty`, `uomCode`, `remarks`, `preferredSupplierPartyCode` |
| status OPEN / FULFILLED / CANCELLED | API → screen: DRAFT, SUBMITTED, APPROVED, PARTIAL → OPEN (badge with the API status); FULFILLED → FULFILLED; CANCELLED, REJECTED → CANCELLED |
| `isApproved`, `approvedBy/On` | `approvalStatus` APPROVED or NOT_REQUIRED, `approvedAt` |
Actions: Submit (`…/submit`; APPROVED at once unless a GOODS_REQUEST policy exists) · Approve / Reject (`…/approval`) ·
Cancel (refused once a PO orders for it) · **Create PO** (opens a new PO prefilled from the open lines:
`goodsRequestId` + each line's `goodsRequestLineId`). Each line shows `orderedBaseQty` / `openBaseQty`.

## C. Purchase Orders `/api/fleet/purchase-orders` (FLT_PO; `fleet.purchase.manage`)
| Screen field (`types/purchase-order.ts`) | API |
|---|---|
| `vendorCode` / `vendorName` | `supplierPartyCode` (supplier picker, Platform `/api/master/suppliers`) / `supplierName` (read-only) |
| `requireDate`, `vendorQuotationNo`, `orderBy`, `creditTerm` | `requiredDate`, `vendorQuoteNo`, `orderedByName`, `paymentTermCode` |
| `goodsRequestNo` | `goodsRequestId` → `goodsRequestNo` |
| `vat` | `taxRate` (%) |
| `discountAmount` (header) | `discountAmount` |
| `totalAmount`, `totalVAT`, `nettAmount` | read-only `subtotalAmount`, `taxAmount`, `totalAmount` (= subtotal − discount + VAT) |
| (store) | `warehouseId` — where it will be delivered (one select the API needs) |
| lines `stockCode`, `quantity`, `uom`, `unitPrice`, `discountType`, `discountAmount`, `remarks` | `itemId` (or `description` + `uomCode`), `qty`, `uomCode`, `unitPrice`, `discountType` PERCENT/AMOUNT, **`discountValue`** (the keyed % or amount), `remarks`; back: `discountAmount`, `lineAmount` |
| lines `receivedQty`, `pendingQty` | read-only `receivedQty`, `pendingQty` (and `cancelledQty`) |
| `isApproved`, `approvedBy/On`, `isCancel` | `approvalStatus`, `approvedAt`; Cancel action |
Statuses: DRAFT → (submit) APPROVED or PENDING_APPROVAL → SENT → PARTIALLY_RECEIVED → RECEIVED → CLOSED; REJECTED,
CANCELLED. Actions: Submit · Approve / Reject (not your own PO) · Send · Close (what is not received is cancelled) ·
Cancel (only while nothing was received). The PO PDF comes with reports later.

## D. Goods Receipts `/api/fleet/goods-receipts` (FLT_GRN; `fleet.purchase.receive` at the store's branch)
| Screen field | API |
|---|---|
| `vendorName` | `supplierPartyCode` |
| `poNo` | `purchaseOrderId` (currency, rate and VAT come from it) |
| `receiptBy`, `remarks` | `receivedByName`, `remarks`; also `deliveryNoteNo`, `supplierInvoiceNo`, `receivedAt` |
| (store) | `warehouseId` (required) |
| lines | pick from `GET /purchase-orders/open-lines?supplierPartyCode=&warehouseId=` → `purchaseOrderLineId` + `qty`; price and discount default from the PO line (send `unitPrice` only if it differs). `poQty` comes back on each line. Optional per line: `binId`, `lotNo` / `serialNo` (**required** for LOT / SERIAL items; a serial line is qty 1), `expiryDate`, `directToWorkOrderId` |
| `totalAmount` | read-only `totalAmount` |
**Post** (`post: true` or `…/post`) puts the stock in at the line's net cost (the header discount is not spread into
stock cost), raises the PO's received qty and status. More than the PO's open qty → 409 (tolerance setting
OVER_RECEIPT_TOLERANCE_PCT). A line with `directToWorkOrderId` goes straight onto that work order (a DIRECT_PO part line).
Cancel: a DRAFT is dropped; a POSTED receipt is reversed — refused once goods were returned or sent to a work order.

## E. Return to Vendor `/api/fleet/vendor-returns` (FLT_RTV; `fleet.purchase.receive`)
| Screen field | API |
|---|---|
| `vendorCode` / `vendorName` | `supplierPartyCode` / `supplierName` |
| `returnDate`, `returnBy`, `remarks` | `documentDate` (read-only), `returnedByName`, `remarks`; also `reasonCode` (DAMAGED, WRONG_ITEM, EXCESS, WARRANTY, OTHER) |
| (store) | `warehouseId` — the store it was received into |
| lines `poNo`, `serialNo`, `stockCode`, `quantity`, `unitPrice`, `totalAmount` | pick posted receipt lines of that supplier (`GET /goods-receipts?supplierPartyCode=&status=POSTED`, lines with `baseQty − returnedBaseQty > 0`) → `goodsReceiptLineId`, `baseQty`, optional `creditUnitPrice`; back: `purchaseOrderNo`, `serialNo`, `itemCode`, `creditUnitPrice`, `creditAmount` |
| `totalAmount` | `expectedCreditAmount` |
Post takes the stock out at the received cost and lowers the PO's received qty. Cancel reverses a posted return.

## F. Goods Adjustments `/api/fleet/stock-adjustments` (FLT_ADJ; `fleet.stock.adjust`)
| Screen field | API |
|---|---|
| `adjustmentDate`, `remarks` | `documentDate` (read-only), `remarks`; `reasonCode` optional (DAMAGE, EXPIRED, LOST, FOUND, OTHER) |
| `adjustmentType` INCREASE / DECREASE / WRITE_OFF | `adjustmentType` (COUNT ones come from stock counts, show them read-only) |
| `adjustmentType` **TRANSFER** | not an adjustment: the form saves through **`/api/fleet/stock-transfers`** (see G) — same screen, the line grid gets a "to store" select |
| (store) | `warehouseId` (one select the API needs) |
| lines `stockCode`, `quantity`, `price`, `stockLocationDescription` | `itemId`, **`qtyChange` signed** (INCREASE > 0; DECREASE / WRITE_OFF < 0: the screen keys a positive qty, send it negative), `unitCost` (increase only; empty = current average), `binId` |
| `totalPrice` | read-only `amount` per line, `totalAmount` |
Actions: Submit (posts at once, or PENDING_APPROVAL when a STOCK_ADJUSTMENT policy covers its value) · Approve / Reject
(`…/approval`, not your own) · Cancel (a posted one is reversed).

## G. Transfers `/api/fleet/stock-transfers` (FLT_TRF) — reached from the adjustment screen's TRANSFER type
`POST { fromWarehouseId, toWarehouseId, lines: [{ itemId, qty (base unit), binId?, stockLotId?, toBinId? }], ship? }`
(`fleet.stock.issue` at the sending branch). Ship (`…/ship`) takes the stock out at the sender's average (IN_TRANSIT);
Receive (`…/receive { lines?: [{ stockTransferLineId, receivedQty }] }`, `fleet.inventory.manage` at the receiving branch;
no lines = all in full) brings it in at the same cost; Cancel (DRAFT, or IN_TRANSIT → stock goes back). The adjustment
list shows transfers too: merge `GET /stock-transfers` into it with type TRANSFER.

## H. Stock Counts — NEW page `/fleet/stock-counts` (list + `[id]`), copy the Goods Adjustments pages' look
`POST /api/fleet/stock-counts { warehouseId, scope: FULL|CATEGORY|BIN|SELECTED, scopeValue?, itemIds? }` makes the
sheet at once (status COUNTING, `systemQty` frozen now). `PUT …/{id}/counts { lines: [{ stockCountLineId, countedQty, remarks? }], rowVersion }`
(any subset, repeatable). `POST …/{id}/post` (every line counted) → one COUNT adjustment of the variances
(`stockAdjustmentId`; link to it). `…/cancel`. Grid: item, bin, system qty, counted qty (input), variance (red / green).
Add it to the sidebar under the inventory group, after Goods Adjustments; guard with `fleet.stock.adjust`.

## I. Spare Parts Monitoring (`/fleet/spare-parts/monitoring`) — read-only
`GET /api/fleet/stock-issues?workOrderId=&status=&from=&to=` (`fleet.inventory.view`): `workOrderNo`, `assetCode`
(equipment), `documentDate` (+ time from `postedAt`), `totalCost` (grand total), status POSTED → ACTIVE, CANCELLED → INACTIVE.
Issuing parts to a work order itself: `POST /api/fleet/stock-issues { warehouseId, issueTo: "WORK_ORDER", workOrderId,
lines: [{ itemId, qty, woPartId? }], post: true }` — add an **"Issue from stock"** button on the work-order Parts tab
(prompt 09) that does this for the selected STOCK part lines; the WO's part cost then comes from the stock average.
A RETURN (`issueKind: "RETURN"`, each line names its `woPartId`) brings parts back at that line's cost.

## Done when
- [ ] Screens A–I on the API; actions per status; 400 / 403 / 409 handled (incl. "not enough stock", over-receipt).
- [ ] EN + TH strings for new texts; Vitest for: status mappings (B, C), signed qty for adjustments (F), receipt line
      defaults from an open PO line (D); build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/11_REPLY.md`.

**This closes P4.** Next: P5 repair tariff + recharge (customer / subcontractor charging of work-order lines).
Do not commit or push unless the owner asks.
