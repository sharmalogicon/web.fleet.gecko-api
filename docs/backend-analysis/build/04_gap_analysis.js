const { H1, H2, H3, P, bullets, T, callout, cover, build } = require('./lib');

const gapTable = (rows) => T(['Gap', 'Why it matters', 'How to fill it (data · API · UI)', 'Priority', 'Phase'], rows, [18, 22, 42, 9, 9], { size: 14 });

const content = [
  cover('Enterprise Gap Analysis', 'Current Fleet UI compared with global enterprise fleet management applications, and how to close the gaps', 'GF-04 Gap Analysis'),

  H1('1. Purpose and method'),
  P('This document compares the current Gecko Fleet web UI (83 routes, mock data) and the back end planned in documents 01–03 against the capabilities typically found in global enterprise fleet and maintenance products. For each gap it proposes how to close it in Gecko.'),
  H2('1.1 Benchmark set'),
  ...T(['Category', 'Representative products', 'What they set the bar for'], [
    ['Fleet maintenance SaaS', 'Fleetio, Chevin FleetWave, Whip Around', 'Asset lifecycle, PM, WO, parts, fuel, inspections, mobile apps, integrations'],
    ['Telematics-led platforms', 'Samsara, Geotab (MyGeotab), Motive, Webfleet', 'Live GPS/odometer/engine hours, fault codes, driver safety, dashcams, DVIR'],
    ['Heavy-truck shop systems', 'Trimble TMT Fleet Maintenance, Decisiv', 'Workshop bays, technician time, VMRS coding, warranty recovery, vendor/service network'],
    ['Enterprise asset management (EAM)', 'SAP S/4HANA Asset Management, IBM Maximo, Oracle EAM', 'Asset hierarchy, reliability (MTBF/MTTR), procurement and finance integration, governance'],
  ], [22, 35, 43]),
  H2('1.2 Maturity scale'),
  ...T(['Level', 'Meaning'], [
    ['0 — Absent', 'No screen and no data model'],
    ['1 — Screens only', 'UI exists on mock data; no business logic, no persistence'],
    ['2 — Transactional', 'Records persisted with basic validation and CRUD'],
    ['3 — Managed', 'Workflow, approvals, ledgers, integrations, KPIs'],
    ['4 — Optimised', 'Automation, prediction, mobile/IoT-driven, benchmarking'],
  ], [22, 78]),

  H1('2. Scorecard'),
  P('"Current" is the UI as it is today. "Planned" is the expected level after the execution plan (document 03, weeks 1–24). "Target" is the enterprise benchmark level SCT should aim for over 12–18 months.'),
  ...T(['#', 'Capability area', 'Current', 'Planned', 'Target', 'Biggest gaps'], [
    ['A', 'Asset lifecycle & registry', '1', '2.5', '4', 'Acquisition/disposal, depreciation, TCO, warranty, recalls, asset hierarchy'],
    ['B', 'Telematics & IoT', '0', '2', '4', 'Automatic odometer/hours, fault codes (DTC), TPMS, live location on the asset view'],
    ['C', 'Preventive maintenance', '1', '3', '4', 'Multi-trigger due, forecasting, campaigns/recalls, VMRS coding'],
    ['D', 'Work orders & workshop', '1', '3', '4', 'Bays and technician scheduling, time clock, estimates, vendor portal, mobile technician'],
    ['E', 'Inspections (DVIR)', '0', '1', '4', 'Driver checklist app, defect workflow, out-of-service gating'],
    ['F', 'Parts & inventory', '1', '3', '4', 'Barcodes, cycle counts, kitting, core/warranty returns, multi-warehouse'],
    ['G', 'Procurement & AP', '1', '3', '3.5', 'Approval matrix, 3-way match, vendor scorecards, contract pricing'],
    ['H', 'Tyre management', '1.5', '3', '4', 'TPMS/tread capture, CPK by brand/position, retread programme, scrap analysis'],
    ['I', 'Fuel & energy', '1', '3', '4', 'Fuel-card import, fraud rules, EV charging, CO₂ reporting'],
    ['J', 'Driver management & safety', '1', '2', '4', 'Safety scorecards, coaching, training records, dashcam events, working-hour limits'],
    ['K', 'Compliance & documents', '0.5', '2.5', '4', 'Expiry board, renewal workflow, regulatory inspections, audit pack'],
    ['L', 'Incidents, claims & fines', '1', '3', '3.5', 'FNOL from mobile, third-party tracking, recovery tracking, driver deduction'],
    ['M', 'Analytics & reporting', '1', '2.5', '4', 'Live KPIs, benchmarking, scheduled reports, BI export, custom report builder'],
    ['N', 'Platform & integration', '0.5', '3', '4', 'SSO, open API/webhooks, mobile/offline, custom fields, configurable workflows, bulk import'],
  ], [4, 24, 9, 9, 9, 45], { size: 15 }),
  ...callout('Reading the scorecard', [
    'The UI is broad (it covers almost every legacy screen) but shallow: it has no persistence, workflow, line editing or automation. The planned back end brings most areas to level 3.',
    'The largest **structural** gaps against enterprise products are **telematics-driven automation (B)**, **driver inspections (E)** and **driver safety (J)**. These areas depend on mobile and IoT, and the legacy system never had them.',
  ], 'warn'),

  H1('3. UI structural gaps (current web app)'),
  P('These gaps come from the inventory of `web.fleet.gecko-api`. They have to be closed whatever happens with the enterprise features.'),
  ...T(['Gap', 'Evidence', 'Fix', 'Phase'], [
    ['No back end, auth or tenant', 'No API client, no React Query; next-auth unused; "Super Admin" hard-coded; branchID hard-coded to 1', 'Doc 03 §2.4: API client, Identity login, branch switcher', 'P0'],
    ['Saves are lost', 'Client mock mutations never reach server-rendered pages', 'Real API + React Query invalidation', 'P0–P1'],
    ['Line items are read-only on every document', 'No useFieldArray or add-line control on WO, PO, GRN, requisition, invoice or claim', 'Shared `<LineItemsEditor>` + selection popups', 'P3'],
    ['No workflow actions', 'Approve exists only for fuel, rates and payments (mock); no WO/PO post, approve or cancel', 'Status action bar driven by the transitions the API returns', 'P3–P8'],
    ['Inconsistent contracts', 'Numeric vs string IDs; status as text, booleans or legacy numbers; mixed line key names', 'OpenAPI-generated types; enum codes + i18n labels', 'P0–P1'],
    ['Static dashboard', 'KPI cards are constants', '`/dashboard/kpis` + drill-down', 'P9'],
    ['Reports cannot export', 'PDF/Excel buttons disabled; placeholder preview', 'Server-rendered QuestPDF/ClosedXML', 'P9'],
    ['Uploads disabled', 'Driver and accident photos', 'Attachment API + Blob storage', 'P3/P7'],
    ['Navigation defects', 'Credit-notes index missing; vendor payments not in the menu; `/settings` 404', 'Fix routes; add Settings (users, branches, number series, approval policy, code lists)', 'P0'],
    ['Partial i18n', 'Only 184 of 439 TSX files use `t()`; dashboard and report labels are English only', 'Complete EN/TH keys; lint rule against hard-coded strings', 'every phase'],
    ['Tyre axle map not persistent', 'Fitment changes stay in client state only', 'Wire to `/assets/{id}/tyre-map` and `/tyre-events`', 'P6'],
    ['Duplicated/misplaced menus', 'Tariff (Revenue), container equipment types (MasterData), transporters (Master party)', 'Remove or link out; supplier management replaces transporter registration for vendors', 'P1'],
    ['No global search, notifications or audit view', '—', 'Header search (asset/WO/PO/tyre), notification bell (outbox → in-app), "History" tab from audit.activity', 'P3–P9'],
    ['Thin tests', 'Only 2 test files (drivers)', 'Vitest per data adapter + Playwright E2E', 'every phase'],
  ], [20, 30, 38, 12], { size: 14 }),

  H1('4. Detailed gaps and how to fill them'),

  H2('A. Asset lifecycle & registry'),
  gapTable([
    ['Asset lifecycle stages', 'Enterprises manage an asset from requisition through disposal, not only while it is in service', 'asset_profile lifecycle fields (acquired, in-service, disposal date, method and value); disposal workflow; UI "Lifecycle" tab', 'Should', 'Ph 2'],
    ['Depreciation & TCO', 'Cost per km must include capital cost', 'Monthly DEPRECIATION/LEASE entries in cost.asset_cost_entry (straight-line or declining balance; lease from contract); TCO report', 'Should', 'Ph 2'],
    ['Warranty tracking & recovery', 'Warranty claims typically recover a meaningful share of parts cost on newer fleets', 'Warranty on asset, item and tyre (months/km); WO line flags "in warranty"; warranty claim document to the vendor; recovery as a negative cost entry', 'Must', 'P3/Ph 2'],
    ['Recalls & campaigns', 'OEM recalls and fleet-wide retrofits must be tracked to completion', 'maint.campaign (asset set, task) → generated WRs; completion %', 'Could', 'Ph 2'],
    ['Asset hierarchy & components', 'Track engines, gearboxes, batteries and gensets that move between trucks', 'asset.component (serial-tracked like tyres) with fitment events; reuses the tyre event pattern', 'Could', 'Ph 3'],
    ['Pool/reservation of light vehicles', 'Service vans and pool cars', 'Booking calendar for FLEET-source assets', 'Won\'t (now)', '—'],
  ]),

  H2('B. Telematics & IoT'),
  gapTable([
    ['Automatic odometer/engine hours', 'Manual meter entry is the main cause of wrong PM due dates', 'Use Trucking `vehicle_position`/trip events (provider codes already on vehicle) → asset.meter_reading (source TELEMATICS) with throttling and plausibility checks', 'Must', 'P2'],
    ['Engine fault codes (DTC)', 'Catches failures before a breakdown; standard in telematics platforms', 'New table asset.fault_event (SPN/FMI or OBD code, severity, first/last seen); rules → auto work request; requires provider support', 'Should', 'Ph 2'],
    ['TPMS / tread sensors', 'Tyres are the largest maintenance cost after fuel', 'Ingest pressure/temperature as tyre_event INSPECT (source SENSOR); alerts', 'Could', 'Ph 3'],
    ['Live location on asset view', 'Workshop and dispatch coordination', 'Read Trucking `vehicle_position` through a contract; map widget on the asset 360° view', 'Should', 'P9'],
    ['Thailand DLT GPS compliance', 'Regulated truck categories must report GPS to the Department of Land Transport', 'Owned by Trucking/telematics provider; Fleet shows the device status as a compliance item', 'Should', 'Ph 2'],
  ]),

  H2('C. Preventive maintenance'),
  gapTable([
    ['Multi-trigger intervals', 'The legacy system fired only on an exact meter match', 'pm_program_task km/hours/days, "whichever comes first", with advance notice (doc 02 §4.4)', 'Must', 'P2'],
    ['PM forecasting', 'Plan workshop capacity and parts weeks ahead', 'Project due dates from average km/day (meter history) → 90-day forecast board; parts demand forecast', 'Should', 'P9/Ph 2'],
    ['Standard repair coding (VMRS)', 'Lets costs be compared by system/assembly/component across fleets and vendors', 'Add vmrs_system/assembly/component codes to service_task and WO lines (code list); reports by VMRS', 'Should', 'P3 (fields) / P9 (reports)'],
    ['Seasonal/conditional tasks', 'e.g. A/C check before the hot season, extra service after flood exposure', 'Task conditions (month window, tag) on the programme', 'Could', 'Ph 2'],
    ['PM compliance KPI', 'Main measure of maintenance discipline', 'pm_task_state history → on-time % per branch/asset', 'Must', 'P9'],
  ]),

  H2('D. Work orders & workshop'),
  gapTable([
    ['Estimates & customer/insurer approval', 'Needed for customer recharge (damage) and claim repairs; Thai customers expect a written quotation before work', 'WO estimate (frozen copy of priced lines) + customer approval; TH/EN PDF estimate', 'Must', 'P3/P5'],
    ['Bay & technician scheduling', 'Workshop throughput is limited by bays and skills', 'maint.workshop_bay; scheduling board (drag a WO to bay/technician/time); skill matching', 'Should', 'Ph 2'],
    ['Technician time clock', 'Accurate labour cost and productivity (wrench time %)', 'Clock in/out per WO task (web kiosk, later mobile); idle/indirect time codes', 'Should', 'P3 (basic) / Ph 2'],
    ['Complaint–cause–correction (3C)', 'Industry standard for repair history and warranty', 'Fields on wo_task (already in doc 02)', 'Must', 'P3'],
    ['Repeat-repair detection', 'Flags poor-quality repairs (same component within N days/km)', 'Rule on WO completion: same service_task/VMRS on the same asset within threshold → flag + report', 'Should', 'P9'],
    ['Vendor/roadside service network', 'Outsourced repairs and breakdown assistance', 'Supplier categories (WORKSHOP, TOWING); sublet lines; vendor portal (Ph 3) for vendors to post quotes and invoices', 'Could', 'Ph 3'],
    ['Downtime tracking', 'Availability KPI', 'wo_status_log + OOS events → downtime hours by reason', 'Must', 'P3/P9'],
  ]),

  H2('E. Inspections (DVIR)'),
  gapTable([
    ['Driver pre/post-trip inspections', 'Finds defects before they become breakdowns; often a regulatory or customer requirement', 'insp.* tables (doc 02 §4.5); web form in P3; **mobile app** (PWA or Flutter, reusing the Trucking driver-app login) in Ph 2', 'Must', 'P3 web / Ph 2 mobile'],
    ['Defect → WR → WO loop with sign-off', 'Closes the safety loop; the driver confirms the repair', 'defect status + link to WO; "repair verified" step on the next inspection', 'Must', 'Ph 2'],
    ['Out-of-service gating', 'Stops unsafe dispatch', 'OUT_OF_SERVICE defect → fleet.asset.out_of_service event → Trucking blocks dispatch', 'Must', 'Ph 2'],
    ['Photo, GPS, signature evidence', 'Proof for audits and claims', 'attachments + lat/long + signature on inspection', 'Should', 'Ph 2'],
  ]),

  H2('F. Parts & inventory'),
  gapTable([
    ['Barcode/QR scanning', 'Speed and accuracy at issue, receipt and count', 'item_alias barcodes; scanner input in GRN/issue/count screens; label printing (PDF)', 'Should', 'P4/Ph 2'],
    ['Cycle counting', 'Keeps stock accurate without full shutdowns', 'inv.stock_count with ABC-class schedules', 'Should', 'P4'],
    ['Kits', 'PM kits speed up issue', 'item kit (BOM) used by pm_program_part and issue', 'Could', 'Ph 2'],
    ['Cores & warranty returns', 'Recovers value on exchange units (alternators, batteries)', 'core charge on item; core return document; warranty return RTV type', 'Could', 'Ph 2'],
    ['Inventory analytics', 'Reduce dead stock and stock-outs', 'turns, dead stock, fill rate, stock-out incidents (rpt views)', 'Should', 'P9'],
  ]),

  H2('G. Procurement & AP'),
  gapTable([
    ['Approval matrix', 'Spend control', 'config.approval_policy (amount, branch, levels)', 'Must', 'P4'],
    ['Three-way match', 'Prevents over-billing', 'ap.vendor_invoice_line expected vs invoiced, with tolerance', 'Must', 'P8'],
    ['Vendor scorecards', 'Choose vendors on lead time, quality and price', 'On-time delivery (GRN vs PO required date), return rate, repeat repairs, price variance', 'Should', 'P9'],
    ['Contract/agreement pricing', 'Negotiated rates for parts and labour', 'item_vendor quoted_price with validity; vendor labour rate agreements', 'Should', 'P4'],
    ['ERP integration (SAP Business One)', 'Avoid double entry in accounting', 'ap.export_batch: CSV first (P8), then the SAP B1 Service Layer adapter (A/P invoices, credit notes, payment status back); SAP BP and item codes captured from P1', 'Must', 'P8/P10'],
    ['Thai e-Tax / WHT certificates', 'Statutory', 'Withholding-tax certificate (50 Tawi) PDF per payment; e-Tax handled by Revenue for AR', 'Should', 'P8/Ph 2'],
  ]),

  H2('H. Tyre management'),
  gapTable([
    ['Tread & pressure inspection rounds', 'CPK and safety depend on regular measurement', 'Tyre inspection document from the axle map (tap a position → tread/psi); mobile in Ph 2', 'Must', 'P6'],
    ['CPK by brand/size/position/vendor', 'Main lever for choosing tyre brands', 'tyre_fitment projection + cost events → rpt.v_tyre_cpk', 'Must', 'P6/P9'],
    ['Retread programme', 'Retreading lowers cost per km', 'recap order documents, casing eligibility rules, recap count limit', 'Should', 'P6'],
    ['Scrap analysis', 'Detects driver or alignment issues', 'scrap reason codes + photos; Pareto report', 'Should', 'P6/P9'],
    ['Rotation rules', 'Even wear', 'Rotation suggestions by tread difference between positions', 'Could', 'Ph 2'],
  ]),

  H2('I. Fuel & energy'),
  gapTable([
    ['Fuel-card integration', 'Removes manual entry; enables fraud checks', 'Card file/API import (PTT, Shell, Bangchak) → Trucking fuel ledger via IFuelLedger; card ↔ vehicle/driver mapping', 'Should', 'Ph 2'],
    ['Fuel fraud/anomaly rules', 'Fuel is the largest variable cost', 'Rules: litres > tank capacity, refuels too close in time/km, location mismatch with GPS, efficiency outside the norm band → exception queue (P7)', 'Must', 'P7'],
    ['Efficiency vs norm', 'Driver and vehicle performance', 'km/L against fleet.fuel_norm by asset/driver/route; trend charts', 'Must', 'P7'],
    ['EV & charging', 'Fleet electrification', 'Trucking has deferred ev.* tables; Fleet adds kWh efficiency and battery health when activated', 'Could', 'Ph 3'],
    ['Emissions (CO₂) reporting', 'ESG reporting asked for by customers', 'CO₂ = litres × factor per fuel type (setting); monthly report by customer/lane via Trucking job orders', 'Should', 'Ph 2'],
  ]),

  H2('J. Driver management & safety'),
  gapTable([
    ['Driver safety scorecard', 'Fewer accidents and lower insurance cost', 'Score from accidents, violations, inspection compliance, fuel efficiency and (later) harsh-driving events; shown on the driver Fleet tab', 'Should', 'P9/Ph 2'],
    ['Training & certification records', 'Compliance (hazmat, defensive driving)', 'Use Trucking driver_document types (TRAINING, MEDICAL); expiry board', 'Should', 'Ph 2'],
    ['Dashcam/ADAS events & coaching', 'Standard in telematics-led platforms', 'Event ingest (provider) → coaching tasks; out of scope until a provider is chosen', 'Could', 'Ph 3'],
    ['Working-hour limits', 'Thai Land Transport Act rules on driving time and rest', 'Owned by Trucking dispatch (job order times); Fleet reports violations', 'Could', 'Ph 3'],
  ]),

  H2('K. Compliance & documents'),
  gapTable([
    ['Compliance board', 'Avoids fines and uninsured operation', 'Expired / 30 / 60 / 90-day board over Trucking vehicle_document and driver_document', 'Must', 'P1/P9'],
    ['Renewal workflow & cost', 'Plan renewals and their cost', 'Renewal task → cost entry (COMPLIANCE) → new document version', 'Should', 'Ph 2'],
    ['Audit pack', 'Customer and regulator audits', 'One-click PDF per asset: documents, inspections, maintenance history', 'Could', 'Ph 2'],
  ]),

  H2('L. Incidents, claims & fines'),
  gapTable([
    ['First notice of loss (FNOL) from the field', 'Faster claims and better evidence', 'Accident capture in the driver app (photos, GPS, third party)', 'Should', 'Ph 2'],
    ['Recovery tracking', 'Know the net accident cost', 'claim approved/received vs cost; RECOVERY cost entry', 'Must', 'P7'],
    ['Fine → driver resolution & deduction', 'Accountability', 'Auto-resolve the driver from the assignment/job order at the time of the offence; deduction via a Trucking settlement line', 'Should', 'P7'],
  ]),

  H2('M. Analytics & reporting'),
  gapTable([
    ['Live KPI dashboard', 'Management visibility', 'KPIs from doc 01 §18.2 with drill-down; branch filter', 'Must', 'P9'],
    ['Scheduled & e-mailed reports', 'Routine management packs', 'Report schedule table + nightly job + Notification', 'Should', 'Ph 2'],
    ['BI export / data warehouse', 'Group-level analytics (Power BI)', 'Read-only reporting views + Parquet export (the platform already has Parquet.Net)', 'Should', 'Ph 2'],
    ['Benchmarking', 'Compare branches, vehicle types and vendors', 'Normalised KPIs (per km, per asset-day) across branches', 'Could', 'Ph 2'],
    ['AI assistance', 'Repair suggestion, anomaly explanation', 'gecko_ai registry: suggest service tasks from complaint text; summarise asset history', 'Could', 'Ph 3'],
  ]),

  H2('N. Platform & integration'),
  gapTable([
    ['SSO and fine-grained RBAC', 'Enterprise IT requirement', 'Gecko Identity roles/permissions (P0); SSO (Entra ID/Google) as a platform feature', 'Must / Should', 'P0 / platform'],
    ['Open API & webhooks', 'Integrations with ERP, telematics and BI', 'OpenAPI published; Trucking-style integ.webhook_subscription for fleet events', 'Should', 'Ph 2'],
    ['Mobile & offline', 'Technicians and drivers work in yards with poor signal', 'PWA or Flutter app (driver and technician) with offline queue; reuse the Trucking driver-app identity', 'Should', 'Ph 2'],
    ['Custom fields & configurable forms', 'Tenants differ', 'JSON custom-field definitions per entity (tenant setting) rendered by the UI', 'Could', 'Ph 2'],
    ['Bulk import/export', 'Onboarding new tenants', 'Excel templates (ClosedXML) for assets, items, PM programmes, tyres; validation preview (the same pattern as the Revenue tariff upload)', 'Must', 'P1/P4'],
    ['Audit history view', 'Who changed what', '"History" tab from audit.activity + temporal tables', 'Should', 'P9'],
    ['Notifications centre', 'Action-oriented work', 'In-app notification list + LINE (the Notification module needs a real sender)', 'Should', 'P9/platform'],
  ]),

  H1('5. New UI pages to add'),
  ...T(['Route (proposed)', 'Purpose', 'Phase'], [
    ['/fleet/assets/[id] (360°)', 'Asset overview: identity (Trucking), meters, PM due, open WOs, tyres, documents, costs, location', 'P1→P9'],
    ['/fleet/pm-due', 'Due/overdue list and forecast; bulk "create work requests"', 'P2'],
    ['/fleet/technicians', 'Technician master and skills', 'P1'],
    ['/fleet/inspections, /fleet/inspection-templates, /fleet/defects', 'DVIR (web first)', 'P3/Ph 2'],
    ['/fleet/stock-issues, /fleet/stock-transfers, /fleet/stock-counts, /fleet/reorder', 'Inventory transactions that are missing from the UI', 'P4'],
    ['/master/suppliers', 'Supplier/insurer management (gecko_master party + supplier extension)', 'P1'],
    ['/fleet/fuel/exceptions, /fleet/fuel/efficiency', 'Fuel control', 'P7'],
    ['/fleet/compliance', 'Expiry board', 'P1/P9'],
    ['/fleet/warranty-claims', 'Warranty recovery', 'Ph 2'],
    ['/tariff/standard, /tariff/customers', 'Repair tariff: labour rates, flat-rate jobs, parts markup, sundries (data in gecko_revenue); replaces the haulage-tariff pages', 'P5'],
    ['/fleet/recharges', 'Billable WO lines: release to customer invoice (Revenue) or subcontractor deduction (Trucking)', 'P5'],
    ['/settings/*', 'Number series, approval policy, labour cost rates, code lists, users and branches (links to Identity), integrations', 'P0→P10'],
  ], [32, 55, 13], { size: 15 }),

  H1('6. Gap-closure roadmap'),
  ...T(['Horizon', 'Focus', 'Main deliverables'], [
    ['Phase 1 (about 29 weeks with two people, doc 03)', 'Parity with legacy, corrected; platform-native', 'Auth/tenant, asset register linked to Trucking plus non-truck equipment, repair tariff and recharge (customer invoice, subcontractor deduction), SAP B1 integration, PM multi-trigger, WO with line editing, inventory ledger, procurement with 3-way match, tyres with axle map, incidents, fuel exceptions, cost ledger, KPI dashboard, reports export, telematics odometer'],
    ['Phase 2 (months 7–12)', 'Close the enterprise gaps with the highest ROI', 'Driver/technician mobile app (DVIR, defects, time clock, tyre inspection, FNOL), warranty recovery, fuel-card import, fault codes, PM forecasting, bay scheduling, compliance renewals, scheduled reports, BI export, webhooks, CO₂ reporting'],
    ['Phase 3 (months 12–18)', 'Optimise and differentiate', 'Component tracking, TPMS, dashcam/safety coaching, vendor portal, EV analytics, AI repair assistant, benchmarking across tenants (anonymised)'],
  ], [22, 26, 52], { size: 15 }),
  ...callout('Recommendation', [
    'Lock Phase 1 scope to legacy parity plus the "Must" items marked P0–P9 above. The two Phase 2 items with the most business value for SCT are likely the **driver inspection app** and **fuel-card integration with fraud rules**. Decided (document 03 §2): the mobile app is phase 2 with its tables created in phase 1, and the odometer comes from ThaiGPS through Trucking phase G2.',
  ], 'ok'),

  H1('7. Standards worth adopting'),
  ...bullets([
    '**VMRS** (Vehicle Maintenance Reporting Standards) codes for systems, assemblies, components and reasons for repair. These make cost analysis comparable across vendors and fleets.',
    '**ISO 55000** asset-management principles for lifecycle and TCO governance.',
    '**SAE J1939 / OBD-II** fault-code semantics for telematics fault events.',
    'Thai regulatory items: DLT vehicle tax and inspection, compulsory motor insurance (พ.ร.บ.), DLT GPS requirements for regulated trucks, Revenue Department WHT and e-Tax invoice rules.',
  ]),
];

build('04_Gecko_Fleet_Enterprise_Gap_Analysis.docx', 'Enterprise Gap Analysis', content);
