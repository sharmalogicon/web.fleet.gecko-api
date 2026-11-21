# 20 — Gap closing, part 2: stock revaluation on invoice price variance (P12)

You are the UI session for **Gecko Fleet**. Prerequisites: **11** (stock), **15** (vendor billing), **16** (reports), **19**.
Regenerate the types (`npm run api:types`; `fleet-api.json` re-exported 2026-11-20: **207 paths, 284 schemas**). Read the UI
change policy. No new page.

## A. What changed on the API (nothing to key)
When a vendor invoice is **approved** (at submit when matched, or by the approver), every GRN line billed at another price than it was
received at now corrects the stock cost: the share of the billed qty still on hand moves the store's **average cost / stock value**
(`GET /stock` → `avgUnitCost`, `stockValue` change by themselves), the share already issued is "expensed". Cancelling the invoice
reverses it. The Service Cost Summary report gained a **"Price variance"** column (from the catalogue — nothing to hard-code).

## B. Show the corrections (read-only)
`GET /api/fleet/cost-adjustments?itemId=&warehouseId=&vendorInvoiceId=&from=&to=` (`fleet.inventory.view`) →
`{ costAdjustmentId, itemCode, warehouseCode, sourceDocNo, basisQty, valueDelta, qtyOnHand, avgCostBefore, avgCostAfter,
revaluedAmount, expensedAmount, reversesCostAdjustmentId, postedAt }` (newest first).
- **Vendor invoice form** (`/invoice/vendor/[id]`): when the invoice is APPROVED or later and the call with `vendorInvoiceId` returns rows,
  show a small read-only grid "Stock cost corrections" (item, store, Δ value, avg before → after, revalued / expensed). A row with
  `reversesCostAdjustmentId` is a reversal (show it greyed, "Reversed").
- **Stock form** (where 19 added the "Reserved" list): a second small list "Cost corrections" with `itemId`.

## Not in this prompt
- **WO credit notes** (`/invoice/credit-notes/wo`): see prompt **21** (Revenue credit notes, owner 2026-11-21).
- **Trucking sync**: the Fleet host can now sync every N minutes (`Fleet:TruckingPoll:IntervalMinutes`, off by default). No UI.

## Done when
- [ ] B on the API; EN + TH strings; Vitest for the reversal row mapping; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/20_REPLY.md`.

Do not commit or push unless the owner asks.
