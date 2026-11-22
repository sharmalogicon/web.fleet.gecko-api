# 14 — Fuel logs, accidents, insurance claims, traffic violations: reply from the UI session (2026-11-22)

## Done
- Types regenerated from the 2026-11-21 export (P14). One old test fixture needed `issuedBaseQty` (P13 field).
- §A lookups: `src/lib/api/fleet/lookups.ts`, cached for the session; shows `nameLocal` when the UI is TH.
- §B fuel: list / form / approval page on the API (`src/lib/api/fleet/fuelLogs.ts`).
  - OWN_TANK sends store + item and no price; VENDOR sends the price and an optional supplier.
  - Distance, cost / km, hours, cost / hour and km / L are read-only from the API.
  - Save-and-submit uses `submit: true`.
  - Approve / Reject (with a reason) are hidden on your own entry.
  - Cancel needs a reason.
  - A Trucking-linked asset shows the "From Trucking" badge and the Trucking fuel rows read-only, with no Save. The list shows Fleet logs only.
- §C accidents (`accidents.ts`): list + form.
  - One third party ↔ `parties[]`.
  - Driver: the code picker sends `driverId`; otherwise the free `driverName` is sent.
  - Country is the 2-letter code.
  - Raise work request (priority / problem / odometer / bill-to), the WR link, the read-only WO table, Close (shown disabled while a WO is open) and Cancel.
  - The Photos tab uses the WO photo component, now generic: `AttachmentsTab` + owner-based hooks in `woAttachments.ts`.
- §D claims (`insuranceClaims.ts`): list + form.
  - Accident picker, also `new?accidentId=`.
  - Editable lines on DRAFT. WO-copied lines go back with `source` + `sourceLineId`, and their kind / description / qty are locked.
  - `lines: null` when the lines did not change.
  - Totals read-only, with a live preview while editing.
  - Actions: Copy from WOs, Submit, Approve (approved amount, deductible, insurer claim no), Reject (reason), Settle, Revise (opens the new draft) and Cancel.
- §E violations (`trafficViolations.ts`): list + form.
  - A read-only "Payment + deduction" block.
  - Actions: Pay, Deduct (amount ≤ fine; hint for PAYROLL vs SUBCON), Take back (hidden once exported), Refresh (SUBCON), Dispute, Reopen and Cancel.
  - "Payroll deductions" button on the list opens a dialog. Pick rows (none = all) → `export` → CSV of the returned rows.
- Delete is removed from all four lists and forms (the API has none). The old mock data, hooks and types for the four are deleted.
- EN + TH: 163 keys added.
- Checks: tsc clean; Vitest 219 pass (17 new); lint 0 errors on the new files (2 `watch()` warnings, the same as older screens); `next build --webpack` passes.

## Questions / requests for the backend
1. **Accident `hasInjuries`, `estimatedCost`** — the screen has no spot for them, so they are not shown and are sent back as read. Add an "Injuries" checkbox and "Estimated cost" to the General tab? (owner)
2. **Violation `issuingAuthority`, `locationText`, `points`, `dueDate`** — same: no inputs, sent back unchanged. Add them to the Violation Details section? (owner)
3. **Claim insurer** — the screen's "Vendor" field is used as the free `insurerName`; `insurerPartyCode` is kept as read. Is a party picker for the insurer wanted?
4. **Fuel `decidedBy` is a user id** — could the DTO also carry `decidedByName` (the old screen showed "approved by")?
5. **Fuel item picker (OWN_TANK)** — the UI lists all active items. Could `GET /items` take a filter for fuel items (category or a flag), or should the UI filter by a code-list category? Which category code?
6. **Payroll hand-off** — done as proposed: a button on the violations list opens a dialog. Say if another place is preferred.

## Still open (needs the APIs running)
- LIVE checks for all four pages, the approval queue and the payroll dialog on SCT-TEST. Run Setup → "Set up defaults" first (FLT_FUEL / FLT_TVN series).
