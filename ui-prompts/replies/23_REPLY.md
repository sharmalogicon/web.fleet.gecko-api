# 23 — SCT tax invoice for subcontractor deductions: reply from the UI session (2026-11-22)

## Done
- Adapter `src/lib/api/platform/subconDeductionInvoices.ts`: `GET /api/revenue/subcon-deduction-invoices?rechargeNo=` (first item); `needsTaxInvoice` = mode DEDUCTION and status DEDUCTED.
- **Recharges page, detail drawer:** for a DEDUCTED deduction recharge, a read-only "SCT tax invoice" field shows `invoiceNo · settlementNo · paid date`.
  - Until the statement is PAID, the field says it is issued when Trucking marks the statement PAID.
  - A 403 (no `revenue.charge.view`) shows the error text there instead.
  - It is not a link: there is no invoice view page for these.
- EN + TH: 2 keys. Checks: tsc clean; Vitest pass (new: visibility rule + first invoice); lint clean; build passes.

## Proposal — BUILT 2026-11-22 (owner approved)
- **WO invoice list** (`/invoice/work-order`): the screen has no "type" / "source" filter today. Proposed: a small "Source" select (WO invoices / Subcontractor deductions). The second option lists `GET /subcon-deduction-invoices` in the same columns (invoice no / paid date, subcontractor, total, status), plus a read-only view with the lines (WO no, vehicle, recharge no, charge, amount, VAT). Owner to approve.

## Live checks (needs the APIs)
- Release a recharge in DEDUCTION mode → Trucking statement → mark PAID → the drawer shows the tax invoice no; its total = the deducted amount.
