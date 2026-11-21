# 15 — Vendor billing (AP-lite) on the real API (P8)

You are the UI session for **Gecko Fleet**. Prerequisites: **01**, **06** (suppliers), **09** (work orders), **11**
(purchasing: POs, receipts, vendor returns). Regenerate the types (`npm run api:types`; `fleet-api.json` re-exported
2026-11-20: **184 paths, 257 schemas**). Read the UI change policy.

Same screens, real data — no new page: `/invoice/vendor` (+ `[id]`), `/invoice/vendor/unbilled`,
`/invoice/credit-notes/vendor` (+ `[id]`), `/invoice/vendor-payments` (+ `[id]`). One small addition: an **Export**
button on the vendor invoice list (§E). **Not in P8:** `/invoice/work-order` and `/invoice/credit-notes/wo` (customer-side
WO invoices = Revenue, prompt 12; WO credit notes still to come) — leave them as they are.

Common: UUID ids; `rowVersion` on every write (409 = changed meanwhile → refetch); 400 field errors via `saveErrors.ts`;
lists return `PagedResult`. Permissions: view `fleet.vendorinvoice.view`, key / submit / cancel / pay
`fleet.vendorinvoice.manage`, approve exceptions + credit notes `fleet.vendorinvoice.approve`, export
`fleet.vendorinvoice.export` (all branch-scoped). Number series `FLT_VIN` (internal invoice reference) and `FLT_VCN`.
Amounts are 2-decimal; the API calculates every total — show them read-only.

## A. Unbilled (`/invoice/vendor/unbilled`)
`GET /api/fleet/vendor-invoices/unbilled?supplierPartyCode=&branchId=&source=GRN_LINE|WO_SUBLET|TYRE_EVENT&search=&from=&to=` →
one row per billable source LINE: `source, sourceLineId, sourceDocId, sourceDocNo` (GRN / WO / tyre-maintenance no),
`documentDate, supplierPartyCode, supplierName, purchaseOrderNo, deliveryNoteNo, supplierInvoiceNo, workOrderNo, assetCode,
itemCode, description, uomCode, billableQty` (what is left after returns and earlier invoices), `unitPrice` (what Fleet
expects: PO price net of the PO line discount / sublet actual cost / tyre event cost), `amount, taxRate, currencyCode, isService`.
| Screen column (`unbilled-invoice.ts`) | API |
|---|---|
| `grNo`, `orderDate`, `poNo` | `sourceDocNo`, `documentDate`, `purchaseOrderNo` |
| `vendorName`, `vendorDoNo`, `vendorInvoiceRef` | `supplierName` (or code), `deliveryNoteNo`, `supplierInvoiceNo` |
| `billingCustomer` | — (not on vendor lines; leave empty) |
| `vatAmount`, `totalAmount`, `nettAmount` | compute per row in the adapter: `amount × taxRate / 100`, `amount`, `amount + VAT` |
The screen lists one row per GRN: group the lines by `sourceDocId` in the adapter (sum the amounts); sublets / tyre events
are their own rows (show the source as a small badge). **Create Invoice** on a row → open `/invoice/vendor/new` with that
supplier and the row's lines pre-selected (§B).

## B. Vendor invoices (`/invoice/vendor`, `[id]`)
List `GET /api/fleet/vendor-invoices?search=&supplierPartyCode=&status=&matchStatus=&branchId=&from=&to=&page=&pageSize=`;
`GET …/{id}`; `POST` / `PUT …/{id}` with `SaveVendorInvoiceRequest`.
| Screen field (`vendor-invoice.ts`) | API |
|---|---|
| `documentNo`, `documentDate` | `documentNo` (FLT_VIN, read-only), `documentDate` |
| `customerCode` / `customerName` (the screen's supplier) | `supplierPartyCode` (supplier picker) → `supplierName`; `address` = read-only `supplierAddress` |
| `vendorInvoiceNo` | `vendorInvoiceNo` — the supplier's number, **required**, unique per supplier (409) ; also `invoiceDate` (required), `dueDate` |
| `creditTerm` | `paymentTermCode` |
| `discountType`, `discount`, `discountAmount` | `discountType` PERCENT / AMOUNT, `discountValue`; read-only `discountAmount` |
| `vat`, `vatAmount` | `taxRate`; read-only `taxAmount` |
| `totalAmount`, `nettAmount` | read-only `subtotalAmount`, `totalAmount` (after discount + VAT) and `netPayable` (after WHT) |
| `isWithholdingTax` | tick → send `whtRate: 3` (untick → 0); show read-only `whtBaseAmount` (service lines only), `whtAmount` |
| `status` ACTIVE / CANCELLED | `status` DRAFT, PENDING_APPROVAL, APPROVED, EXPORTED, PAID, CANCELLED (badge) + `matchStatus` MATCHED / EXCEPTION |
| `remarks` | `remarks` |
| lines `stockCode`, `stockType`, `description`, `quantity`, `unitPrice`, `totalAmount`, `vendorInvoiceRef`, `registrationNo` | `itemCode`, `source` (badge), `description`, `qty`, `unitPrice`, `lineAmount`, `sourceDocNo`, `registrationNo` (+ `assetCode`) |
| lines `vat`, `netAmount` | not per line (VAT is on the header) — show `expectedAmount` and `varianceAmount` instead, red when the line's `matchStatus` is EXCEPTION |
Lines are read-only rows today: keep that, plus an **Add lines** picker (the §A rows of the chosen supplier and branch) and an
"Other charge" row (MANUAL: description, qty, unit price). Send each line as `{ source, sourceLineId, qty?, unitPrice?, … }`:
`qty` empty = all that is billable, `unitPrice` empty = the expected price; the supplier's own price goes in `unitPrice`.
Errors: 400 `lines` "Line n: only x … is left to invoice" / "belongs to supplier …" / "another branch's".

Flow and buttons: **Save** (DRAFT), **Save & submit** (`submit: true`) or **Submit** `POST …/{id}/submit`: every line MATCHED →
**APPROVED at once**; otherwise PENDING_APPROVAL. **Approve / Send back** `POST …/{id}/approval { decision APPROVED|REJECTED,
reason }` (send back → DRAFT with `approvalNote`) — needs `fleet.vendorinvoice.approve` and is **refused (403) to the person
who keyed it**: hide the buttons when `createdBy` is the current user. Free-text lines are UNMATCHED and always need approval.
Tolerance = Fleet Setup settings `INVOICE_MATCH_TOLERANCE_PCT` / `_AMOUNT` (the smaller wins). **Cancel** `POST …/{id}/cancel
{ reason }` — not once EXPORTED / PAID or with payments (use a credit note). Show `creditedAmount`, `paidAmount`, `outstandingAmount`.

## C. Vendor credit notes (`/invoice/credit-notes/vendor`, `[id]`)
`GET /api/fleet/vendor-credit-notes?search=&supplierPartyCode=&status=&vendorInvoiceId=&branchId=&from=&to=`, `GET …/{id}`,
`POST` / `PUT …/{id}` (DRAFT only), `POST …/{id}/approve` (`fleet.vendorinvoice.approve`), `POST …/{id}/cancel { reason }`.
| Screen field (`vendor-credit-note.ts`) | API |
|---|---|
| `creditNoteNo`, `creditNoteDate` | `documentNo` (FLT_VCN, read-only) + the supplier's `vendorCreditNoteNo`; `creditNoteDate` |
| `vendorCode`, `vendorName`, `address`, `creditTerm` | `supplierPartyCode` → `supplierName`, `supplierAddress`, `paymentTermCode` |
| `discountType`, `discount`, `discountAmount`, `taxType`, `vat`, `vatAmount`, `totalAmount`, `nettAmount` | `discountType`, `discountValue`, `discountAmount`, `taxCode`, `taxRate`, `taxAmount`, `subtotalAmount`, `totalAmount` |
| lines `transactionNo`, `equipmentCode`, `glCode`, `code`, `description` | `sourceDocNo`, `assetCode`, `glCode`, `itemCode`, `description`; plus `qty`, `unitPrice`, `lineAmount` |
| `status` ACTIVE / CANCELLED, `remarks` | `status` DRAFT / APPROVED / EXPORTED / CANCELLED, `remarks` |
Optional header links: `vendorInvoiceId` (an approved invoice of the supplier; the note lowers what is still to pay on it) and
`vendorReturnId` (a posted return), `reasonCode` RETURN / PRICE / DAMAGE / OTHER. Line sources: **RTV_LINE** (a posted vendor-
return line — pick from the return; each credited once, 409 otherwise; qty / price default to the return's), **INVOICE_LINE**
(a price correction on an invoice line; never more than the line), **MANUAL** (description, qty, unit price, GL code).

## D. Vendor payments (`/invoice/vendor-payments`, `[id]`)
Payments are recorded ON an invoice (AP-lite; SAP takes over in P10): `POST /api/fleet/vendor-invoices/{id}/payments
{ amount, paidAt?, paymentRef?, remarks?, reversesPaymentId?, rowVersion }` — a negative amount reverses an earlier one; an
invoice becomes PAID when payments + approved credits cover `netPayable` (400 when paying more than is owed).
The list page = `GET /api/fleet/vendor-payments?search=&supplierPartyCode=&vendorInvoiceId=&from=&to=&page=&pageSize=` →
`paymentId, documentNo, vendorInvoiceNo, supplierPartyCode, supplierName, paidAt, amount, currencyCode, paymentRef, source`.
| Screen (`vendor-payment.ts`) | API |
|---|---|
| `receiptNo`, `receiptDate`, `vendorName`, `totalAmount` | `paymentRef`, `paidAt`, `supplierName`, `amount` |
| `isApproved`, `approvedBy/On`, Approve button | **no approval step on payments** — recorded payments are final (reverse with a negative one). Hide the Approve button and the Pending filter; ask in the reply if the business needs a payment approval |
| lines (WO no, repair code, container, EIR …) | not applicable (they were the depot's M&R lines): show the paid invoice instead (`documentNo`, `vendorInvoiceNo`) |
The form `[id]` = "Record payment": pick an invoice with `outstandingAmount` > 0 of the supplier, amount, date, reference.

## E. Export to accounting
Button **Export** on the vendor invoice list (`fleet.vendorinvoice.export`): dialog showing `GET /api/fleet/ap-exports/pending?branchId=`
(approved, not yet exported invoices + credit notes: `docType, documentNo, supplierDocNo, supplierName, documentDate, amount`) with
tick boxes → `POST /api/fleet/ap-exports { invoiceIds, creditNoteIds }` (null = all pending) → the batch (`batchNo`, counts,
totals) and a **Download CSV** link `GET /api/fleet/ap-exports/{id}/file`. Exported documents become EXPORTED (read-only).
History: `GET /api/fleet/ap-exports?from=&to=` (a tab or a second dialog — ask in the reply; no new page).

## Done when
- [ ] Unbilled, vendor invoices (+ submit / approval / cancel / payments), credit notes, payments and the export dialog on the API.
- [ ] EN + TH strings; Vitest for the adapters (unbilled grouping per GRN, invoice form ↔ request incl. WHT tick → 3, line source
      mapping, payments list mapping); build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/15_REPLY.md`.

**This closes P8.** Next: P9 (cost, dashboard, inquiries, reports). Do not commit or push unless the owner asks.
