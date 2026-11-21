# 02 — Fleet Setup screens (P1: setup writes)

You are the UI session for **Gecko Fleet**. Do **01_API_CONNECTION_P0.md first** — this prompt builds on its API client,
auth, branch context, React Query and generated types. If 01 is not finished, finish it, then come back.

Read `CLAUDE.md`, the root `TODO.md` and this file to the end. Write your step list into `TODO.md` first.

The read-only `/master/fleet-setup` page from 01 §2.10 becomes the **editable Fleet Setup** area. Regenerate the types
first (`npm run api:types`): `ui-prompts/openapi/fleet-api.json` was re-exported on 2026-11-19 with 14 paths.

---

## 1. Endpoints (Fleet API, all under `/api/fleet/setup`)

| Method + path | Permission | Notes |
|---|---|---|
| `GET /catalogue` | any fleet user | Known series (code, default prefix, description, phase), settings (type, default, min/max, allowed values), approval document types, the 43 permission codes. **Drive forms and dropdowns from this; never hard-code the lists.** |
| `POST /initialize` | `fleet.setup.manage` | Writes the default series + settings the tenant does not have yet. Returns `{seriesAdded, settingsAdded}`. Safe to repeat. |
| `GET /number-series` | `fleet.setup.manage` | Each row has `example` (e.g. `WO-SCT1-2611-00001`), `hasIssuedNumbers`, `isKnown`, `rowVersion`. |
| `POST /number-series` | `fleet.setup.manage` | `{seriesCode, branchId?, description, prefix, separator, countPerBranch, datePartFormat, resetPeriod, numberLength, startNumber, isGapFreeRequired, isActive}`. `branchId` null = tenant-wide; set = branch override. |
| `PUT /number-series/{id}` | `fleet.setup.manage` | Same fields minus code/branch, plus `rowVersion`. |
| `DELETE /number-series/{id}?rowVersion=` | `fleet.setup.manage` | Only a branch override that never issued a number. |
| `GET /settings` | any fleet user | Stored rows (tenant + branch overrides), `isKnown`, `rowVersion`. |
| `GET /settings/effective?branchId=` | any fleet user | Every catalogue setting with `value` and `source` = `BRANCH` / `TENANT` / `DEFAULT`. |
| `PUT /settings/{settingCode}` | `fleet.setup.manage` | `{branchId?, value, rowVersion?}` — upsert. `rowVersion` required when the row exists. Value checked against the catalogue (type, range). |
| `DELETE /settings/{id}?rowVersion=` | `fleet.setup.manage` | Branch overrides only (tenant rows: set the value instead). |
| `GET/POST /approval-policies`, `PUT/DELETE /approval-policies/{id}` | `fleet.setup.manage` | `{documentType, branchId?, approvalLevel 1–9, minAmount?, currencyCode?, requiredPermission?, description, isActive}`. Amount and currency go together. Permission defaults to the document type's default. |
| `GET /labor-cost-rates?tradeCode=&branchId=&asOf=` | `fleet.setup.manage` | Dated internal labour cost per trade. |
| `POST /labor-cost-rates` | `fleet.setup.manage` | `{tradeCode, branchId?, costPerHour, otCostPerHour?, currencyCode, effectiveFrom, remarks}`. The rate in force on `effectiveFrom` is ended the day before automatically. |
| `PUT /labor-cost-rates/{id}` | `fleet.setup.manage` | `{costPerHour, otCostPerHour, effectiveTo, remarks, rowVersion}` (start date is fixed). |
| `DELETE /labor-cost-rates/{id}?rowVersion=` | `fleet.setup.manage` | Only the latest rate of a trade; the one before reopens. |

Trade codes: the gecko_master code list **`FLEET_TRADE`**, from the Platform API: `GET /api/master/code-lists/FLEET_TRADE`
(see `platform-api.json` for the response shape and the permission it needs). Values today: MECHANIC, ELECTRICIAN,
TYRE_FITTER, BODY_SHOP, WELDER, AIR_CON, HELPER, INSPECTOR. If the fleet owner gets 403 there, say so in
`replies/02_REPLY.md` and the backend will add a Fleet-side lookup.

**Rules the API enforces. Mirror them in the form so users rarely see a 400:**
- `countPerBranch` true = the branch code is also printed. There is one switch, not two.
- `resetPeriod` MONTHLY needs `datePartFormat` YYMM or YYYYMM; YEARLY needs any date part except NONE.
- `startNumber` must fit in `numberLength` digits (3–15). Prefix: letters and digits only. Separator: `-` `/` `.` `_` or none.
- Once `hasIssuedNumbers` is true, **reset period and countPerBranch are locked**. Show them read-only with a tooltip:
  "Numbers were issued; changing this would repeat numbers".
- An overtime rate cannot be lower than the normal rate. A new labour rate cannot start on or before the latest one.

## 2. Screens (route `/master/fleet-setup`, tabs; house rule: multi-line DataTable rows, max 4–6 columns)

1. **Number series.** List (code + description · example number · reset/length · scope (tenant / branch name) · status chips
   active / issued). Row click opens a side panel form with a **live example** computed like the API's `example`.
   "Add branch override" chooses the code and branch.
   Empty tenant → a call-to-action card: "Set up defaults" → `POST /initialize`, then refetch.
2. **Settings.** A branch picker (tenant-wide + the user's branches) on top. One row per catalogue setting from
   `/settings/effective`: name + description · value (editor by type: switch for BOOL, number input with min/max,
   select for CODE) · source chip (Default / Tenant / Branch). Editing at a branch creates an override.
   "Reset to tenant" deletes the override.
3. **Approvals.** Grouped by document type (catalogue order). Each group lists its levels: level · from amount + currency ·
   permission (label from i18n) · scope · active. Add / edit in a modal; delete with confirm.
4. **Labour cost rates.** Grouped by trade (FLEET_TRADE description). Rows: scope · cost/h + OT/h + currency ·
   effective from → to (open = "current") · remarks. "New rate from…" creates the next dated row; only the latest row
   shows Delete.

Use `rowVersion` on every PUT/DELETE. On **409**, show "Changed by someone else — reload" and refetch. Show **400**
`errors{field}` beside the fields.
Users without `fleet.setup.manage` (from `GET /access`) see Settings read-only and no other tabs.

## 3. Test users
As in 01 §4. Owner (`admin@sct-test.example`) can do everything. `gate1.lcb@sct-test.example` sees no setup.
Write only to SCT-TEST. **Never use real SCT.**

## 4. Done when
- [ ] The four tabs work against the local Fleet API (create, edit, delete, 409 and 400 handling).
- [ ] "Set up defaults" fills an empty tenant (17 series, 10 settings).
- [ ] Issued-number lock shown; live example matches the API's `example`.
- [ ] Read-only mode for users without `fleet.setup.manage`.
- [ ] EN + TH strings for every label, setting name/description key, error and status chip.
- [ ] Vitest for the example-number formatter and the series form rules; `npm run build` and `npm run lint` pass.
- [ ] `TODO.md` updated; questions or missing endpoints in `ui-prompts/replies/02_REPLY.md`.

Do not commit or push unless the owner asks.
