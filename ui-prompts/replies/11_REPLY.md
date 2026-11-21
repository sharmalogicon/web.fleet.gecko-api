# 11 — Reply from the UI session (2026-11-20)

Status: **11 built offline** (APIs not running). Every P4 screen reads and writes the API; one new page (Stock Counts).
This closes P4 on the UI side (pending live checks). Same screens and labels as before; status changes are toolbar
actions, a save never sends the status.

## Done
- **A. Stock form**: qty on hand = sum of `/stock?itemId=&onlyInStock=false`, cost per unit (weighted / lowest /
  highest per store), pending = sum of `/purchase-orders/open-lines?itemId=`. Read-only.
- **B. Goods Requests + Goods Requisitions**: one view (`GoodsRequestViews.tsx`) behind both routes. Status mapping
  DRAFT / SUBMITTED / APPROVED / PARTIAL → OPEN (with the API status under it), FULFILLED, CANCELLED / REJECTED →
  CANCELLED. WO picker (asset follows the WO), store, lines (item or one-off description + UoM), ordered / open qty.
  Save, Submit, Approve / Reject, Cancel, **Create PO** → `/fleet/purchase-orders/new?goodsRequestId=` prefilled from
  the open lines (base qty, `goodsRequestLineId`, WO part link, the preferred supplier of the first line).
- **C. Purchase Orders**: supplier picker (Platform suppliers) with the name read-only, quote no, ordered by, payment
  term, VAT %, header discount, store, lines with PERCENT / AMOUNT discount (`discountValue`), received / pending.
  Totals are worked out on screen while DRAFT and come from the API after that. Actions by status: Save, Submit,
  Approve / Reject, Send, Close, Cancel.
- **D. Goods Receipts**: supplier + store (+ optional PO), then **Add from PO lines** (`open-lines`, filtered by the
  chosen PO): qty defaults to what is still open, `unitPrice` is sent only when it differs from the PO. Per line: bin,
  lot / serial (required for LOT / SERIAL items, serial lines are qty 1), expiry, direct-to-WO. Save, Post, Cancel
  (DRAFT) / Reverse (POSTED, reason required).
- **E. Return to Vendor**: supplier + store, **Add from receipts** (POSTED receipts of that supplier into that store,
  lines with `baseQty − returnedBaseQty > 0`), qty capped at what is returnable, credit price defaults to the received
  cost, reason code. Save, Post, Cancel / Reverse.
- **F + G. Goods Adjustments**: INCREASE / DECREASE / WRITE_OFF save to `/stock-adjustments` with a signed `qtyChange`
  (a positive qty is keyed, then sent negative for decrease / write-off); unit cost on INCREASE only (empty = average).
  **TRANSFER** saves to `/stock-transfers` (from store → to store, from / to bin), opened as
  `/fleet/goods-adjustments/{id}?kind=transfer`; Ship, Receive all, Cancel. COUNT adjustments show read-only with a
  link back to the count. The list merges adjustments and transfers (type filter has TRANSFER and COUNT).
- **H. Stock Counts** (new, `/fleet/stock-counts`, sidebar after Goods Adjustments, guard `fleet.stock.adjust`):
  create = store + scope (FULL / CATEGORY from FLEET_ITEM_CATEGORY / BIN / SELECTED stock codes) → the sheet at once.
  Sheet: item, bin, system qty, counted qty input, variance (red / green), remarks, filter; Save counts sends only the
  changed lines; Post (every line counted; saves first) → link to the COUNT adjustment; Cancel.
- **I. Spare Parts Monitoring** on `/stock-issues` (POSTED → ACTIVE, others → INACTIVE; document no, RETURN and the
  API status go into Remarks). **Issue from stock** on the WO Parts tab (saved, not dirty, WO not completed / closed /
  cancelled, `fleet.stock.issue` at the WO's branch): store + ISSUE or RETURN, one qty per STOCK part line, capped at
  qty − issued (ISSUE) or issued (RETURN); `post: true`.
- Errors: 400 → the field messages in the banner; 409 (changed / not enough stock / over the PO) → banner + warning
  toast; 403 / offline → banner.
- Removed the unused mock list / form clients, hooks, `lib/data` and mock files of these screens (the PO mock stays: the
  PO inquiry page still reads it).
- Vitest: status maps, `poActions`, signed qty, receipt line defaults (earlier), plus 8 new (PO line amount, PO from
  goods request, receipt line from open PO line, returnable lines, merged adjustment list, count variance, issued qty
  per WO part, monitoring row). 171 total pass; `tsc` clean; lint clean on the new files; `next build --webpack` passes.

## Questions
1. **Item movements (§A).** The Stock form has no Movements tab, so `/items/{id}/ledger` is not shown. Should it get a
   read-only Movements tab (owner asked for no redesign), or should it go into a report?  get it into report
2. **Approval permissions.** Which permission approves a stock adjustment? The UI shows Approve / Reject to
   `fleet.stock.adjust` at the branch and leaves the "not your own" check to the API. Goods requests and POs use
   `fleet.purchase.approve`. Is that right? yes. thats right
3. **Issued qty on WO parts.** `WoPartDto` has no issued qty, so the Issue dialog adds it up from
   `/stock-issues?workOrderId=`. Could `WoPartDto` return `issuedBaseQty` (and maybe `source` cost after issue)? well technically it should have the issued qty sir. 
4. **Receipt header VAT / discount.** `SaveGoodsReceiptRequest` takes `taxRate` and `discountAmount`, but the prompt says
   they come from the PO. The UI sends 0 on create and the stored values on update. Does the API fill them from the PO
   when `purchaseOrderId` is set? the VAT/discount is a new fileds, where user can always opt for the discount and vat also should be calculated in receipt. 
5. **Lists are client-filtered.** Vendor-name filters (PO / receipts / returns), the screen status (PO / receipts) and
   the WO / equipment filters (spare parts) are applied to the first 200 rows the API returns. Could the lists take
   `supplierName` / `workOrderNo` / `assetCode` search, or should the UI page through? yes.. we need a search too, along with first 200 list
6. **Transfers to another branch.** The "to store" list shows every active store the user can read; receiving needs
   `fleet.inventory.manage` at the receiving branch. Should the sending user be limited to stores of their own
   tenant only (it is), or to a configured list? configured list
7. **UoM conversions** stay base-unit only, as the prompt says: PO lines made from a goods request send an empty UoM
   (base unit) and the base qty. yes. agreed.

## Live checks still open
Create → submit → approve → send a PO from a goods request; receive part of it (lot / serial item, over-receipt 409);
return some to the vendor; adjustment approval with a STOCK_ADJUSTMENT policy; transfer ship / receive across branches;
full count with variances → COUNT adjustment; issue / return parts on a WO and check the WO part cost.

## Follow-up after the owner's answers (2026-11-20)
UI side done (199 Vitest pass, `tsc` clean, lint clean, build passes). New request params / response fields are sent or
read already and fall back while the API lacks them. **Please use these exact names**:

| Q | UI done | Backend to do |
|---|---|---|
| 1 | Item movements = **Operations Reports → Stock Movement Report** (stock code + store + the report's date range → `GET /items/{id}/ledger`, signed qty, cost, value, qty / average after, source document) | none (a PDF / Excel export comes with the reports phase) |
| 2 | **Changed (owner 2026-11-20):** adjustment Approve / Reject now need `fleet.stock.approve` (what the API checks, `StockDocumentEndpoints.cs`) | none |
| 3 | Issue dialog uses `WoPartDto.issuedBaseQty`; until then it adds up the WO's posted issues | Add `issuedBaseQty` (net of returns) to `WoPartDto` |
| 4 | Goods receipt has **VAT %** (defaults from the chosen PO) and a **header discount**; subtotal / discount / VAT / total worked out on screen and sent as `taxRate` / `discountAmount` | Compute `taxAmount` / `totalAmount` from them on save; take VAT from the PO when not sent |
| 5 | Lists send `supplierName` (PO / goods receipts / vendor returns) and `workOrderNo` + `assetCode` (stock issues), and keep filtering the first 200 rows on screen | Accept those params (contains, case-insensitive) on `GET /purchase-orders`, `/goods-receipts`, `/vendor-returns`, `/stock-issues` |
| 6 | Transfer "to store" list asks `GET /warehouses/{id}/transfer-targets` (configured list); 404 → all active stores as today | Add the configured list (per sending store: which stores it may transfer to) + that endpoint; refuse a transfer to a store not on it (400) |
| 7 | none | none |
