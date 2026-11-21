# 08 — Meter Logs, Meter HR Logs and PM Scheduler on the real API + a PM Due list (P2)

You are the UI session for **Gecko Fleet**. Prerequisite: **01** done; **03** (assets) and **07** (service types, stock)
help, because PM schedules name service tasks and parts. Regenerate the types (`npm run api:types`; `fleet-api.json`
re-exported at the end of P2: 48 paths, 89 schemas). Read the UI change policy at the top of `ui-prompts/README.md`.

Same screens, real data. One new page: **PM Due** (nothing shows what is due today).

## Rules the screens must respect (the API enforces them)
- **Meter readings are never edited or deleted** (an append-only ledger). A wrong reading is **reversed** (a reversal row
  cancels it) and the right one recorded. So the existing meter-log **edit** page opens **read-only** for a saved reading, with
  one action "Reverse" (needs `fleet.meter.override`; asks for a reason). Do not remove the page.
- A reading that looks wrong (lower than before, higher than a later one, or more than the tenant's km/hours-per-day
  limit) is **kept as SUSPECT** and does not count until someone with `fleet.meter.override` accepts or rejects it.
- km / hours are **lifetime** values: a replaced or rolled-over dial is recorded once (meter segment) and later readings
  are keyed as the new dial shows them.

## A. Meter Logs (`/fleet/meter-logs`) and Meter HR Logs (`/fleet/meter-hr-logs`)
| Method + path | Permission |
|---|---|
| `GET /api/fleet/meter-readings?assetProfileId=&kind=KM|HOUR&from=&to=&status=VALID|SUSPECT|REVERSED&search=&page=&pageSize=` | `fleet.asset.view` |
| `POST /api/fleet/meter-readings` `{ assetProfileId, readingAt, km?, hours?, driverId?, remarks }` → array (1 or 2 readings) | `fleet.meter.record` at the asset's branch |
| `POST /api/fleet/meter-readings/{id}/review` `{ decision: ACCEPTED|REJECTED, reason }` | `fleet.meter.override` |
| `POST /api/fleet/meter-readings/{id}/reverse` `{ reason }` | `fleet.meter.override` |
| `GET /api/fleet/assets/{id}/meters` (current km / hours, dial values, segments) | `fleet.asset.view` |
| `POST /api/fleet/assets/{id}/meter-segments` `{ meterKind, reason: REPLACEMENT|ROLLOVER, startedAt, startReading, lifetimeAtChange? }` | `fleet.meter.override` |

Meter Logs = `kind=KM`, Meter HR Logs = `kind=HOUR` (same endpoint).
| Form field | API |
|---|---|
| `equipmentCode` | pick the asset (`GET /assets?search=`), send `assetProfileId`; show `assetCode` / `registrationNo` from the reading |
| `meterUpdateDate` | `readingAt` (date + time; default now) |
| `meterType` KM / HOUR / BOTH | KM → `km`; HOUR → `hours`; BOTH → both in ONE request (2 readings come back). The asset's `meterType` (KM, HOUR, KM_HOUR, NONE) decides which are allowed. |
| `meterRead` / `hourMeter` | `km` / `hours` (dial value) |
| `driverName` | `driverId` (pick from `GET /drivers`); the list shows `driverCode` |
| `totalDistance` / `distanceTravel` / `totalHours` / `totalWorkingHr` | read-only: `sinceLast` of the reading |
| `remarks` | `remarks` |
| `sequenceNo` (HR log) | none: show the reading's time instead |

List: add the reading **status** as a small badge (VALID / SUSPECT / ACCEPTED / REJECTED / REVERSED / CANCELLED) in the
existing value cell — `suspectReason` as its tooltip. With `fleet.meter.override`, SUSPECT rows get "Accept" / "Reject"
actions in the existing row-action menu. A "Meter replaced" action on the asset's meter list is optional (only if your
asset form has a meter section; otherwise skip — the API is ready).

## B. PM Scheduler (`/fleet/pm-scheduler`, `/fleet/pm-scheduler/[id]`) → `pm-programs`
| Method + path | Permission |
|---|---|
| `GET /api/fleet/pm-programs?search=&category=&active=&page=&pageSize=` | `fleet.pm.view` |
| `GET /api/fleet/pm-programs/{id}` (tasks with parts + labour, assignments) | `fleet.pm.view` |
| `POST /api/fleet/pm-programs`, `PUT /api/fleet/pm-programs/{id}` (+ `rowVersion`; `tasks` replaced as a whole, in order) | `fleet.pm.manage` tenant-wide |
| `POST /api/fleet/pm-programs/{id}/assignments` `{ assetProfileIds: [...], activeFrom, remarks }` | `fleet.pm.manage` at the assets' branch |
| `PUT /api/fleet/pm-assignments/{id}` `{ activeTo, remarks, rowVersion }` (take an asset off the schedule) | same |

| Form field (`types/pm-scheduler.ts`) | API |
|---|---|
| `scheduleNo` | `programCode` |
| `scheduleDate` | `effectiveDate` |
| `serviceType` / `serviceTypeDescription` (header) | `categoryCode` (FLEET_SERVICE_CATEGORY) / `nameEn` |
| `meterKm` | `defaultIntervalKm` |
| `remarks`, `isActive` | `remarks`, `isActive` |
| `services[]` (`serviceType`, `meterInterval`, `remarks`) | `tasks[]` (`serviceTaskId` from `GET /service-tasks`, `intervalKm`, `remarks`); `intervalHours`, `intervalDays`, `parts`, `labor` have no inputs today: send what you read |
| `equipment[]` | `assignments[]` (asset code, registration, from, to). "Add equipment" → `POST …/assignments` with `activeFrom` = today; "Remove" → `PUT /pm-assignments/{id}` with `activeTo` = today (never a delete) |

## C. NEW page: PM Due (`/fleet/pm-due`) — one new page
Copy the existing list pattern (multi-line DataTable). Menu item "PM Due" under Fleet, right after PM Scheduler.
| Method + path | Permission |
|---|---|
| `GET /api/fleet/pm/due?status=&dueOnly=&branchId=&assetProfileId=&pmProgramId=&search=&page=&pageSize=` | `fleet.pm.view` |
| `PUT /api/fleet/pm-task-states/{id}/baseline` `{ lastDoneAt, lastDoneKm, lastDoneHours, rowVersion }` | `fleet.pm.manage` at the branch |
| `POST /api/fleet/pm/recalculate` | `fleet.pm.manage` tenant-wide |

Rows (sorted most urgent first by the API): asset code + registration · schedule + task · last done (date, km, source) ·
next due (date / km / hours) with what is left (`kmLeft`, `daysLeft`, `hoursLeft`; negative = late) · status badge
OK / DUE_SOON / DUE / OVERDUE. Default filter `dueOnly=true`. Row action "Set last done" (baseline dialog: date + km +
hours) for go-live opening balances. Status is computed for today on every read.

## Done when
- [ ] Meter logs (KM / HOUR / BOTH) record, list, accept / reject, reverse; saved readings open read-only.
- [ ] PM Scheduler reads / writes schedules and assignments; PM Due list with baseline dialog.
- [ ] 400 / 403 / 409 handled; EN + TH strings for new texts; Vitest for the KM / HOUR / BOTH mapping; build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/08_REPLY.md`.

Do not commit or push unless the owner asks.
