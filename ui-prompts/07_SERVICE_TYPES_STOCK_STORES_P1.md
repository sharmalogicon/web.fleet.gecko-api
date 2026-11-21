# 07 — Service Types + Stock on the real API, and one new Stores page (P1, last P1 prompt)

You are the UI session for **Gecko Fleet**. Prerequisite: **01** done. Regenerate the types (`npm run api:types`;
`fleet-api.json` re-exported 2026-11-19: 36 paths, 65 schemas). Read the UI change policy at the top of `ui-prompts/README.md`.

Same screens, real data. The only new page is **Stores** (stores and bins have no screen today).

## A. Service Types (`/fleet/service-types`, `/fleet/service-types/[id]`) → `service-tasks`
| Method + path | Permission |
|---|---|
| `GET /api/fleet/service-tasks?search=&category=&active=&page=&pageSize=` | `fleet.pm.view` |
| `GET /api/fleet/service-tasks/{id}` | `fleet.pm.view` |
| `POST /api/fleet/service-tasks`, `PUT /api/fleet/service-tasks/{id}` (+ `rowVersion`) | `fleet.pm.manage` **tenant-wide** |

No delete: set `isActive` false (hide the Delete action if the screen has one).

| Form field (`types/service-type.ts`) | API |
|---|---|
| `code` | `taskCode` |
| `description` | `descriptionEn` (`descriptionLocal` = Thai, send what you read) |
| `serviceCategory` | `categoryCode` — options from Platform `GET /api/master/code-lists/FLEET_SERVICE_CATEGORY` (starting values are exactly your `SERVICE_CATEGORIES`: ENGINE, TRANSMISSION, BRAKE, TYRE, ELECTRICAL, BODY, PM, INSPECTION); replace the hard-coded constant with the API list |
| `estimationDuration` | `stdHours` (labour hours) |
| `advanceNotifyDay` / `advanceNotifyKM` | `notifyDays` / `notifyKm` |
| `isActive` | `isActive` |
| (none on the form) | `tradeCode`, `expenseGlCode`, `chargeCode`: send what you read, no new inputs |

## B. Stock (`/master/stock`, `/master/stock/[id]`) → `items`
| Method + path | Permission |
|---|---|
| `GET /api/fleet/items/catalogue` | `fleet.inventory.view` |
| `GET /api/fleet/items?search=&type=&category=&supplier=&active=&page=&pageSize=` | `fleet.inventory.view` |
| `GET /api/fleet/items/{id}` | `fleet.inventory.view` |
| `POST /api/fleet/items`, `PUT /api/fleet/items/{id}` (+ `rowVersion`) | `fleet.inventory.manage` |

`aliases`, `vendors`, `stockPolicies`: **null = unchanged**, a list = replaced. The Stock form has none of the first two:
send `null` for them. Search also matches OEM number and aliases.

| Form field (`types/stock.ts`) | API | Notes |
|---|---|---|
| `code` | `itemCode` | |
| `description` | `descriptionEn` | |
| `isActive` | `isActive` | |
| `stockCategory` | `categoryCode` | options: Platform `GET /api/master/code-lists/FLEET_ITEM_CATEGORY` |
| `stockType` | `itemType` | PART, CONSUMABLE, TYRE, LUBRICANT, TOOL, SERVICE (`/items/catalogue`) |
| `brand` | `brandCode` | |
| `uom` | `baseUomCode` | UN/ECE code (H87 piece, LTR litre, KGM kg …); options = `uoms` in `GET /items/catalogue` |
| `isOriginalPart` | `isOriginalPart` | |
| `warrantyValue` / `warrantyPeriod` | `warrantyValue` / `warrantyPeriod` | same values DAY/WEEK/MONTH/YEAR; send both or neither |
| `remarks` | `remarks` | |
| `location`, `leadTime`, `reOrderLevel`, `minQty`, `maxQty`, `reOrderQty` | **`stockPolicies`**: ONE entry for the **default store of the branch selected in the header** (`GET /api/fleet/warehouses?branchId=` → the one with `isDefault`) | `location`→`defaultBinCode` (a new code creates the bin), `leadTime`→`leadTimeDays`, `reOrderLevel`→`reorderPoint`, `minQty`, `maxQty`, `reOrderQty`→`reorderQty`. On save send `stockPolicies` = the policies you read with that one entry replaced (other stores kept). If the branch has no default store, disable these inputs with the hint "Set up a store first (Master → Stores)". |
| `sellingPrice`, `markupClaim` | — | repair tariff (P5): stay on mock |
| `totalQtyOnHand`, `avgCostPerUnit`, `lowest/highestCostPerUnit`, `pendingQty` | — | stock ledger (P4): stay on mock, read-only |

## C. NEW page: Stores (`/master/stores`) — the one new page
Copy the existing Master list + form pattern (same components, multi-line DataTable rows). One menu item "Stores" under
Master, after Stock. Nothing else changes.
| Method + path | Permission |
|---|---|
| `GET /api/fleet/warehouses?branchId=&active=` (array, bins included) | `fleet.inventory.view` |
| `GET /api/fleet/warehouses/{id}` | `fleet.inventory.view` |
| `POST /api/fleet/warehouses`, `PUT /api/fleet/warehouses/{id}` (+ `rowVersion`) | `fleet.inventory.manage` at the branch |
| `POST /api/fleet/warehouses/{id}/bins`, `PUT /api/fleet/warehouses/{id}/bins/{binId}` (+ bin `rowVersion`) | same |

Store fields: `branchId` (cannot change after create), `warehouseCode`, `nameEn`, `nameLocal`, `warehouseKind`
MAIN / WORKSHOP / TYRE_STORE / MOBILE_VAN, `isDefault` (one per branch; setting it moves the flag), `isActive`, `remarks`.
Bins: a small inline table on the store form (`binCode`, `description`, `isActive`) — reuse the inline table you built for
technician skills (prompt 04). No deletes: inactive.
List row: code + name · branch · kind · default badge · bins count · status.

## Done when
- [ ] Service Types and Stock work on the API and look exactly as before (except the API-fed option lists).
- [ ] Stores page + bins work; the Stock form's reorder fields write the default store's policy.
- [ ] 400 / 403 / 409 handled; EN + TH strings for new texts; Vitest for the stock-policy mapping; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/07_REPLY.md`.

Do not commit or push unless the owner asks.
