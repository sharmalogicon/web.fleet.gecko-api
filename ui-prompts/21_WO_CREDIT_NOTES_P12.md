# 21 — WO credit notes on the API (P12e)

You are the UI session for **Gecko Fleet**. Prerequisites: **12** (WO invoices from Revenue), **20**.
Regenerate the types (`npm run api:types`; `platform-api.json` re-exported 2026-11-21: **423 paths, 560 schemas**). Read the UI
change policy. No new page. The endpoints are on the **Platform API** (`/api/revenue/...`), like the WO invoices.

## What changed on the API
Revenue now has credit notes (ใบลดหนี้) for every product. The owner chose this on 2026-11-21: database and API only, and TOS and
Trucking screens are not touched.
- A credit note is issued against **one** ISSUED invoice and needs a **reason** (a legal requirement). It credits net amounts on the
  invoice's lines and never more than is still open on a line.
- It is numbered at once (`CN-<branch>-YYMM-nnnnn`).
- It cannot be edited. A wrong one is **cancelled**, which keeps its number and makes its amounts open again.
- The WO invoice and its charges are not changed.

| Call | Permission | Use |
|---|---|---|
| `GET /api/revenue/credit-notes?source=FLEET&creditNoteNo=&payerPartyCode=&status=ISSUED\|CANCELLED&from=&to=&page=&pageSize=` | `revenue.charge.view` | list (newest first) |
| `GET /api/revenue/credit-notes/{creditNoteId}` | `revenue.charge.view` | form |
| `GET /api/revenue/fleet/invoices?payerPartyCode=` | `revenue.charge.view` | pick the WO invoice (prompt 12) |
| `GET /api/revenue/credit-notes/creditable/{invoiceId}` | `revenue.charge.view` | the invoice's lines with `amount`, `credited`, `remaining`, `taxRate` |
| `POST /api/revenue/credit-notes` `{ invoiceId, reason, lines?: [{ invoiceLineId, amount }], creditNoteDate?, remarks? }` | `revenue.invoice.issue` | issue; no `lines` = credit everything still open |
| `POST /api/revenue/credit-notes/{id}/cancel` `{ reason, rowVersion }` | `revenue.invoice.issue` | cancel |

## A. List (`/invoice/credit-notes/wo`)
- Swap `getWOCreditNotes` to the list call with `source=FLEET`.
- Filter mapping: credit note no → `creditNoteNo`, customer → `payerPartyCode` (use the existing customer lookup), dates → `from` / `to`,
  status ACTIVE / CANCELLED → `ISSUED` / `CANCELLED`.
- Row mapping: `creditNoteNo`, `issuedAt` → date, `payerName`, `invoiceNo`, `totalAmount`, status (`ISSUED` shows as **Active**).

## B. Form (`/invoice/credit-notes/wo/[id]`)
**`new`:**
1. The user picks the customer, then one of the customer's WO invoices.
2. Load `creditable/{invoiceId}` into the existing lines grid:
   - `orderNo` → WO no
   - `chargeCode` → code
   - `chargeName` → description
3. Add **one** input column, **Credit amount**. It defaults to `remaining`, is 0 to skip the line, and can't exceed `remaining`. This
   column is the only new field, and the API needs it.
4. The existing **Remarks** box becomes the **reason** (required, 3–500 characters). Header discount, VAT % and tax type are
   **read-only** (they come from the invoice lines).
5. Save sends `POST` and then shows the returned note:
   - Its number replaces "Credit Note No." (that field is read-only, and the API numbers the note).
   - It shows `subtotalAmount` / `taxAmount` / `totalAmount` from the response. Do not compute VAT in the browser: the API rounds VAT
     to whole baht like the invoice.

**An existing note** is read-only and shows the returned lines. The **Cancel** button is enabled only while `status = ISSUED` and the
user has `revenue.invoice.issue`. It asks for a reason and sends `rowVersion`.

Errors:
- 409 "More than is still open …": show the `detail` (it lists each line).
- 409 "fully credited already".
- 400 on `creditNoteDate` (not in the future, not before the invoice).

## Not in this prompt
- TOS and Trucking credit-note screens. The API supports `source=TOS|TRUCKING`, but no screen change was asked for.
- E-invoice / e-Tax submission. Nothing submits invoices yet either.

## Done when
- [ ] A and B work on the API; EN + TH strings; Vitest for the status mapping and the "credit amount ≤ remaining" rule; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/21_REPLY.md`.

Do not commit or push unless the owner asks.
