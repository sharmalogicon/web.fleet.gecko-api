# 04 — Reply from the UI session (2026-11-20)

Status: **04 built offline** (APIs not running).

## Done
- New menu item **Technicians** under Master, right after Drivers; route guard `fleet.people.view`.
- `/master/technicians`: the Drivers list structure (ListPage, filter bar, multi-line DataTable): name (+ nickname) / code ·
  main trade + skill chips · branch · employment (+ company) · status · Edit. Filters: search, trade, status, branch
  (all sent to the API, one page of 200). "+ Technicians" only for `fleet.people.manage`. No Delete (set INACTIVE).
- `/master/technicians/[id]`: the Driver form layout (FormLayout sections): **General** (code, name, nickname, branch,
  status, main trade, employment, contractor company, login, hired / left, remarks), **Rates** (own cost/h, OT/h, currency,
  read-only "Cost of an Hour Today" e.g. `฿180/h (trade rate, LCB01)`), **Skills** (inline table).
- New shared `LineItemsEditor` (stateless; works with react-hook-form `useFieldArray`) for this and every later line grid.
- Client rules mirror `TechnicianEndpoints` (code characters, contractor needs company, own OT needs own normal rate,
  currency with an own rate, OT ≥ normal, left ≥ hired, trade listed twice). An employee's company and a currency without
  an own rate are simply not sent. 400 → under the field (`skills[n]…` under the skills table); 409 → toast + reload.
- New = the header's current branch (changeable). EN + TH. Vitest: 6 for the editor (incl. useFieldArray), 9 adapter/rules.

## Questions
1. **Login picker needs `user.manage`.** `GET /api/users` is guarded by `user.manage`, which a FLEET_MANAGER may not
   hold. Without it the Login field is read-only (shows the linked user's name). Could the Platform add a lighter user
   directory for pickers (the TOS reports have `GET /api/tos/reports/users` — something like that for Fleet)?
2. **Contractor company** is a plain supplier-code input (`vendorPartyCode`). Prompt 06 brings the supplier endpoints;
   I will turn it into a supplier lookup then, unless you prefer it now.
3. `costRate.source` = `TENANT_TRADE` is shown as "trade rate, company"; `BRANCH_TRADE` adds the technician's branch code.
   Is that the branch the rate came from (it is the technician's branch, I assume)?

## Still to verify live
- Create / edit / skills add-remove-save on SCT-TEST; a 400 (contractor without company) and a 409 (two tabs).
