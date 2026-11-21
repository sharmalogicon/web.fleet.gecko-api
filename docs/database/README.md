# Gecko Fleet — database scripts (SOURCES)

This folder holds the **source** scripts. You do not run these directly.
**What you run** is the numbered run folder `D:\SHARMA\PROJECT\gecko\database\FLEET_RUN\` (see its `RUN_ORDER.md`),
generated from these sources by `_build/build_run_folder.py` using `_build/run_manifest.json`.
The same numbered files run on the local SQL Server first (`run_local.ps1`) and later on Azure SQL (SSMS, SQLCMD Mode).

House rules: `web.trucking.gecko-api/docs/database/CONVENTIONS.md` (no FKs, UUID PKs, tenant_id + fail-closed RLS, 7-column audit, annotations, idempotent).
Design: `docs/backend-analysis/02_Gecko_Fleet_Database_Design.docx` §9 (script set).

## Adding a script (every phase)
1. Write the source here (`08_gecko_fleet/NN_x.sql`, or `00_gecko_identity/NN_x.sql` etc.).
2. Append an entry to `_build/run_manifest.json` with the next run number. Add another `91_rls_policy.sql` entry after any script that creates tables.
3. `python _build/build_run_folder.py`, then `.\run_local.ps1` in FLEET_RUN.
4. Never renumber. Once a run file has been applied on Azure it is frozen: fixes become new numbered files.

## Sources
| Source | What it does |
|---|---|
| `00_gecko_identity/37_fleet_permissions.sql` | 43 `fleet.*` permission codes (module FLEET) |
| `00_gecko_identity/38_fleet_roles_and_plans.sql` | FLEET plans + limits, SCT pilot entitlement (§0 parameters), 4 new role templates, grants, backfill |
| `08_gecko_fleet/00_create_database.sql` | database (UTF-8, RCSI), 19 schemas, roles, schema_version, pf_month/ps_month. The builder splits it: master part (LOCAL_ONLY run file) + objects part |
| `08_gecko_fleet/01_security_foundation.sql` | RLS predicate, tenant context proc, users, grants + DENY DELETE, deploy helpers |
| `08_gecko_fleet/02_config.sql` | number_series (+counter, usp_next_number), fleet_setting, approval_policy, labor_cost_rate |
| `08_gecko_fleet/91_rls_policy.sql` | generated RLS policy + guards |
| `01_gecko_master/49_fleet_trade_code_list.sql` | P1, run 008: `FLEET_TRADE` open code list (owning module FLEET) + 8 global trades — labour cost rates and technician skills validate against it |

| `08_gecko_fleet/03_asset.sql` | P1, run 009 (+ 010 = 91 re-run): `asset.asset_profile` (register: Trucking-linked copy or Fleet-owned), `asset.axle_layout`, `asset.axle_layout_axle` — all temporal. asset_code unique per source (SCT has truck codes equal to chassis numbers); axle positions derived, not stored |
| `08_gecko_fleet/04_people.sql` | P1, run 012 (+ 013 = 91 re-run): `people.driver` (Trucking-linked copy or Fleet-owned; NO personal data, option A), `people.technician`, `people.technician_skill`, `people.device` |
| `08_gecko_fleet/05_people_driver_work.sql` | P1, run 014: additive columns on `people.driver` the Drivers form needs (position, standard / OT cost rate + currency, fuel card no, unique per tenant) |
| `08_gecko_fleet/06_asset_specification.sql` | P1, run 016 (+ 017 = 91 re-run): `asset.asset_specification` — the equipment form's Spec tab (weights, dimensions, engine, fuel tank, payload, operating licence no), 1:1 with the asset, temporal |
| `04_gecko_trucking/40_driver_personal_extra.sql` | P1, run 015, ON gecko_trucking: `fleet.driver.personal_extra_enc` (birth date, SS no, phone, fax, e-mail, emergency contact — one encrypted JSON). Written by the Fleet session (owner decision: driver personal data lives only in Trucking) |
| `01_gecko_master/50_fleet_asset_category_code_list.sql` | P1, run 011: `FLEET_ASSET_CATEGORY` open code list, tenant values only |

Default number series, settings and axle layouts per tenant are NOT a script: the Fleet API writes them (`POST /api/fleet/setup/initialize`,
catalogue in `Gecko.Fleet/Application/FleetSetupCatalogue.cs`). A gecko_fleet script cannot see which tenants hold FLEET.

## Local run, 2026-11-19 (P1, run 008)
- 008 applied to the local SQL Server (gecko_master): FLEET_TRADE category + 8 values. Logged in FLEET_RUN/RUN_LOG.md.
- 009–011 applied locally: asset tables (009 re-run once: idempotent), RLS policy rebuilt to 8 tenant tables + 7 history tables with every
  guard passing (010), FLEET_ASSET_CATEGORY (011).

## Decisions made while writing P0 (for review)
1. **Schema `purch`, not `proc`** — PROC is a reserved word in T-SQL (`CREATE SCHEMA proc` fails). Design doc 02 updated and regenerated.
2. **Code columns use a FORMAT check, not a value list** (`series_code`, `document_type`, `setting_code`): they grow phase by phase and the additive-only rule forbids changing a CHECK after deployment. The Fleet module validates the values.
3. **38 §0 pilot**: SCT / `SCT1`, plan PROFESSIONAL, 180-day TRIAL. Add a row per workshop branch when SCT confirms. Plan prices/limits are placeholders.
4. **Roles**: TECHNICIAN holds only labour, inspection and work-request codes (guarded). `fleet.setup.manage` is TENANT_OWNER and FLEET_MANAGER only (guarded).

## Local run, 2026-11-19 (P0, runs 001–007)
- All 7 applied to the local SQL Server; a second full run added nothing (idempotent).
- Backup taken first: `...\MSSQL17.APPIFY\MSSQL\Backup\gecko_identity_before_fleet_P0_20261119.bak` (copy-only).
- Verified: SCT/SCT1 FLEET TRIAL (PROFESSIONAL) entitlement; 9 SCT system roles carry fleet grants; RLS policy covers 5 tables + 4 history tables;
  as `gecko_app_user` with no tenant context 0 rows are visible; `usp_next_number` gives `WO-SCT1-2611-00001`, `-00002`; a non-FLT series code is refused.
