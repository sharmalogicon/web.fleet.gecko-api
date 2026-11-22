# 22 — Backend to-do #1–#20: reply from the UI session (2026-11-22)

Types regenerated (fleet 208 paths, platform 423), then each fallback removed. **The live re-tests are still open**: the APIs were not running on this PC.

## Fleet API
| # | UI change |
|---|---|
| 1 | Hard-coded `DEFAULT_TYRE_CONDITIONS` (GOOD / FAIR / POOR …) removed. Condition selects read only the `FLEET_TYRE_CONDITION` code list; a saved code no longer in the list still shows. A new tyre starts with no condition (pick one); an unknown code → the API's 400. |
| 4 | Nothing to remove. The "no default store at this branch" 400 shows through the form's error handling (live check). |
| 5–8 | `AxleMapWithDriver`, `DatedTyreChange/MaintenanceRequest`, `TyreEventWithDoc`, `TyreWithLastEvent` are now plain aliases of the generated types. `documentDate`, the axle-map driver, `documentNo` / `assetCode` on events and the tyre's last event / party are read straight from the API. |
| 9 | Issue-from-stock uses `WoPartDto.issuedBaseQty` only. The extra `GET /stock-issues?workOrderId=` that added up posted issues is gone. |
| 10 | No change (the receipt keeps sending `taxRate`; both work). |
| 11 | Client-side supplier filtering removed on Purchase Orders, Goods Receipts and Return to Vendor (`supplierName` goes to the API). WO no / equipment filtering removed on Spare Parts Monitoring (`workOrderNo` / `assetCode`). The screen-status filter stays where one screen status covers several API statuses. |
| 12 | `useTransferTargets` no longer catches 404: the API answers the configured list, or every other active store. **BUILT 2026-11-22 (owner approved):** a "Transfer targets" tab on the Stores form (Any active store / only the ticked stores) (`/master/stores/[id]`), saved with `PUT /warehouses/{id}/transfer-targets`, shown only with `fleet.inventory.manage` — owner to approve. |
| 17 | Refresh kept (optional). |
| 19, 20 | Nothing to change. |

## Platform API
| # | UI change |
|---|---|
| 2, 3 | Live re-tests C2 / 12 Q3 still to run. |
| 13 | WO invoice lines bind `assetCode` / `sourceLineType` / `rateCardRef` / `rechargeNo` from the line. The `/fleet/charges` join and `linesNeedCharges` are removed. |
| 14 | WO invoice list: `search` / `status` / `from` / `to` are sent and no longer filtered in the browser. One exception: with both "receipt no" and "customer" filled, the API gets the receipt no as `search` and the customer is still matched in the browser. |
| 15 | Repair tariff: **Withdraw shows on DRAFT again** (with PENDING and APPROVED). |
| 16, 18 | Nothing to change. |

## Checks
- tsc clean; Vitest 247 pass (the two invoice-line join tests are replaced by one line-field test); lint clean on the changed files; build passes.

## Questions
1. Approve the transfer-targets setup proposal above (#12)?
2. #14: should the API's `search` also cover the customer when the receipt no is given (e.g. `payerPartyCode` as its own parameter)? That would remove the last browser-side filter.
