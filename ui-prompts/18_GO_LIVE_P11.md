# 18 — Go-live tools: opening balances from Excel, Trucking sync (P11)

You are the UI session for **Gecko Fleet**. Prerequisites: **02** (Fleet Setup tabs). Regenerate the types
(`npm run api:types`; `fleet-api.json` re-exported 2026-11-20: **203 paths, 280 schemas**). Read the UI change policy.

Opening balances have no screen today (a new concept → allowed as an addition): add ONE tab **"Opening balances"** to the
existing `/master/fleet-setup` — no new page. The backend's go-live runbook is `docs/backend-analysis/P11_GO_LIVE_RUNBOOK.md`.

## A. Opening balances tab
Four cards in this order (the order the runbook asks for): **Meters**, **PM baselines**, **Stock**, **Tyres**. Each card:
1. **Download template** → `GET /api/fleet/opening-balances/{METERS|PM_BASELINES|STOCK|TYRES}/template` (an .xlsx with the
   columns and a Notes sheet).
2. **Upload & check** → `POST /api/fleet/opening-balances/{kind}?commit=false` (multipart, field `file`) →
   `{ kind, rows, valid, committed, dryRun, errors: [{ row, message }] }`. Show "rows / valid" and the error table (Excel row
   number + message). 400 `file` = wrong file / missing columns / empty.
3. **Import** (enabled only after a check with no errors on the same file) → the same call with `commit=true`; show
   `committed` and any rows that still failed (each row goes through the same rules as its screen; fix and re-upload only those).
Permissions per card (hide the card without it): Meters `fleet.meter.record`, PM baselines `fleet.pm.manage`, Stock
`fleet.inventory.manage`, Tyres `fleet.tyre.manage`. Columns (for the help text): Meters `AssetCode, Kind (KM|HOUR), Reading,
ReadingDate`; PM `AssetCode, ProgramCode, TaskCode, LastDoneDate, LastDoneKm, LastDoneHours`; Stock `WarehouseCode, ItemCode, Qty,
UnitCost, BinCode, LotNo, SerialNo` (base unit, base currency, once per item + store); Tyres `SerialNo, WarehouseCode | AssetCode +
Position, FittedKm, BrandCode, ModelName, SizeCode, TyreType, RecapCount, OriginalTreadMm, CurrentTreadMm, PurchasedDate, PurchaseCost`.

## B. Sync from Trucking now
On the Equipment list (where the "Sync from Trucking" button from prompt 03 is), keep that button; ADD nothing else there.
On the Opening balances tab, add a button **"Sync everything from Trucking"** (`fleet.asset.manage`, tenant-wide) →
`POST /api/fleet/sync/trucking` → `{ assets: {created, updated, unchanged, deactivated}, drivers: {…}, odometerReadings,
assetsRecalculated }` — show it as a short summary. (The server also runs it nightly once IT enables it.)

## C. Meter source badge
Meter readings can now have `source` **OPENING** (this import) and **TRUCKING** (job-order return odometers, nightly). In the
Meter Logs list add them to the source badge colours (no column change).

## Done when
- [ ] Opening balances tab (4 cards: template, check, import with the error table) and the Trucking sync button; source badges.
- [ ] EN + TH strings; Vitest for the import result → table mapping and the "import enabled only after a clean check" rule;
      build + lint pass.
- [ ] `TODO.md` updated; questions in `ui-prompts/replies/18_REPLY.md`.

**This closes P11 (backend).** Remaining work is UAT on the UI prompts and the Azure run (owner). Do not commit or push unless
the owner asks.
