# Gecko Fleet — go-live runbook (P11)

Written 2026-11-20 by the backend session. Everything below is built and tested **locally**; nothing has run on Azure yet.
Status of each phase: `docs/backend-analysis/TODO.md`. UI hand-over: `ui-prompts/README.md` (prompts 01–18).

## 1. Database (owner runs Azure)
1. Create `gecko_fleet` in the portal (settings in `D:\SHARMA\PROJECT\gecko\database\FLEET_RUN\RUN_ORDER.md`: S0+, collation
   `Latin1_General_100_CI_AS_SC_UTF8`).
2. Run `FLEET_RUN\001 … 050` **once, in order**, in SSMS with SQLCMD mode, each against the database in its file name
   (gecko_fleet, gecko_identity, gecko_master, gecko_revenue, gecko_trucking). Log each in `RUN_LOG.md`.
   Same files that ran locally — nothing edited in between. A file that fails: stop, send the message, `ROLLBACK` if a transaction is open.
3. `database/_migration/test_fixture/F03_fleet_trials_for_tests.sql` is **LOCAL ONLY** (test tenants) — never on Azure.
4. Check after the run: `SELECT COUNT(*) FROM sys.security_predicates` on gecko_fleet = 3 × 88 tenant tables + 60 history filters
   (the 91 script prints the same check).

### 1b. What runs 001–056 do to the live TOS tenant (checked 2026-11-21)
Short answer: **no TOS data or behaviour changes from the scripts.** Every script is additive and idempotent. Details:
- **gecko_fleet** (most runs): a new database. TOS does not use it.
- **Shared databases**: new tables and rows only. No existing table, column, CHECK or procedure is altered or dropped.
  - gecko_revenue gets the repair tariff, `fleet_charge`, `fleet_invoice_line` and `credit_note(_line)`.
  - gecko_trucking gets `subcon_deduction_request` and one nullable column on `fleet.driver`.
  - gecko_master gets the supplier role table and new code lists.
  - The running Platform API (EF) ignores tables and columns it doesn't know about.
- **RLS:** the policy refresh scripts (revenue 08 / trucking 50 / trucking 91, master 51) **never drop the policy**. They only add
  predicates for the new tables, in one statement, so isolation is never off. No maintenance window is needed. Still, run them
  outside the gate's peak hour, because each one takes a schema lock for a second or two.
- **gecko_identity:**
  - FLEET permission codes, plans and role templates are new rows. FLEET roles and entitlement go only to the pilot tenant set in
    38 §0 (`SCT`).
  - Run 39 adds `mdm.supplier.view` and `mdm.supplier.manage` to the existing **system** roles of **every** tenant, the TOS tenant
    included. This is harmless (supplier screens only).
  - `usp_provision_tenant` copies every active template into tenants created later, so a new TOS tenant would also get the 4 Fleet
    roles. They are unused without the FLEET entitlement.
- **Number series:** credit notes use the tenant's existing `CREDIT_NOTE` series (CN-…), which no TOS document uses today.

**The real risk is the Platform API deploy, not the scripts.** Credit notes, fleet invoices, repair tariffs and supplier endpoints
all live in `Gecko.Api`, the host that serves the live TOS tenant.
- Order: run the scripts first (the current API keeps working on them), then deploy `Gecko.Api` from this branch.
- Before deploying, the Revenue + TOS test suites must pass. Deploy in a quiet hour, with the previous package ready to swap back.

## 2. Hosts and configuration
| Host | Port (local) | Needs |
|---|---|---|
| Platform API (`Gecko.Api`) | 5100 | as today (identity, master, revenue, trucking) |
| Fleet API (`Gecko.Fleet.Api`) | 5300 / 7300 | the settings below |

Fleet API settings (Azure App Service configuration / Key Vault references — never in appsettings.json):
| Key | Value |
|---|---|
| `ConnectionStrings:FleetApp` | gecko_fleet as `gecko_app` (RLS-scoped) |
| `ConnectionStrings:FleetSystem` | gecko_fleet as `gecko_system` (nightly job lists tenants) |
| `ConnectionStrings:MasterDataApp`, `IdentityApp`, Trucking / Revenue app strings | as the Platform API uses them (Fleet composes their read contracts in-process) |
| `Identity:Jwt:*` | the same issuer / audience / public key as the Platform API |
| `FileStore:Provider` (+ container / root) | the same store as the Platform API (WO / accident photos, AP export CSVs) |
| `Fleet:NightlySync:Enabled` | `true` once Trucking is live for the tenant; `Fleet:NightlySync:HourUtc` default 19 (= 02:00 Thai) |
| `Erp:Secrets:<passwordRef>` | the SAP B1 Service Layer password (only when SAP is switched on, §5) |
| `Erp:AcceptAnyCertificate` | `true` only if SCT's Service Layer has a self-signed certificate |

UI (`web.fleet.gecko-api`): `PLATFORM_API_ORIGIN` and `FLEET_API_ORIGIN` (prompt 01); the UI never calls SAP or the database.

## 3. Tenant set-up (per FLEET tenant, as its owner, in the UI or with the API)
1. Fleet Setup → **Set up defaults** (`POST /api/fleet/setup/initialize`): 19 number series, settings, 10 axle layouts.
2. Review settings (base currency, tolerances, tyre thresholds), approval policies, labour cost rates.
3. `POST /api/fleet/sync/trucking` — vehicles / chassis / drivers linked from Trucking (and job-order odometers).
4. Masters keyed / imported: Fleet-only equipment, technicians, stores + bins, items, service tasks, PM programmes + assignments,
   suppliers (Platform), repair tariff cards (Revenue).

## 4. Opening balances (cut-over weekend)
Templates: `GET /api/fleet/opening-balances/{STOCK|TYRES|PM_BASELINES|METERS}/template`. For each file: upload with
`commit=false` until there are no errors, then `commit=true`; a failed row on commit is listed — fix and re-upload only those.
Order: **METERS → PM_BASELINES → STOCK → TYRES** (tyres fitted at a position need the odometer and the axle layout first).
Open POs are keyed in the PO screen (plan decision). Stock: from the physical count, base units, base-currency cost; one
opening per item and store.

## 5. SAP Business One switch-over (P10) — when SCT gives the details
1. Fleet Setup → ERP connection: Service Layer URL (`https://…:50000/b1s/v1`), company DB, user, `passwordRef`; IT sets
   `Erp:Secrets:<passwordRef>`. **Test connection** must be green.
2. ERP mappings: GL for GRN_STOCK, GRN_SERVICE, WO_SUBLET, TYRE_EVENT, MANUAL, CREDIT; TAX 7 (and 0 if needed); WHT 1 / 3 / 5;
   BP only where SAP's CardCode ≠ the Gecko supplier code. The accountant confirms that SERVICE-type A/P documents with a G/L
   account per line are how they want Fleet AP in SAP (Gecko keeps the stock).
3. Until then: export target CSV (P8), or `fake://demo` for UAT.
4. Daily: export pending to SAP_B1 → retry failures → **Pull SAP payments** → reconciliation (plan exit: one month posted and reconciled).

## 6. Cut-over checklist
- [ ] Azure runs 001–056 logged OK; security predicate count checked.
- [ ] Fleet API deployed with the settings in §2; `/health` OK; Swagger off in Production.
- [ ] Tenant initialised; Trucking sync run; masters complete (§3).
- [ ] Opening balances committed and spot-checked (stock value = count sheet, tyres on the axle map, PM due list sensible).
- [ ] Roles granted: WORKSHOP_SUPERVISOR, TECHNICIAN, STOREKEEPER, PURCHASER, ACCOUNTS (+ revenue.tariff.* for tariff pages).
- [ ] `Fleet:NightlySync:Enabled = true`; next morning: meter readings with source TRUCKING appear; cost ledger filled.
- [ ] SAP (§5) or CSV export agreed with accounts.
- [ ] UAT sign-off on the UI prompts' "Done when" lists (UI session TODO).

## 7. Hypercare (2 weeks)
Daily: Fleet API logs (`Fleet nightly …` lines, 5xx), suspect meter readings (`GET /meter-readings?status=SUSPECT`), failed SAP
documents (`GET /ap-exports/pending`), recharge deliveries FAILED (`GET /recharges?status=FAILED`), reconciliation non-OK rows.

## 8. Known gaps (decide before / after go-live)
- Trucking → Fleet sync: nightly + on demand + (P12f) every N minutes when Fleet:TruckingPoll:IntervalMinutes > 0 (suggest 15).
- P12 built: payment approval (setting VENDOR_PAYMENT_APPROVAL), stock reservations, depreciation, invoice price-variance
  revaluation (runs 051–054 — run them on Azure too).
- Not built: WO credit notes (customer side — needs Revenue credit notes, owner decision), Trucking fuel of linked trucks in the
  Fleet cost ledger.
- Report times shown at UTC+7 (pilot); multi-timezone tenants need the branch zone.
- Local test data: RechargeTests fails on two live-test tariff cards on SCT-TEST (owner to OK their removal); Trucking
  statement deduction step untested (stale local tariff ZZ-TRP-101D6C0894BD4).
- Performance: indexes exist for every list filter used; no load test run yet — run one on Azure S0 with a month of SCT volume
  before go-live (reports cap at 5,000 rows; cost sync scans the tenant's sources — fine at pilot volume, revisit above ~50k WOs).
