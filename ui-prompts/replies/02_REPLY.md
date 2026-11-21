# 02 — Reply from the UI session (2026-11-20)

Status: **02 built offline** (APIs on 5100/5300 were not running). Live checks still open (see the end).
Types regenerated from the 2026-11-19 exports; the hand-written `NumberSeries` type is gone (generated `NumberSeriesDto`).

## Done
- `/master/fleet-setup` is now four tabs: **Number series · Settings · Approvals · Labour cost rates**.
- Number series: multi-line list (series · example · reset/length · scope · status chips active/issued/unknown · actions),
  side-panel form with a **live example**, "Add branch override" (code + branch, defaults copied from the tenant row),
  remove override (only branch rows that never issued), empty tenant → "Set up defaults" (`POST /initialize`), and an
  "Add missing defaults" button when rows exist. Issued series: reset period + count-per-branch shown read-only with the
  tooltip from the prompt.
- Live example + form rules are a port of `NumberSeriesEndpoints.Example` / `Check` (read from `platform/Gecko.Fleet`):
  UTC month, Gregorian year, `BR01` for tenant-wide rows, the override's branch code otherwise. 19 Vitest cases.
- Settings: branch picker (tenant-wide + the user's branches) → `/settings/effective`; editor by type (switch BOOL,
  number with min/max INT/DECIMAL, select CODE); source chip; editing at a branch creates the override; "Reset to tenant"
  deletes it. `rowVersion` taken from `GET /settings` for the row at that scope.
- Approvals: one card per catalogue document type (catalogue order); levels with amount + currency, permission label
  (i18n `fleetPerm.*`, all 43 codes, EN + TH), scope, active; add/edit modal (type + branch fixed on edit), delete confirm.
- Labour cost rates: one card per `FLEET_TRADE` value (Platform code list); rows scope · cost/h + OT/h · from → to with
  Current / Upcoming / History chip · remarks; "New rate from…" (pre-filled from the latest rate); delete only on the
  latest row per trade + scope; client rules for OT ≥ normal, start after latest, end before the next rate.
- 409 → toast "Changed by someone else — reloaded" + banner in the form, list refetched. 400 → `errors{field}` under the
  input. EN + TH for every label, setting name/description, series name, document type, permission, rule and chip.
- Vitest 77 pass (32 new), `tsc` clean, lint clean on the new code, `next build --webpack` passes.

## Questions / requests for the backend
1. **Write permission = tenant-wide.** `SetupEndpoints` says writes need `fleet.setup.manage` *tenant-wide*. The UI
   therefore uses `canTenantWide('fleet.setup.manage')`: a user holding it only at a branch sees the read-only Settings
   tab (no other tabs). Confirm that is intended (prompt 02 just said "without `fleet.setup.manage`").
2. **Missing 200 schemas in `fleet-api.json`:** `PUT /setup/settings/{settingCode}` declares only 400, and
   `GET /setup/settings` / `POST /setup/initialize` are typed only because the handlers return `Ok<T>`. Please add
   `.Produces<FleetSettingDto>()` to the PUT so the generated type covers it (the UI does not read the body today).
3. **`GET /api/master/code-lists/FLEET_TRADE`:** the export does not say which permission it needs. Untested live; if the
   fleet owner gets 403 the tab shows a warning and still lists trades that already have rates, but "New rate from…"
   is then only offered for those. A Fleet-side lookup would remove the dependency.
4. **Example month in Thailand:** the API's `example` uses the UTC month, so between 00:00 and 07:00 Bangkok time on the
   1st it shows the previous month. The UI copies this so both agree. Is `usp_next_number` also on UTC? If it uses
   local time, both `Example` and the UI should switch to Asia/Bangkok.

## Still to verify live (needs Platform 5100 + Fleet 5300)
- The four tabs against SCT-TEST: create, edit, delete, a 409 (two tabs open) and a 400.
- "Set up defaults" on an empty tenant → 17 series, 14 settings (the catalogue now has 14; the prompt said 10).
- The UI's live example equals the API's `example` for every row.
- `gate1.lcb` sees no setup; a branch-only `fleet.setup.manage` user sees read-only Settings.
