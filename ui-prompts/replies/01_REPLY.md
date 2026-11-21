# 01 — Reply from the UI session (2026-11-19)

Status: **01 built offline** (APIs were not running). Everything below the line "Done" was checked without the APIs;
the live checks are still open (see "Still to verify live").

## Done
- Proxy (`next.config.ts`): `/api/fleet/*` → 5300 first, `/api/*` + `/auth/*` → 5100, trucking's `resolveOrigin()` guard. `.env.example`.
- `npm run dev` over https on port 5001 (trucking's local certificates, git-ignored). `npm run dev:http` kept for quick UI work.
- `src/lib/api/client.ts` + `problem.ts` ported from trucking unchanged (only messages say Fleet API 5300).
- `npm run api:types` → `src/lib/api/fleet.schema.ts`, `platform.schema.ts` (generated from the 2026-11-19 exports).
- `AuthProvider` (loading / authenticated / anonymous / offline), `/login` (no locale), logout in the existing user menu,
  "Fleet is not enabled" page when `me.modules` lacks `FLEET`, offline banner with "Try again" (no login loop).
- React Query inside AuthProvider (retry only network errors, no refetch on focus, 401 after refresh → clear cache + /login).
- `GET /api/fleet/access` + `canAnywhere / canAt / canTenantWide / branchesFor`; route-guard map for every page
  (`src/lib/access/routeGuard.ts`); sidebar hides links; typed URL → 403 page.
- Branch switcher in the header (`GET /api/branches?Page=1&PageSize=200`), remembered per user id.
- Read-only Fleet Setup page `/master/fleet-setup` (number series + settings, empty states). New sidebar link under Master.
- Vitest (29 new tests): refresh single-flight, 401→refresh→retry, offline detection, route-guard map, access helpers.

## Questions / requests for the backend
1. **`GET /api/fleet/setup/number-series` has no response schema in `fleet-api.json`** (`200: OK`, no content).
   The UI uses a hand-written type (`src/lib/api/fleet/setup.ts → NumberSeries`) built from `CreateNumberSeriesRequest`
   + `example`, `hasIssuedNumbers`, `isKnown`, `rowVersion`, `numberSeriesId`. Please add `Produces<...>` so the
   generated type replaces it — and confirm the field names, especially `numberSeriesId`.
2. **Branch list for the switcher.** The UI shows: all active tenant branches when any fleet permission is tenant-wide,
   otherwise the union of `branchIds` in `/api/fleet/access`. Is that the intended "branches the user can act at"?
   Does `GET /api/branches` need a permission that `ops.lcb` / a TECHNICIAN would not hold? If so a Fleet-side
   `GET /api/fleet/branches` would be simpler.
3. **Route-guard choices to confirm** (UX only; change them if you disagree):
   - `/master/transporters` → `fleet.purchase.view` (transporters treated as vendors).
   - `/fleet/work-requests` → any of `fleet.workrequest.create`, `fleet.workrequest.approve`, `fleet.workorder.view` (there is no `workrequest.view`).
   - `/invoice/work-order` → `fleet.cost.view` or `fleet.recharge.release`.
   - `/fleet/meter-logs`, `/fleet/meter-hr-logs` → `fleet.asset.view` or `fleet.meter.record`.
   - `/master/fleet-setup` → any fleet user (settings readable by all; number series shown only with `fleet.setup.manage`), matching prompt 02.
   - `/tariff/*` → `revenue.tariff.view`, read from the Platform token (`/auth/me` permissions/branchPermissions).
4. Login: `password_change_required` is handled as in trucking (message, no change-password screen). Fine for now?

## Still to verify live (needs Platform 5100 + Fleet 5300)
- Login, reload keeps the session over https, logout.
- The four test users (owner / ops.lcb / gate1.lcb / SSS owner) and a tenant without FLEET.
- `next-auth` is still in package.json; it is removed once the live login is confirmed.

---
## Backend answers (2026-11-19)
1. **Fixed.** Every Fleet endpoint now declares its response type (`.Produces<T>()`); `fleet-api.json` re-exported with
   45 schemas. Run `npm run api:types` and replace the hand-written `NumberSeries` type with the generated `NumberSeriesDto`:
   `numberSeriesId, branchId, seriesCode, description, prefix, separator, includeBranchCode, countPerBranch,
   datePartFormat, resetPeriod, numberLength, startNumber, isGapFreeRequired, isActive, isKnown, example,
   hasIssuedNumbers, rowVersion` — `numberSeriesId` confirmed. Same for assets, axle layouts, drivers, technicians,
   approval policies, labour rates (all now generated).
2. **Yes, that rule is right** (tenant-wide grant → all active branches; else the union of `branchIds` from
   `/api/fleet/access`). `GET /api/branches` needs only a signed-in user (no permission), so ops.lcb and a technician
   can call it. No Fleet-side branch endpoint needed: filter the Platform list by the access result.
3. **Route guards: all confirmed** as you chose them. One note: `/master/transporters` → `fleet.purchase.view` is fine for
   now; transporters become `party.supplier_extension` vendors in a later P1 step and the guard stays the same.
4. **Fine for now.** A change-password screen belongs to the Platform UI; Fleet just shows the message.
