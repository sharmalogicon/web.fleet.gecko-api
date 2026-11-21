# 03 — Reply from the UI session (2026-11-20)

Status: **03 built offline** (APIs not running). Same list, form, tabs, labels; data now from `/api/fleet/assets`.

## Done
- Adapter `src/lib/api/fleet/assets.ts`: the §3.2 / §4 field map both ways, the whole record on PUT (fields the form does
  not show are sent back as loaded), `specification` always sent whole, `UNDER REPAIR` from `sourceStatus` (kept read-only:
  the stored status is sent back), API field errors (incl. `specification.*`) mapped back under the form inputs. 15 Vitest.
- **Spec tab units:** the existing labels say Length / Width / Height **(mm)**; the API stores metres. The adapter converts
  (6.85 m ⇄ 6850 mm), so no label changed.
- List: `search` + `status` go to the API (one page of 200, the API maximum); "UNDER REPAIR" and Category are filtered on
  the loaded rows. Category options come from `FLEET_ASSET_CATEGORY` (falls back to the old four values while empty).
  "Sync from Trucking" button for tenant-wide `fleet.asset.manage`; "+ Equipment" only for users with `fleet.asset.manage`.
- Form: linked assets show the "Managed in Trucking" badge next to the code; code, registration, brand, model, year,
  engine no, chassis no (vin), fuel type, ownership and status are disabled with a tooltip. Meter / fuel selects use the
  catalogue lists; Equipment Type / Category / Ownership stay text inputs with suggestions (classes, code list,
  ownerships). New "Axle Layout" select on General (§3.4). New = FLEET asset at the header's current branch.
- 409 → toast + the form reloads the latest version; 400 → messages under the inputs, the rest in a banner.

## Questions (each would need a visible change, so I did NOT make it)
1. **No delete endpoint for assets.** The list and form keep their Delete buttons but they are disabled, with the tooltip
   "set the status to Inactive or Disposed instead". OK, or should they be removed?
2. **Disposal date.** `status = DISPOSED` needs `disposedDate`; the form has no such field. The UI sends today's date
   (or the stored one). Add a "Disposed Date" input next to Status?
3. **Owner party.** `ownershipType` LEASED / SUBCON / CUSTOMER needs `ownerPartyCode`; the form has no owner field
   (the "Customer" field is the owner party per §4, still mock). Creating a non-OWN Fleet asset therefore gets a 400 under
   Ownership. Can "Customer" become the owner-party lookup (which Platform endpoint)?
4. **Category list is empty.** `FLEET_ASSET_CATEGORY` has no global values, so every category is refused until the tenant
   adds some. Please seed SCT-TEST (TRUCK, TRAILER, FORKLIFT, PICKUP were the old filter values) or say who maintains it.
   Also: the list endpoint has no `category` filter — please add one so the UI need not filter the loaded page.
5. **Branch.** The list shows every asset the user can see at any branch (as the old screen did), not the header's
   current branch. Should it follow the branch switcher?
6. **Still mock / disabled:** Current Meter (P2), Customer and Driver are shown disabled ("later phase") because nothing
   stores them yet. The PM "Add equipment" modal, report preview and the equipment lookup still read the mock list.
7. The tyre axle-map pages still use their mock vehicle list (optional in §3.4); I will switch them with prompt 13.

## Still to verify live
- List / search / filters and the form on SCT-TEST; a linked truck read-only, a FLEET asset fully editable.
- Sync from Trucking as the owner; a 409 (two tabs) and a 400 (e.g. net weight above gross).
