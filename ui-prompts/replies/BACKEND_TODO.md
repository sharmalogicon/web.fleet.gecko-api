# Backend to-do for Fleet (consolidated, 2026-11-20)

> **2026-11-21: ALL items #1–#20 shipped by the backend (P13). See prompt `22_BACKEND_TODO_P13.md` for names, rules and the UI actions.**

One list for the API owner, from the owner's answers in `11_REPLY.md`, `12_REPLY.md`, `13_REPLY.md` and the live tests
(`LIVE_TEST_FINDINGS.md`). **The UI is already built for every item** (it sends / reads the names below and falls
back while they are missing), so no UI work is waiting on this list. Use the exact names. When an item ships,
re-export `fleet-api.json` / `platform-api.json` into `ui-prompts/openapi/` and tell the UI session: it re-runs the
live test for that item and removes the fallback.

Code paths are in `platform/` (Gecko.Fleet = Fleet API :5300; Gecko.MasterData / Gecko.Revenue = Platform API :5100).

## P1 — blocking (wrong results or errors in screens that are live)
| # | Item | Where | Done when |
|---|---|---|---|
| 1 | **Tyre condition from the code list.** Drop `[AllowedValues(null,"GOOD","FAIR","POOR")]` on `Condition`; validate against the tenant's active `FLEET_TYRE_CONDITION` codes (seeded: 14 codes). Same for `TyreAction.condition`. | `Gecko.Fleet/Endpoints/Tyres/TyreEndpoints.cs:26` (+ tyre-change / maintenance line validation) | `POST /tyres` with `condition: "NEW"` → 200; an unknown code → 400 naming the field. (live A1) |
| 2 | **Customer card falls back to the standard card.** Price each WO line from the payer's customer card first, then the standard card (labour, flat, markup, part price, sundries incl. shop supplies / minimum charge / call-out). `rateCardRef` names the card that priced the line. | Gecko.Revenue repair-tariff pricing (preview / release / price-check) | Customer card with LABOR only → parts priced with the standard MARKUP, shop-supplies sundry added. (live C2, owner decision) |
| 3 | **Branch-scoped permissions via `X-Branch-Id`.** Every UI call now sends the header-switcher branch. Check branch-scoped codes (`revenue.tariff.*`, `revenue.invoice.issue`, …) at that branch → 403 when not held there; refuse a branch the user has no access to (403); tenant-wide grants ignore it. Repair cards stay tenant-wide (no `branchId`). | Platform API authorization | `ops`-type user without `revenue.tariff.manage` at branch X gets 403 when `X-Branch-Id: X`. (12 Q3) |
| 4 | **Removed tyre to STOCK needs a store.** When a REMOVE / REPLACE to STOCK has no `warehouseId` and the branch has no default store → 400 "Line n: no default store at this branch — choose a store". (The UI now sends `warehouseId` from a Store field.) | tyre-change line handling | No silent `warehouseId: null` on an IN_STOCK tyre. (live A2) |

## P2 — fields and filters the UI already uses
| # | Item | API | Source |
|---|---|---|---|
| 5 | `documentDate?: date` on `TyreChangeRequest` and `TyreMaintenanceRequest` (empty = today); dates the document and its events | Fleet | 13 Q1 |
| 6 | `driverId`, `driverCode`, `driverName` (current driver) on `AxleMapDto` | Fleet | 13 Q2 |
| 7 | `lastEventAt`, `lastEventType`, `lastDocumentNo`, `lastPartyCode` on `TyreDto` (recapper / repairer of the last send) | Fleet | 13 Q3 |
| 8 | `documentNo`, `assetCode` on `TyreEventDto` (every endpoint returning events) | Fleet | 13 Q4 |
| 9 | `issuedBaseQty` (net of returns) on `WoPartDto` | Fleet | 11 Q3 |
| 10 | Goods receipt: compute `taxAmount` / `totalAmount` from the keyed `taxRate` and header `discountAmount`; default VAT from the PO when not sent (works today — keep it) | Fleet | 11 Q4 |
| 11 | List params (contains, case-insensitive): `supplierName` on `GET /purchase-orders`, `/goods-receipts`, `/vendor-returns`; `workOrderNo`, `assetCode` on `GET /stock-issues` — today ignored | Fleet | 11 Q5, live B1 |
| 12 | Transfer targets: configured list per sending store + `GET /api/fleet/warehouses/{id}/transfer-targets` → `WarehouseDto[]`; refuse a transfer to a store not on the list (400) | Fleet | 11 Q6, live B3 |
| 13 | `assetCode`, `sourceLineType`, `rateCardRef`, `rechargeNo` on `FleetInvoiceLineDto` | Platform (Revenue) | 12 Q6, live C3 |
| 14 | `search` (invoice no / payer), `status`, `from`, `to` on `GET /api/revenue/fleet/invoices` — today ignored | Platform (Revenue) | 12 Q7, live B1 |
| 15 | Withdraw from DRAFT (today 409 "A draft card cannot be withdrawed" — also fix the wording: "withdrawn"). The UI hides Withdraw on DRAFT until this ships. | Platform (Revenue) | 12 Q4, live C1 |

## P3 — confirm / nice to have
| # | Item | Source |
|---|---|---|
| 16 | Optionally refuse `effectiveTo` on a standard card (standard cards are always open-ended; the UI never sends it) | 12 Q2 |
| 17 | Recharge status back from Revenue / Trucking (event) so ACCEPTED → INVOICED / DEDUCTED without a manual Refresh | live C5 |
| 18 | Confirm: recharge total (e.g. 971.56) and invoice total (972, VAT whole baht) may differ by the rounding | live C4 |
| 19 | Amounts with 4 decimals on stock documents (e.g. −103.5556) — round to 2 on documents shown to people? | live B4 |
| 20 | Wording: "A approved / A invoiced / A draft …" → "An approved …" in 409 messages | live B, C |

## Already verified live (no action)
Prompts 01–13 read endpoints; setup initialize; asset / technician / driver / supplier / service type / item edits;
meters + PM + baseline; work requests → work orders (moves, hold reasons, photos); inspections → defects (retry-safe
`clientRef`); full stock cycle (goods request → PO → receipt → issue / return → vendor return → adjustment → transfer
→ count); tariff cards, recharge preview / release, fleet invoice issue; tyres (map 2D / 3D, every map action, recap,
repair). Details: `LIVE_TEST_FINDINGS.md`.
