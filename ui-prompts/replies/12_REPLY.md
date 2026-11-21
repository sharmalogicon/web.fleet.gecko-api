# 12 — Reply from the UI session (2026-11-20)

Status: **12 built offline** (APIs not running). Types regenerated (fleet 130 paths, platform 410). This closes P5 on
the UI side (pending live checks).

## Done
- **A. Tariff pages = repair tariff** (`components/tariff/RepairTariffViews.tsx`, adapter `lib/api/platform/repairTariffs.ts`).
  `/tariff/standard-rates` lists `standard=true`, `/tariff/customer-rates` `standard=false`; same columns, labels, toolbar.
  Header: code (upper case, locked after the first save), card date, effective from / to (empty = open-ended), party
  picker (customer page; any active party) + name, sales person, contact, currency (THB), remarks, status badge +
  approved date, reject reason. Agent / Forwarder are shown **disabled and empty**.
  Line grid: `lineKind` in the Charge Type column; charge code defaults by kind (WO_LABOR / WO_PARTS / WO_SUBLET for a
  SUBLET markup / WO_SUNDRY) and follows the kind until it is typed over; description; read-only billing unit; `rate`
  with what it means under it. The haulage columns are replaced by ONE "Applies to" cell per the prompt's table
  (LABOR trade + time band + min hrs; FLAT job + std hrs; MARKUP cost band + category incl. SUBLET; PART_PRICE item;
  SUNDRY kind (+ cap for SHOP_SUPPLIES)). Only the kind's fields are sent, the rest null.
  Actions: Save / Submit (DRAFT, REJECTED), Approve / Reject (PENDING), Withdraw (PENDING, APPROVED), **Copy to new card**
  (opens `new?copyFrom=`: same header + lines, code `<code>-COPY`, today). 400 line errors show in the banner; 403
  self-approval and 409 frozen card → banner / toast. **Check a price** tab calls `price-check` for one line.
- **B. WO form**: "Preview / release charges" (COMPLETED / CLOSED, not BILLED, `fleet.recharge.release` at the branch,
  form not dirty) → dialog: one card per bill-to × mode (INVOICE blue, DEDUCTION purple), rate card, net, lines with
  `rateCardRef` explained (card line n, at cost, keyed, in flat-rate job, tariff sundry); Release → toast with the
  recharge numbers, WO refetched (→ INVOICED).
- **C. Recharges page** `/fleet/recharges` (sidebar after WO Monitoring; guard `fleet.recharge.release` or
  `fleet.cost.view`): **To release** (candidates of the header branch, Preview / Release) and **Released** (filters
  status / mode / bill-to; columns as the prompt; FAILED shows `deliveryError`, `externalRef` under the status; Retry /
  Refresh / Cancel with reason; detail drawer with lines).
- **D. WO invoices** on `/api/revenue/fleet/...` (`components/wo-invoices/WOInvoiceViews.tsx`, adapter
  `lib/api/platform/fleetInvoices.ts`): list (header branch; receipt no / customer / status / date filters on the
  loaded rows), read-only detail (address from the party, discount 0, VAT % from the lines, lines joined to their
  fleet charge for equipment / source type / recharge no / rate ref), **New** = pick an invoiceable payer → all READY
  charges ticked (untick to leave some out; all ticked sends no ids) → issue → opens the invoice. Route guard for
  `/invoice/work-order` changed to `revenue.charge.view` / `revenue.invoice.issue`. WO credit notes stay on mock.
- Removed: the static `new/` pages of both tariff screens and WO invoices (they shadowed `[id]` = new and showed the
  old mock form), the old list / form clients, sections, hooks, `lib/data` and mock files of these three screens.
- EN + TH strings; Vitest: line kind → inputs / rate meaning / charge defaults / request mapping, recharge status +
  mode badges / row actions / rate refs / release rule, invoice status / address / line join (12 new → 183 pass);
  `tsc` clean; lint clean on the new files; `next build --webpack` passes.

## Questions
1. **Agent / Forwarder fields** on the customer-rate form are shown disabled and empty. Hide them? (The agent-code
   search on the list was removed, since repair cards have no agent.) yes. remove/hide them.
2. **Expiry on standard cards**: the old standard screen had no expiry field; the API has `effectiveTo`, so "Expiry
   Date" is now on both pages (empty = open-ended). Keep it on the standard page? its always open ended document
3. **Tariff permissions** are read with `can()` from `/auth/me` (tenant-wide). Are `revenue.tariff.*` ever
   branch-scoped? yes..they are branch scoped sir.
4. **Withdraw**: which statuses allow it? The UI offers it on PENDING and APPROVED to holders of `revenue.tariff.approve`. DRAFT/PENDING/APPROVED.
5. **Recharges list permission**: there is no `fleet.recharge.view`; the page shows for `fleet.recharge.release` or
   `fleet.cost.view`. Is that right? Same for the To release tab (needs a branch: the header branch is sent). YES..ITS correct
6. **Invoice lines → charges**: `FleetInvoiceLineDto` has `fleetChargeId` but no asset / source type / rate ref, so the
   detail loads `/fleet/charges?payerPartyCode=&status=INVOICED` to join them. Could the invoice line carry
   `assetCode`, `sourceLineType`, `rateCardRef`, `rechargeNo`? yes, invoice line items does carry the columns mentioned.
7. **WO invoice list** has no search / status / date params; the UI filters the first 200 rows of the branch. , ooh. please we need search and filter boss
8. **Ticking recharges vs. charges** for a new invoice: the UI ticks fleet charges (`fleetChargeIds`); `rechargeIds`
   is unused because `FleetChargeDto` has `rechargeNo` but not `rechargeId`. got it. 

## Live checks still open
Standard + customer card: create, lines of every kind (400 per line), submit, self-approve 403, approve, frozen 409 →
copy; price check. WO completed → preview / release (INVOICE + DEDUCTION groups, tariff sundry line appears on the WO,
WO → INVOICED); Recharges tabs, FAILED → retry, refresh, cancel 409 after invoicing; issue a WO invoice from the
invoiceable list and open it.

## Follow-up after the owner's answers (2026-11-20)
UI side done (199 Vitest pass, `tsc` clean, lint clean, build passes).

| Q | UI done | Backend to do |
|---|---|---|
| 1 | Agent / Forwarder removed from the customer-rate form (and the agent search from the list) | none |
| 2 | Standard page has no Expiry field; standard cards always send `effectiveTo: null` | Optionally refuse `effectiveTo` on a standard card (400) |
| 3 | `revenue.tariff.manage` / `.approve` checked **at the header branch** (new `canAtBranch()` reads `branchPermissions` "perms@branches"); WO invoice issue checked at the payer row's branch **Decided (owner, 2026-11-20): cards stay tenant-wide; the permission is checked at the user's current branch** (as the UI does). No `branchId` on the card. **Done in the UI (owner confirmed):** every API call (Fleet and Platform) now carries `X-Branch-Id: <header branch id>` (left out when no branch is picked; cleared on logout). **API to do:** read `X-Branch-Id` and check branch-scoped permissions (`revenue.tariff.*`, `revenue.invoice.issue`, …) at that branch → 403 when not held there; ignore it for tenant-wide grants. A branch the user has no access to should be refused (403), not trusted. |
| 4 | Withdraw offered on DRAFT, PENDING and APPROVED (`revenue.tariff.approve`) | Allow withdraw from DRAFT |
| 5 | none | none |
| 6 | Invoice detail reads `assetCode`, `sourceLineType`, `rateCardRef`, `rechargeNo` from the line and only loads `/fleet/charges` while they are missing | Add those 4 fields to `FleetInvoiceLineDto` |
| 7 | WO invoice list sends `search` (receipt no or customer), `status` (ACTIVE → ISSUED), `from`, `to`; still filters on screen | Accept `search`, `status`, `from`, `to` on `GET /api/revenue/fleet/invoices` |
| 8 | none | none |
