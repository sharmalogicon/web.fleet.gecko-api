# 03 — Equipment pages on the real API (P1) — SAME SCREENS, REAL DATA

You are the UI session for **Gecko Fleet**. Prerequisite: **01** done (API client, auth, branch context, React Query,
generated types). Regenerate the types first (`npm run api:types`; `fleet-api.json` re-exported 2026-11-19 (again after the Spec tab: 47 schemas)).

Read `CLAUDE.md`, the root `TODO.md` and this file. Write your steps into `TODO.md` first.

> **Owner rule (2026-11-19): do not redesign the UI.** Keep the existing `/master/equipment` list and
> `/master/equipment/[id]` form, their tabs, columns, layout, labels and menu names exactly as they are. Only swap the
> data source to the API, plus the few changes listed in §3. If something does not fit without a visible change, ask in
> `replies/03_REPLY.md` instead of changing the screen.

---

## 1. What changed underneath (the back end)
Every piece of equipment is now a record in Fleet's asset register. `assetSource` says where its identity lives:
- `TRUCKING_VEHICLE` / `TRUCKING_CHASSIS`: **linked** (`isLinked = true`). Code, registration, make, model, year, engine
  no, fuel type, branch, ownership and status are **Trucking's** and are read-only in Fleet.
- `FLEET`: equipment Trucking does not hold. Every field is editable.

## 2. Endpoints (Fleet API)

| Method + path | Permission | Notes |
|---|---|---|
| `GET /api/fleet/assets/catalogue` | `fleet.asset.view` | classes, meter types, fuel types, ownerships, statuses: use them for the existing dropdowns |
| `GET /api/fleet/assets?search=&source=&assetClass=&status=&branchId=&page=&pageSize=` | `fleet.asset.view` | `PagedResult`; `search` matches code, registration, name |
| `GET /api/fleet/assets/{id}` | `fleet.asset.view` | |
| `POST /api/fleet/assets` | `fleet.asset.manage` at the branch | "New" on the existing form = a FLEET asset |
| `PUT /api/fleet/assets/{id}` | `fleet.asset.manage` | whole record + `rowVersion`; for linked assets the Trucking-owned fields are ignored |
| `POST /api/fleet/assets/sync-from-trucking` | `fleet.asset.manage` tenant-wide | links / refreshes all Trucking trucks and chassis; `{created, updated, unchanged, deactivated}` |
| `GET /api/fleet/axle-layouts` | `fleet.asset.view` | layouts with `positions` (`1L, 1R, 2LO, 2LI, 2RI, 2RO … SP1`), same convention as your axle map |

## 3. The only visible changes allowed
1. **Read-only fields on linked assets**: disable the Trucking-owned inputs and show a small "Managed in Trucking" badge
   next to the code. No other layout change.
2. **Field mapping** in the adapter (no label changes): `code`→`assetCode`, `brand`→`makeCode`, `model`→`modelName`,
   `yearOfManufacture`→`yearBuilt`, `purchaseDate`→`inServiceDate`, `purchasePrice`→`acquisitionCost` (+ `currencyCode` THB),
   `ownership`→`ownershipType`, `category`→`assetCategoryCode`, `equipmentType`→`assetClass`. Status: the API has
   ACTIVE / INACTIVE / DISPOSED; show `UNDER REPAIR` from `sourceStatus` = UNDER_REPAIR (read-only).
3. **"Sync from Trucking" button** on the list toolbar, only for users with tenant-wide `fleet.asset.manage`.
4. **Axle layout**: one select on the existing General tab (from `GET /axle-layouts`). The tyre axle-map pages may take
   their vehicle list from the API; keep their look.

## 4. Spec tab and the remaining fields (updated 2026-11-19: the Spec tab is now on the API)
- **Spec tab → `specification`** (one nested object on `AssetDto`, `CreateAssetRequest`, `UpdateAssetRequest`), editable on
  EVERY asset, linked ones included (Fleet owns it). Same inputs, same labels; the API uses fixed metric units:
  `grossWeight`→`grossWeightKg`, `netWeight`→`netWeightKg`, `length`→`lengthM`, `width`→`widthM`, `height`→`heightM`
  (metres), `engineCapacity`→`engineCapacityCc`, `horsePower`→`horsePowerHp`, `fuelCapacity`→`fuelCapacityL`,
  `payload`→`payloadKg`, `licenseNo`→`licenceNo` (the asset's operating licence / permit number).
  Send the whole object on save (it replaces every field); omit `specification` only if the form never loaded it.
  Field errors come back as `specification.<field>` (e.g. `specification.netWeightKg`: net above gross).
  For a linked truck, the first sync fills `fuelCapacityL` / `payloadKg` from Trucking when empty; after that they are Fleet's.
- `chassisNo` → the asset's `vin` (in the Thai registration book the chassis number is the VIN); read-only on linked assets.
- Still mock: `currentMeter` (meters arrive in P2) and `customerName` / `driverName` (customer = owner party; driver
  assignment in a later phase).

Not in scope: the `/master/equipment-types` page (leave it as it is), any new page.

## 5. Done when
- [ ] List and form read and write through the API; screens look exactly as before (except §3).
- [ ] Linked assets show Trucking-owned fields read-only; FLEET assets fully editable; 409 / 400 handled.
- [ ] Sync button works for the SCT-TEST owner.
- [ ] `TODO.md` updated; anything that would need a visible change asked in `ui-prompts/replies/03_REPLY.md`.

Do not commit or push unless the owner asks.
