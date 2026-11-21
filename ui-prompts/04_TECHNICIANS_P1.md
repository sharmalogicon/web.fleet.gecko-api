# 04 — Technicians page (P1): one new master page, built from the existing pattern

You are the UI session for **Gecko Fleet**. Prerequisite: **01** done. Regenerate the types (`npm run api:types`;
`fleet-api.json` re-exported 2026-11-19, 22 paths). Read the UI change policy at the top of `ui-prompts/README.md`.

Technicians have **no screen today** (the legacy system stored them as drivers), so this is the one new page the policy
allows. **Do not design anything new:** copy the existing Drivers list + form (`/master/drivers`, `/master/drivers/[id]`)
structure, components, spacing and multi-line DataTable style. Add one menu item "Technicians" under Master, right after
Drivers. Nothing else in the app changes.

## Endpoints (Fleet API)
| Method + path | Permission | Notes |
|---|---|---|
| `GET /api/fleet/technicians?search=&trade=&status=&branchId=&page=&pageSize=` | `fleet.people.view` | `PagedResult`; `trade` matches the main trade or any skill |
| `GET /api/fleet/technicians/{id}` | `fleet.people.view` | |
| `POST /api/fleet/technicians` | `fleet.people.manage` at the branch | |
| `PUT /api/fleet/technicians/{id}` | `fleet.people.manage` | whole record + `rowVersion`; `skills` replaced as a whole |

No delete: a technician who leaves is set `INACTIVE` (work orders will name them).

Fields: `branchId`, `technicianCode`, `fullName`, `nickname`, `userId` (optional login, pick from the Platform users list),
`employmentType` EMPLOYEE / CONTRACTOR, `vendorPartyCode` (contractor's company, CONTRACTOR only), `primaryTradeCode`,
`costPerHour` / `otCostPerHour` / `currencyCode` (optional own rate; empty = trade rate), `hiredOn`, `leftOn`, `status`,
`remarks`, `skills[]` (`tradeCode`, `skillLevel` TRAINEE / SKILLED / SENIOR / MASTER, `certifiedUntil`).
Trades = Platform `GET /api/master/code-lists/FLEET_TRADE`. Read-only output `costRate` = what an hour costs today
(`costPerHour`, `source` TECHNICIAN / BRANCH_TRADE / TENANT_TRADE, or null = no rate): show it as text, e.g.
"฿180/h (trade rate, LCB01)".

## Screens
- **List** (copy Drivers list): code + name/nickname · main trade + skill chips · branch · employment (+ company) · status.
  Filters: search, trade, status, branch.
- **Form** (copy Drivers form): the fields above in the existing form layout; the skills as a small inline table
  (add / remove rows, which you build once and reuse later for every line-item grid).

## Done when
- [ ] List and form work on the API (create, edit, skills, 400 / 409 handling); look identical in style to Drivers.
- [ ] EN + TH strings; Vitest for the skills editor; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/04_REPLY.md`.

Do not commit or push unless the owner asks.
