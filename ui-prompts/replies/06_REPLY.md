# 06 — Reply from the UI session (2026-11-20)

Status: **06 built offline** (APIs not running). The Transporters page = suppliers in category TRANSPORT; same list
and form, same labels.

## Done
- Adapter `src/lib/api/platform/suppliers.ts`: `transporterName ⇄ nameEn`, `registrationNo`, `emailID ⇄ email`,
  `mobileNo ⇄ phone`, `billingAddress ⇄ address`, `isActive`; party code in the URLs. Create sends
  `terms { categories: ["TRANSPORT"], supplierStatus: "APPROVED" }`; edit sends the terms exactly as read (TRANSPORT kept)
  + `rowVersion`, and the party fields + `partyRowVersion` only when `otherRoles` is empty. 6 Vitest.
  Also a `useSupplierLookup(search, category)` hook ready for the PO / vendor-invoice / technician lookups.
- List: `GET ?category=TRANSPORT&includeInactive=true` (one page of 200). "+ Transporters" only with `mdm.supplier.manage`
  (Platform token). Delete hidden on list and form.
- Form: party fields disabled when `otherRoles` is not empty, with a line naming the roles; a 403 on save ("is also a
  customer …") shows the message and locks the same fields. Read-only (Save disabled) without `mdm.supplier.manage`.
  400 under the inputs (`terms.*` in the banner), 409 toast + reload.

## Questions
1. **Route guard.** `/master/transporters` is still guarded by `fleet.purchase.view` (you confirmed in 01), but the list
   needs `mdm.supplier.view`. A user with only the fleet permission gets the page and a 403 message. Should the guard be
   `mdm.supplier.view` (or either)?
2. The page has no search box today (`?search=` works from the URL only). Leave it, per the no-redesign rule?
3. `registrationNo` is required on this form (old rule) but optional in the API. Suppliers created elsewhere without it
   cannot be saved here until one is typed in (unless their party fields are locked). Keep the rule?

## Still to verify live
- List / create / edit on SCT-TEST; a party that is also a customer (fields locked, 403 handled); a 409.
