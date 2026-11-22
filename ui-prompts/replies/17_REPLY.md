# 17 — SAP Business One: reply from the UI session (2026-11-22)

## Done
- Adapter `src/lib/api/fleet/erp.ts`:
  - Connection (404 = none → empty form), save, test.
  - Mappings (list / PUT by key / delete) with the client rules: GL key from the fixed list; TAX / WHT keyed by a rate 0–100, sent without trailing zeros; BP upper-cased.
  - Payment pull, reconciliation, batch retry, batch by id.
  - The batch result is mapped per document (posted DocNum / error).
- §A Fleet Setup: two new tabs, shown only with tenant-wide `fleet.setup.manage`. Code: `fleet-setup/ErpTabs.tsx`.
  - **ERP connection:** URL (help: https Service Layer or `fake://demo`), company DB, user, password secret NAME (never the password), default series, active toggle, remarks.
    - Status chips: "Password configured on the server: yes / no", or "Simulator" for fake://. Last test and last payment pull are shown.
    - **Test connection** shows the message in green / red.
  - **ERP mappings:** one table per type (GL / TAX / WHT / BP) with the hint from the prompt. Add / edit (key fixed when editing) / delete. The GL key is a select, BP uses the supplier picker. 400 messages show under the field.
- §B Export dialog (now `vendor-invoices/ExportDialog.tsx`, opened from the invoice list as before): target **CSV file / SAP Business One**.
  - SAP is disabled when the user can read the connection and it is missing or inactive; otherwise both are offered and the 409 shows.
  - The result shows each document: green DocNum or red error. A document's `erpError` also shows in the ready list.
- §C, in the same dialog:
  - **Earlier exports:** open a batch to see per-document results; **Retry failed** for SAP batches with failures; CSV download kept.
  - **SAP payments:** optional "since" date → **Pull SAP payments** → read / recorded / invoices paid / unmatched.
  - **Reconcile:** from / to → read-only table, non-OK rows coloured (amber for differences, red for missing in SAP).
- Vendor Payments: ERP rows get a "SAP" badge and cannot be picked for a reversal. The invoice / credit-note forms already show `erpDocNum` and `erpError` (prompt 15).
- EN + TH: 74 keys added.
- Checks: tsc clean; Vitest 238 pass (4 new: mapping rules, connection rules, batch result); lint clean; build passes.

## Not done
- **The end-to-end run against `fake://demo`** — the APIs were not running on this PC (5100 / 5300 down). It is listed under live checks.

## Questions
1. `ErpPaymentPullDto.unmatched` items are shown as text (JSON when they are objects). What fields do they carry? The UI can show them as a table.
2. Should the connection tab offer **Delete connection**? There is no endpoint; today a connection can only be switched off.

## Live checks (needs the APIs)
1. Set up `fake://demo` and Test → OK.
2. Add GL / TAX / WHT maps. Export a matched invoice + a credit note to SAP → DocNums.
3. Remove the GL MANUAL map. Export an invoice with an Other-charge line → red error. It reappears in Ready; add the map → Retry failed → posted once.
4. Pull payments → SAP rows on Vendor Payments, invoice PAID.
5. Reconcile → rows OK.
