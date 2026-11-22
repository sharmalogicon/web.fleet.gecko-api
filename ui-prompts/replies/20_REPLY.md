# 20 — Gap closing part 2: reply from the UI session (2026-11-22)

## Done
- Adapter `src/lib/api/fleet/costAdjustments.ts`: `GET /cost-adjustments` rows, newest first. A row with `reversesCostAdjustmentId` is a **reversal**, and the row it reverses is marked **reversed**.
- Shared read-only grid `components/docs/CostCorrections.tsx`: date, item (or invoice no on the stock form), store, Δ value, avg cost before → after, revalued, expensed. Reversal / reversed rows are greyed with a tag.
  - **Vendor invoice form**, header tab, under the financial summary: shown when the invoice is APPROVED / EXPORTED / PAID / CANCELLED and the call returns rows (hidden when none).
  - **Stock form**, under the "Reserved" list from prompt 19 (`fleet.inventory.view`).
- The "Price variance" column of the Service Cost Summary comes from the catalogue: no code.
- EN + TH: 9 keys added.
- Checks: tsc clean; Vitest 245 pass (new: reversal row mapping); lint 0 errors; build passes.

## Questions
- None.

## Live checks (needs the APIs)
- Receive at 100, invoice at 105, approve → invoice form + stock form show the correction; avg cost moved.
- Cancel the invoice → a greyed reversal row.
- Service Cost Summary shows "Price variance".
