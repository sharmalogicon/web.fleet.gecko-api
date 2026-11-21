# 19 — Gap closing, part 1: payment approval, stock reservations, depreciation (P12)

You are the UI session for **Gecko Fleet**. Prerequisites: **11** (stock), **15** (vendor billing), **16** (reports).
Regenerate the types (`npm run api:types`; `fleet-api.json` re-exported 2026-11-20: **206 paths, 283 schemas**). Read the UI
change policy. No new page.

## A. Vendor payment approval (`/invoice/vendor-payments`, `[id]`) — the old screen's Approve button comes back
New Fleet Setup setting **`VENDOR_PAYMENT_APPROVAL`** (BOOL, default false; Settings tab as any other). When it is on, a payment
recorded with `POST /vendor-invoices/{id}/payments` **waits**: it does not change the invoice's `paidAmount` yet, but it does use
up what is left to pay (400 "… waits for approval").
- List: `GET /api/fleet/vendor-payments?status=APPROVED|PENDING_APPROVAL|REJECTED` (no status = all of them); rows now carry
  `status`, `decidedAt`, `decidedBy`, `rejectReason`. Map the screen's Pending / Approved filter to `status`; `isApproved` = status APPROVED,
  `approvedOn` = `decidedAt`.
- **Approve** / **Reject** on a pending payment: `POST /api/fleet/vendor-payments/{paymentId}/approval { decision: APPROVED|REJECTED,
  reason? }` (`fleet.vendorinvoice.approve`; reason required for REJECTED). 403 for the person who keyed it — hide the buttons when
  `createdBy` is the current user; 409 when already decided.
- Vendor invoice form: show `pendingPaymentAmount` (new, read-only) next to paid / outstanding when it is not 0.

## B. Stock reservations (Stock form / spare-parts monitoring — no new page)
`GET /api/fleet/stock-reservations?itemId=&warehouseId=&workOrderId=&status=` (default ACTIVE) → `{ stockReservationId, itemCode,
warehouseCode, qty, sourceType WO_PART|GOODS_REQUEST, workOrderNo, goodsRequestNo, status, createdAt }`.
`POST /api/fleet/stock-reservations { warehouseId, woPartId | goodsRequestLineId, qty? }` (qty empty = what the line still needs; 409
"Only x is free in <store>" / "already has an active reservation"); `POST …/{id}/release`. Permission `fleet.stock.issue`.
- `GET /stock` rows already had `qtyReserved` / `qtyAvailable`: they are now real — show them where the Stock form shows quantities.
- Add a **Reserve** action on WO part lines (WO form, parts grid) and goods-request lines when a store is chosen, and a small
  "Reserved" list on the Stock form (the GET above with `itemId`) with **Release**. Issuing a WO part consumes its reservation automatically.

## C. Depreciation (reports only)
The cost ledger now posts **DEPRECIATION** monthly for assets with `inServiceDate`, `acquisitionCost` (+ `currencyCode`),
`residualValue` and `expectedLifeMonths` (Equipment form fields that already exist). The **Service Cost Summary** report has a new
column "Depreciation" — it comes from the catalogue (`GET /reports`), so nothing to hard-code; check the preview shows it.

## Done when
- [ ] A, B, C on the API; EN + TH strings; Vitest for the payment status mapping and the reserve-qty default; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/19_REPLY.md`.

Part 2 of P12 (stock revaluation on invoice price variance, WO credit notes, event-driven Trucking sync) follows in prompt 20.
Do not commit or push unless the owner asks.
