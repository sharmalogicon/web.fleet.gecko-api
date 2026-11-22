# 21 — WO credit notes: reply from the UI session (2026-11-22)

## Done
- Adapter `src/lib/api/platform/creditNotes.ts` (Platform Revenue API, `source=FLEET`):
  - Calls: list, one, `creditable/{invoiceId}`, issue, cancel.
  - Status ISSUED ↔ Active, CANCELLED ↔ Cancelled.
  - Creditable lines sorted by line no; the credit amount defaults to `remaining`.
  - Rules: credit 0..remaining (0 / empty = skip); reason 3–500 characters; nothing to credit when every line is 0.
  - The request sends only lines with a credit > 0.
- §A List `/invoice/credit-notes/wo`:
  - Filters: credit note no → `creditNoteNo`; customer → `payerPartyCode` (the filter's customer box is now the customer lookup `PartyCodeInput role=CUSTOMER`); dates → from / to; Active / Cancelled → ISSUED / CANCELLED.
  - Rows: number, issued date, payer name + invoice no, total, status. No Delete.
- §B Form (`components/credit-notes/WOCreditNoteViews.tsx`):
  - **new:**
    - Header: customer code (lookup) → customer name + address (party), then a select of the customer's ISSUED WO invoices, and the date.
    - Discount / tax type / VAT % are read-only (VAT from the invoice lines). The old Remarks box is the **Reason** (required).
    - Lines tab: the creditable lines in the existing columns (WO no, code, description; Reg No / Service Type / GL Code show "—", there is no source for them) with "Still open" and one input column **Credit amount** (≤ remaining, error under the box).
    - The summary shows only the net credit; VAT / total come from the API after issue (not computed in the browser).
    - **Issue credit note** → POST → opens the returned note. 409 details (per-line "more than is still open", "fully credited") and 400 `creditNoteDate` show in the banner.
  - **existing:** read-only.
    - Number, date, customer, invoice (link), status, VAT %, address, reason, cancel reason.
    - Totals from the note; the lines tab shows the note's lines.
    - **Cancel credit note** (reason, `rowVersion`) only while ISSUED and with `revenue.invoice.issue` at the note's branch.
- Route guard: `/invoice/credit-notes/wo` now needs `revenue.charge.view` or `revenue.invoice.issue` (it was guarded by `fleet.vendorinvoice.view` through the `/invoice/credit-notes` prefix).
- Old WO credit-note mock data / hooks / types / form + list clients removed.
- EN + TH: 23 keys added.
- Checks: tsc clean; Vitest 248 pass (new: status mapping, credit ≤ remaining, request lines, reason length); lint 0 errors; build passes.

## Questions
1. The WO invoice list call has no `status` filter for ISSUED in this UI, so the form filters the rows in the browser. A `status=ISSUED` query would be lighter for customers with many invoices.
2. The screen's Reg No / Service Type / GL Code columns have no source in `CreditableLineDto` / `CreditNoteLineDto` (they show "—"). Add `assetCode` / `registrationNo` to the lines, or should the columns stay empty?

## Live checks (needs the APIs)
- Issue a partial credit on one line → number CN-…; open it again → read-only; credit the rest → "fully credited" on a third try; cancel → amounts open again.
