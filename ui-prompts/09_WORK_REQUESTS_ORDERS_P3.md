# 09 — Work Requests and Work Orders on the real API (P3, workshop MVP)

You are the UI session for **Gecko Fleet**. Prerequisites: **01**, and ideally **03** (assets), **04** (technicians),
**06** (suppliers), **07** (service types, stock), **08** (meters / PM). Regenerate the types (`npm run api:types`;
`fleet-api.json` re-exported in P3: 60 paths, 114 schemas). Read the UI change policy in `ui-prompts/README.md`.

Same screens, real data (`/fleet/work-requests`, `/fleet/work-orders` + their `[id]` forms). No new page.
Status changes become **action buttons** on the existing form toolbar (the API owns the status; never send it in a save).

## A. Work Requests
| Method + path | Permission |
|---|---|
| `GET /api/fleet/work-requests?search=&status=&branchId=&assetProfileId=&from=&to=&page=&pageSize=` | any of `fleet.workrequest.create` / `.approve`, `fleet.workorder.view` |
| `GET /api/fleet/work-requests/{id}` | same |
| `POST /api/fleet/work-requests` (`submit: true` = save + submit) | `fleet.workrequest.create` at the asset's branch |
| `PUT /api/fleet/work-requests/{id}` (+ `rowVersion`; DRAFT / SUBMITTED only) | same |
| `POST …/{id}/submit` · `…/approve` · `…/reject` (`reason` required) · `…/cancel` — body `{ reason?, rowVersion }` | create / approve / approve / create |
| `POST …/{id}/convert` `{ woType, repairSite, takesAssetOos, rowVersion }` → the new **work order** | `fleet.workorder.manage` |

| Form field (`types/work-request.ts`) | API |
|---|---|
| `documentNo` | `documentNo` (FLT_WR, read-only, given on the first save) |
| `orderDate` | `documentDate` |
| `priorityType` | `priority` LOW / NORMAL / HIGH / URGENT |
| `equipmentCode` | `assetProfileId` (asset picker); show `assetCode` |
| `description` | `problem` |
| `billingCustomerName` | `billToPartyCode` (party picker, Platform `/api/master/parties`) |
| `vendorName` / `vendorCode` | `vendorPartyCode` (supplier picker, Platform `/api/master/suppliers`) |
| `remarks` | `remarks` |
| `status` | read-only. Show API → screen: DRAFT → DRAFT; SUBMITTED, APPROVED → SUBMITTED (APPROVED with a small "approved" badge); CONVERTED → IN PROGRESS while `workOrderStatus` is open, COMPLETED once it is COMPLETED / CLOSED (show `workOrderNo` as a link); REJECTED, CANCELLED → CANCELLED (REJECTED with `rejectReason` as tooltip) |
| `isCancel` | the "Cancel" action |

Actions: Save · Submit · Approve / Reject (approvers) · Convert to work order (opens the new WO) · Cancel.
Without a WORK_REQUEST approval policy a submitted request is approved at once.

## B. Work Orders
| Method + path | Permission |
|---|---|
| `GET /api/fleet/work-orders?search=&status=&branchId=&assetProfileId=&from=&to=&page=&pageSize=` | `fleet.workorder.view` |
| `GET /api/fleet/work-orders/{id}` · `GET …/{id}/status-log` | `fleet.workorder.view` |
| `POST /api/fleet/work-orders` (DRAFT, number FLT_WO) · `PUT /api/fleet/work-orders/{id}` (+ `rowVersion`) | `fleet.workorder.manage` at the branch |
| `POST …/{id}/status` `{ toStatus, reasonCode?, reasonText?, rowVersion }` | manage; CLOSED and reopening a closed WO: `fleet.workorder.close` |
| `POST …/{id}/approval` `{ decision: APPROVED|REJECTED, reason, rowVersion }` | the WORK_ORDER approval policy's permission |

Moves: DRAFT→OPEN (may answer **409 "needs approval"** → the WO is now `approvalStatus` PENDING; show Approve / Reject to
approvers) · OPEN→IN_PROGRESS · →ON_HOLD (`reasonCode` WAITING_PARTS / WAITING_VENDOR / WAITING_APPROVAL / WAITING_CUSTOMER /
OTHER) · →COMPLETED (needs `meterOutKm` / `meterOutHours` for the asset's meters; open tasks become DONE; PM tasks on the
lines restart from this WO) · COMPLETED→CLOSED (frozen) · CLOSED→COMPLETED (reopen) · →CANCELLED.
Lines and header are editable only while DRAFT / OPEN / IN_PROGRESS / ON_HOLD. A response may carry `warning` (the
Trucking truck's workshop status could not be updated): show it as a toast, the WO itself was saved.

| Form field (`types/work-order.ts`) | API |
|---|---|
| `documentNo`, `orderDate`, `startDate` | `documentNo` (read-only), `documentDate`, `startedAt` (read-only, set by "Start") |
| `woRequestNo` | the request's number via `workRequestId` (read-only link) |
| `status` | read-only: DRAFT / OPEN / IN_PROGRESS → "IN PROGRESS" / ON_HOLD (show as IN PROGRESS + "on hold" badge) / COMPLETED / CLOSED (as COMPLETED + "closed") / CANCELLED; **INVOICED** = `billingStatus` BILLED (P5) |
| `priority` | `priority` |
| `equipmentCode`, `driverName` | `assetProfileId` (fixed after create), `driverId` |
| `billingCustomer` | `defaultBillToPartyCode` |
| `vendorCode`, `vendorInvoiceNo` | `vendorPartyCode`, `vendorInvoiceNo` (with `repairSite` VENDOR / MIXED) |
| `meterRead` | `meterInKm` (and `meterOutKm` at completion — one more input in the same section, needed by the API) |
| `serviceTypeCategory`, `isTireMaintenance` | `woType` (PM, CORRECTIVE, BREAKDOWN, ACCIDENT, TYRE, INSPECTION, CAMPAIGN); the tyre checkbox = `woType` TYRE |
| `vat` | `taxRate` (%) |
| totals (`totalPartsPrice`, `totalLaborPrice`, `totalDiscount`, `totalVAT`, `grandTotal`) | read-only `partsPrice`, `laborPrice`, `discountAmount`, `taxAmount`, `totalPrice` (charge side); also show `totalCost` |
| `isApproved` / `approvedOn` | `approvalStatus` APPROVED / `approvedAt` (read-only) |
| `woInvoiceNo`, `claimNo` | not yet (P5 recharge / P7 claims): stay on mock, read-only |
| `remarks` | `remarks` |
| (new checkbox, one line) | `takesAssetOos` "Truck stays off the road (dispatch blocked)" |

Line grids (`tasks`, `parts`, `labor`, plus `sublets`, `sundries` if you show them): send the **whole list** with each
existing line's `id`; lines left out are removed; `null` = unchanged. Parts / labour / sublets point at a task with
`taskSeqNo` (its 1-based position). Services grid → `tasks` (`serviceTaskId` from `/service-tasks`, `description`,
complaint / cause / correction, status). Parts grid: `stockCode` → `itemId` (`source` STOCK) or free text with
`source` DIRECT_PO; `qty`, `uomCode`; the screen's **unit price → `unitCost`** (cost side; the stock ledger replaces it in
P4). Labour grid: `chargeCode` → `charge.chargeCode`, start / end → `startAt` / `endAt`, `actualHours` → `hours`,
`standardHours` → `stdHours`, technician → `technicianId` (or `tradeCode`); `costRate` / `costAmount` come back from
the API. **Charging a customer**: when `defaultBillToPartyCode` is set, send lines with
`charge: { isBillable: true, rechargeMode: "INVOICE", unitPrice: <screen price>, discountAmount: <screen discount> }`;
otherwise `isBillable: false`. Line errors come back as `parts`, `labor`, `tasks`, `sublets`, `sundries`.

## Done when
- [ ] Both lists + forms work on the API; actions follow the moves above; 400 / 403 / 409 handled; status log shown.
- [ ] EN + TH strings for new texts; Vitest for the status mapping and the line-grid → request mapping; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/09_REPLY.md`.

Coming next in P3 (a follow-up prompt): photo attachments on work orders, and the inspection web form (defects → work requests).
Do not commit or push unless the owner asks.
