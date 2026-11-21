# 22 — Backend to-do items #1–#20 shipped (P13)

You are the UI session for **Gecko Fleet**. Prerequisites: **11, 12, 13** and `replies/BACKEND_TODO.md`.
Regenerate the types (`npm run api:types`). Re-exported 2026-11-21: `fleet-api.json` **208 paths / 285 schemas**,
`platform-api.json` **423 paths / 560 schemas**. Read the UI change policy: **no redesign**. The UI already sends / reads
every name below and has a fallback for each. For each item: re-run its live test, then **remove the fallback**.
Write what you find to `replies/22_REPLY.md`.

## Fleet API (:5300)
| # | What shipped | UI action |
|---|---|---|
| 1 | Tyre `condition` (tyre + `TyreAction.condition`) is checked against the tenant's `FLEET_TYRE_CONDITION` code list (14 codes). An unknown code → 400 naming the field (`lines`: "Line n: condition X is not in the FLEET_TYRE_CONDITION list"). | Drop the GOOD/FAIR/POOR fallback mapping. |
| 4 | REMOVE / REPLACE to STOCK, RECEIVE_RECAP and a REPAIR of an AWAITING_REPAIR tyre put the tyre in `warehouseId`, otherwise in the branch's default store. Neither → 400 "Line n: no default store at this branch — choose a store." | Show the 400 on the Store field. |
| 5 | `documentDate?` on `TyreChangeRequest` and `TyreMaintenanceRequest` (empty = today). It dates the document and its events. A future date → 400 (`documentDate`); a date before a later event of one of its tyres → 400 "Tyre X has a later event (yyyy-MM-dd): date the document on or after it." | Send the Date field; show the 400 on it. |
| 6 | `AxleMapDto.driverId / driverCode / driverName`: the linked truck's PRIMARY Trucking driver today. `driverId` is the Fleet driver (null until that driver is synced). All null for assets without a Trucking link. | Bind the driver label. |
| 7 | `TyreDto.lastEventAt / lastEventType / lastDocumentNo / lastPartyCode` (`lastPartyCode` = supplier of the tyre's latest maintenance document that names one: the recapper / repairer). | Bind "Last event" and "Sent / vendor". |
| 8 | `TyreEventDto.documentNo / assetCode` on every endpoint that returns events (event list, document lines). | Drop the client-side lookups. |
| 9 | `WoPartDto.issuedBaseQty`: base qty on POSTED stock issues for that part, net of POSTED returns. | Bind "Issued". |
| 10 | Goods receipt `taxRate` is now **optional**: sent = used (even when a PO is linked); not sent = the PO's rate (no PO: 0). `taxAmount` / `totalAmount` = (subtotal − header `discountAmount`) × rate. | Send `taxRate` only when the user changed it — or always, both work. |
| 11 | `supplierName` (contains, case-insensitive) on `GET /purchase-orders`, `/goods-receipts`, `/vendor-returns`; `workOrderNo`, `assetCode` (contains) on `GET /stock-issues`. | Remove client-side filtering. |
| 12 | Transfer targets: `GET /warehouses/{id}/transfer-targets` → `WarehouseDto[]`; `PUT /warehouses/{id}/transfer-targets` `{ targetWarehouseIds: [] }` (needs `fleet.inventory.manage` at the store's branch) replaces the list. **A store with no list may send to any active store** (as before). Once it has a list, a transfer to another store → 400 on `toWarehouseId`. | "To store" picker reads `transfer-targets`. A setup grid for the list is **not** in the current screens: propose it in your reply, don't build it. |
| 17 | Recharges in ACCEPTED catch up with Revenue / Trucking when they are read (`GET /recharges`, `GET /recharges/{id}`): INVOICED / DEDUCTED with `externalRef` = invoice / settlement no. The Refresh button still works. | Refresh is optional now; keep it. |
| 19 | Amounts on stock documents shown to people have 2 decimals (owner decision; ledger / balances keep 4 internally). | — |
| 20 | Messages read "An approved / An invoiced …" (was "A approved …"). | — |

## Platform API (:5100, `/api/revenue/...`)
| # | What shipped | UI action |
|---|---|---|
| 2 | Repair pricing looks every rule up on the payer's card first, then the standard card. `rateCardRef` names the card that priced each line. | Re-run live C2. |
| 3 | `X-Branch-Id`: branch-scoped permissions are checked AT that branch (tenant-wide grants ignore it); a non-GUID value → 403. | Re-run 12 Q3 with an ops user. |
| 13 | `FleetInvoiceLineDto.assetCode / sourceLineType / rateCardRef / rechargeNo`. | Bind the invoice line columns. |
| 14 | `GET /api/revenue/fleet/invoices?search=&status=&from=&to=` — `search` = contains on invoice no / payer code / payer name; `from` / `to` are Thai calendar days. | Remove client-side filtering. |
| 15 | Repair cards can be withdrawn from **DRAFT**, PENDING and APPROVED. Wording fixed ("cannot be withdrawn"). | Show Withdraw on DRAFT again. |
| 16 | A standard card (no `partyCode`) with `effectiveTo` → 400 "A standard card is always open-ended…". | Nothing (the UI never sends it). |
| 18 | Owner decision: invoice VAT is rounded to whole baht, so a recharge total (971.56) and its invoice (972) may differ. | Show both as they are. |

## Notes
- New table (run 059): `inv.warehouse_transfer_target`. Runs 059–060 applied locally; the owner runs them on Azure.
- The poll job that also catches recharges up stays **off** until go-live (`Fleet:TruckingPoll:IntervalMinutes`).
