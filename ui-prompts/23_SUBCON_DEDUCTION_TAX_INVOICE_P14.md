# 23 — SCT tax invoice for subcontractor deductions (P14)

You are the UI session for **Gecko Fleet**. Prerequisites: **12** (recharge), **21**, **22**.
Regenerate the types (`npm run api:types`; `platform-api.json` re-exported 2026-11-21: **425 paths, 563 schemas**; Fleet unchanged).
Read the UI change policy: **no redesign**. Write findings to `replies/23_REPLY.md`.

## What changed
Owner 2026-11-21: workshop work deducted from a subcontractor's (รถร่วม) statement needs an **SCT tax invoice**. The usual
practice in ERP and fleet SaaS products, and the Thai tax point for a service (payment; netting against the payout is the payment),
is what got built:
- **One tax invoice / receipt per subcontractor per PAID statement.** It is dated the statement's paid day and has one line per
  deducted Fleet recharge line, each naming its work order.
- It is issued automatically when Trucking marks the statement **PAID**. Nobody keys it.
- Its total equals what the statement deducted, to the satang (VAT is not rounded to whole baht, because it is already paid by offset).
- On the statement a deduction line now carries **SCT's VAT** (from the recharge) and **no WHT**. Haulage lines keep the
  subcontractor's VAT / WHT as before.
- A wrong one is corrected with a **credit note** (prompt 21, `/api/revenue/credit-notes`), like any invoice.

| Call (Platform API) | Permission | Use |
|---|---|---|
| `GET /api/revenue/subcon-deduction-invoices?subconPartyCode=&settlementNo=&rechargeNo=&workOrderNo=&search=&from=&to=&page=&pageSize=` | `revenue.charge.view` | list, newest first (`from` / `to` = Thai days on the paid date) |
| `GET /api/revenue/subcon-deduction-invoices/{invoiceId}` | `revenue.charge.view` | one invoice with its lines |

`SubconDeductionInvoiceDto`: `invoiceNo`, `status`, `subconPartyCode`, `subconName`, `settlementNo`, `settledAt`, `subtotalAmount`,
`taxAmount`, `totalAmount`, and `lines[]` (`workOrderNo`, `vehicleCode`, `rechargeNo`, `sourceLineType`, `chargeName`, `quantity`,
`unitRate`, `amount`, `taxRate`, `taxAmount`).

## UI actions (only where a screen already has the place)
- **Recharge form (mode DEDUCTION)**, once DEDUCTED: show the tax invoice no. Look it up with `?rechargeNo=` and use the first
  item's `invoiceNo`. This is read-only, a link to the invoice view if the invoice pages have one.
- **WO invoice list / view (`/invoice/work-order`)**: if the screen has a "type" or "source" filter, you may list these too.
  Otherwise **propose** it in your reply and don't add a page.

## Notes
- New tables (runs 061–062, gecko_revenue, additive): `billing.subcon_deduction_invoice`, `billing.subcon_deduction_invoice_line`.
  Applied locally; the owner runs them on Azure later.
- A statement is still only made when the subcontractor has haulage to settle in the period (Trucking rule, unchanged). A
  subcontractor with deductions only waits for their next statement.
