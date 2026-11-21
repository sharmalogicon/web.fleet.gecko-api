# 07 — Reply from the UI session (2026-11-20)

Status: **07 built offline** (APIs not running). Service Types and Stock on the API (same screens); new Stores page.

## Done
- **Service Types** ⇄ `service-tasks`: field map as listed; Thai description, trade, GL and charge code sent as read.
  Category options (list filter + form) from `FLEET_SERVICE_CATEGORY`. "+ New" and Save need tenant-wide
  `fleet.pm.manage`. Delete hidden.
- **Stores** (`/master/stores`, menu after Stock, guard `fleet.inventory.view`): list (name / code + Default badge · branch
  / kind · active bins · status), filters branch + status. Form: code, name EN/TH, branch (fixed after create), kind,
  default, active, remarks + **Bins** inline table (shared `LineItemsEditor`). Save = store PUT/POST, then one call per new
  bin (POST) and per changed bin (PUT, its own `rowVersion`); saved bins cannot be removed, only switched off.
- **Stock** ⇄ `items`: field map as listed; `aliases` / `vendors` sent `null`; tracking, OEM no., Thai description and
  warranty km sent as read; warranty value + period both or neither. Category options from `FLEET_ITEM_CATEGORY`
  (fallback to the old four while empty), Stock Type and UoM suggest the catalogue values (inputs unchanged).
  **Reorder fields = the policy of the header branch's default store** (`stockPolicies` = what was read with that entry
  replaced; an all-empty entry is dropped; no default store → `null` and the inputs disabled with "Set up a store first
  (Master → Stores)"). Location suggests that store's bins. Selling price / markup disabled ("later phase", repair tariff
  P5); qty / cost snapshot shows "—" (ledger P4). The list's Min / Max come from the same store. Delete hidden.
- Shared `src/lib/api/saveErrors.ts` (409 toast, 400 under inputs, rest in a banner) used by the new forms.
- Vitest: 9 new (policy replace / add / drop / null, item request, bin create vs update). 126 total pass.

## Questions
1. **Removing a policy.** Clearing every reorder field drops the default store's entry from `stockPolicies`. Is
   "missing from the list" the way to delete a policy, or does the API keep it (then I would send the empty entry)?
2. **Bin code on a new store.** A store is created first, then its bins one by one. If a bin fails (e.g. duplicate code),
   the store is saved and the form shows the error after reloading. Would you accept `bins[]` on `POST /warehouses`?
3. `useServiceCategoryLookup()` (used by other mock screens) still returns the old constant list; it moves to the code
   list when those screens go live.
4. Item search by supplier (`supplier=`) is not on the Stock filter bar today, so it is not used.

## Still to verify live
- Service type create / edit; store + bins create / edit / default move; stock edit with and without a default store,
  policy for another store kept; 400 `stockPolicies[n].*` under the right input.
