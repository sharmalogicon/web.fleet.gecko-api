# 15 — Vendor billing (AP-lite): reply from the UI session (2026-11-22)

## Done
- §A Unbilled (`src/lib/api/fleet/vendorInvoices.ts`, `VendorInvoiceViews.tsx`):
  - One row per GRN (lines summed; VAT = amount × taxRate / 100 per line; net = amount + VAT). Sublets and tyre events are their own rows, with a source badge.
  - **Create Invoice** opens `/invoice/vendor/new?supplier=&branch=&pick=<row key>` with that row's lines pre-selected.
  - The four search boxes map to the API's one `search` (the first box that is filled).
- §B Vendor invoices, list + form:
  - The supplier picker uses the screen's "Customer Code".
  - New fields the API needs: supplier invoice date, due date, branch. The supplier and branch are fixed after create.
  - Discount type / value and VAT % are keyed. The WHT tick sends `whtRate: 3`; untick sends 0.
  - Totals are read-only from the API, with a live preview while editing.
  - Lines: same columns. "VAT % / Net" now show expected / variance, red on EXCEPTION.
    - Qty / price are editable on a DRAFT: empty = all billable / the expected price.
    - **Add lines** (unbilled lines of the supplier + branch) and **Other charge** (MANUAL).
  - Actions:
    - Save, Save & submit, Approve / Send back (reason; hidden for the person who keyed it), Cancel (reason; hidden once paid).
    - **Record payment** opens `/invoice/vendor-payments/new?invoiceId=`.
  - Shows credited / paid / outstanding (+ pending payments from P12).
- §C Vendor credit notes, list + form:
  - Our `documentNo` is read-only; the supplier's own credit-note number is keyed in a new field.
  - Optional links: an approved invoice and a posted return. Reason code; tax type NONE sends rate 0.
  - Lines: **Add from a return** (RTV_LINE, qty / price default to the return's), **Price correction on invoice line** (INVOICE_LINE), **Other charge** (MANUAL with GL code).
  - Approve / Cancel. `new?invoiceId=` starts a note against an invoice.
- §D Vendor payments:
  - The list (`/vendor-payments`) shows the invoice link and reversals.
  - **Record payment** form: supplier → invoice with outstanding > 0, amount, date, reference, remarks. "Reverses payment" sends a negative amount with `reversesPaymentId`.
  - A recorded payment opens read-only.
  - The P12 payment approval (prompt 19 §A) is **already done here**, because the API has it: the status filter (Pending / Approved / Rejected), Approve / Reject (reason) hidden on your own entry, and the invoice's `pendingPaymentAmount`. Prompt 19 §A therefore only needs a live check.
- §E The **Export** button on the invoice list opens a dialog with two tabs:
  - "Ready to export": tick documents (none = all) → batch → Download CSV.
  - "Earlier exports": `GET /ap-exports` with CSV links.
- Delete removed everywhere; the old mock data / hooks / types for the four pages are deleted.
- EN + TH: 104 keys added.
- Checks: tsc clean; Vitest 230 pass (11 new); lint 0 errors; build passes.

## Questions for the backend
1. **No `GET /vendor-payments/{id}`** — the payment page finds the row in the list (first 200). A by-id endpoint would be safer.
2. **Unbilled `billingCustomer`** — left empty as told.
3. **Export history** — done as a second tab in the Export dialog (no new page). Say if a separate page is preferred.
4. **Invoice `currencyCode` / `exchangeRate`** — no inputs. A new invoice sends `exchangeRate: 1` and no currency (the tenant default is assumed). Confirm the API defaults are right for THB-only tenants.
5. **Credit note `taxCode`** — "Tax type VAT" keeps the current `taxCode` (null on a new note). Should the UI send a code (e.g. `VAT7`), or does the API default it?

## Still open (needs the APIs running)
- LIVE checks: unbilled → invoice (MATCHED → APPROVED at once; price change → PENDING_APPROVAL; another user approves), WHT, cancel, credit note from a return, payment + reversal, export + CSV.
