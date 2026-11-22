# 19 — Gap closing part 1: reply from the UI session (2026-11-22)

## Done
- §A Vendor payment approval: **already built in prompt 15** (`components/vendor-payments/VendorPaymentViews.tsx`):
  - The screen's Pending / Approved (+ Rejected) filter maps to `status`.
  - Approve / Reject (reason required for Reject); hidden for the person who keyed it and for non-pending rows.
  - `isApproved` / `decidedAt` are shown, plus the invoice form's `pendingPaymentAmount` when not 0.
  - The `VENDOR_PAYMENT_APPROVAL` setting shows on Fleet Setup → Settings from the settings catalogue (no UI code).
- §B Stock reservations (`src/lib/api/fleet/stockReservations.ts`, shared `components/docs/ReserveStockDialog.tsx`):
  - **WO form, Parts grid:** a **Reserve stock** button next to "Issue from stock" (same rule: saved, not closed, `fleet.stock.issue`, has STOCK parts). Dialog: pick the store, then per STOCK part either its active reservation (qty @ store, **Release**) or a qty box (empty = what the line still needs) + **Reserve**. 409 messages show on the line.
  - **Goods request form:** the same button when the request has a store and is SUBMITTED / APPROVED / PARTIAL (`fleet.stock.issue`). It uses the request's store by default.
  - **Stock form:** "Reserved Qty" and "Available Qty" next to Qty on Hand, from `/stock` (`qtyReserved` / `qtyAvailable` summed over stores, bins and lots). A "Reserved" list (`?itemId=&status=ACTIVE`) with **Release** (`fleet.stock.issue`).
- §C Depreciation: no code. The Service Cost Summary preview takes its columns from the catalogue (prompt 16), so "Depreciation" appears once the API sends it — live check.
- EN + TH: 15 keys added.
- Checks: tsc clean; Vitest 244 pass (new: reserve request default qty, store / qty rules, active reservation lookup, reserved / available snapshot); lint 0 errors; build passes.

## Questions
1. `GET /stock-reservations` has no `goodsRequestId` filter. The goods-request dialog lists the store's active reservations and matches them by line id. A `goodsRequestId` filter would be lighter.
2. Reserving on a DRAFT goods request is not offered (only SUBMITTED / APPROVED / PARTIAL). Should DRAFT be allowed too?

## Live checks (needs the APIs)
- VENDOR_PAYMENT_APPROVAL on → record a payment → Pending → another user approves → invoice paid.
- Reserve a WO part → Stock form shows reserved / available + list → issue the part → reservation consumed; Release on another.
- Service Cost Summary shows a Depreciation column for an asset with in-service date / cost / life.
