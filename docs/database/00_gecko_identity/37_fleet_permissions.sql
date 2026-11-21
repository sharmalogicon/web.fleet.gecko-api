-- ============================================================
-- GECKO IDENTITY — FLEET PERMISSIONS
-- Script: 37_fleet_permissions.sql
-- Owner:  Identity & Access (codes requested by the Fleet module, P0)
--
-- ROWS ONLY in iam.permission (a platform reference table: no tenant_id, not in
-- the RLS policy — 06 header). One code per decision a fleet screen makes,
-- named <module>.<area>.<action> like the trucking.* / revenue.* codes (29, 15).
-- Every code carries module_code FLEET, so a tenant without the FLEET
-- entitlement never sees them in effect (RequireModule("FLEET")).
--
-- THE TRUCKING CODES ARE NOT REPLACED. Trucking stays the owner of vehicles,
-- chassis, drivers, their documents and the fuel ledger; editing those is still
-- trucking.fleet.manage / trucking.driver.manage. fleet.asset.manage covers
-- the Fleet asset register: Fleet-owned assets and the maintenance profile of
-- linked Trucking assets (their identity fields are a read-only copy).
--
-- REPAIR TARIFF USES revenue.* (decision Q7): the rate cards are tables in
-- gecko_revenue (tariff.repair_*), so editing / approving them is
-- revenue.tariff.manage / .approve, exactly as trucking quotations are (29).
--
-- APPROVAL CODES are the values config.approval_policy.required_permission
-- holds in gecko_fleet (ck_approval_policy__permission: must start fleet.).
--
-- Role-template grants, plans, the SCT entitlement and the backfill are in 38.
-- REBUILD ORDER: 07 TRUNCATEs iam.role_template_permission; after any re-run
-- of 07, re-run the later permission scripts (14 onward) and then 37–38 again.
--
-- Idempotent. Safe to re-run. Run as sysadmin or a member of gecko_system.
-- ============================================================

USE gecko_identity;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;
GO

IF NOT (IS_ROLEMEMBER('gecko_system') = 1 OR IS_SRVROLEMEMBER('sysadmin') = 1)
BEGIN
    RAISERROR('Run as sysadmin or a member of gecko_system.', 16, 1);
    SET NOEXEC ON;
END
GO

IF NOT EXISTS (SELECT 1 FROM lookup.module WHERE module_code = 'FLEET' AND is_active = 1)
    THROW 50370, 'FLEET is not an active row of lookup.module — run 07_seed_data.sql first.', 1;
GO

-- ============================================================
-- 1. The codes (MERGE: re-running refreshes names and descriptions)
-- ============================================================
MERGE iam.permission AS t
USING (VALUES
    -- setup (number series, settings, approval policies, labour cost rates)
    ('fleet.setup.manage',             N'Manage fleet setup',               N'Maintain fleet number series, settings, approval policies and labour cost rates.'),
    -- M1 asset register, M3 meters
    ('fleet.asset.view',               N'View fleet assets',                N'Read the asset register, axle layouts, meter history and asset cost.'),
    ('fleet.asset.manage',             N'Manage fleet assets',              N'Register Fleet-owned assets, edit maintenance profiles of linked Trucking assets, axle layouts and disposal.'),
    ('fleet.meter.record',             N'Record meter readings',            N'Enter odometer and hour-meter readings by hand.'),
    ('fleet.meter.override',           N'Override meter readings',          N'Accept a suspect reading, reverse a wrong one, or record a meter replacement.'),
    -- M2 people
    ('fleet.people.view',              N'View drivers and technicians',     N'Read drivers, technicians, their skills and devices.'),
    ('fleet.people.manage',            N'Manage drivers and technicians',   N'Maintain Fleet-held drivers, technicians, skills and devices.'),
    -- M4 preventive maintenance
    ('fleet.pm.view',                  N'View preventive maintenance',      N'Read PM programmes, schedules and what is due.'),
    ('fleet.pm.manage',                N'Manage preventive maintenance',    N'Maintain the service library and PM programmes, and assign them to assets.'),
    -- M5 work requests and work orders
    ('fleet.workrequest.create',       N'Raise work requests',              N'Report a fault or request work on an asset (drivers, yard staff, inspectors).'),
    ('fleet.workrequest.approve',      N'Approve work requests',            N'Approve, reject or merge work requests into work orders.'),
    ('fleet.workorder.view',           N'View work orders',                 N'Read work orders, their tasks, parts, labour and sublet lines.'),
    ('fleet.workorder.manage',         N'Manage work orders',               N'Create, plan, assign and edit work orders; put them on hold; record parts and sublet work.'),
    ('fleet.workorder.labor',          N'Record own labour',                N'Clock on and off tasks and record work done — the technician permission.'),
    ('fleet.workorder.approve',        N'Approve work orders',              N'Approve work orders above the cost threshold and customer estimates.'),
    ('fleet.workorder.close',          N'Close and reopen work orders',     N'Complete and close a work order (costs are posted), or reopen a closed one.'),
    -- M6 inspections and defects
    ('fleet.inspection.perform',       N'Perform inspections',              N'Fill in inspection checklists and report defects.'),
    ('fleet.inspection.manage',        N'Manage inspections',               N'Maintain inspection templates and handle defects (raise work, defer, verify repairs).'),
    -- M7 parts and inventory
    ('fleet.inventory.view',           N'View parts and stock',             N'Read items, warehouses, bins, stock balances and the stock ledger.'),
    ('fleet.inventory.manage',         N'Manage parts and warehouses',      N'Maintain items, warehouses, bins and reorder levels.'),
    ('fleet.stock.issue',              N'Issue and transfer stock',         N'Issue parts to work orders, return them, and transfer stock between warehouses.'),
    ('fleet.stock.adjust',             N'Adjust and count stock',           N'Record cycle counts and stock adjustments (damage, write-off).'),
    ('fleet.stock.approve',            N'Approve stock adjustments',        N'Approve stock adjustments above the threshold.'),
    -- M8 procurement
    ('fleet.purchase.view',            N'View procurement',                 N'Read goods requests, purchase orders, receipts and vendor returns.'),
    ('fleet.purchase.request',         N'Raise goods requests',             N'Request parts for a work order or for reorder.'),
    ('fleet.purchase.manage',          N'Manage purchase orders',           N'Create and send purchase orders and vendor returns.'),
    ('fleet.purchase.approve',         N'Approve purchase orders',          N'Approve goods requests and purchase orders above the threshold.'),
    ('fleet.purchase.receive',         N'Receive goods',                    N'Record goods receipts against purchase orders.'),
    -- M9 tyres
    ('fleet.tyre.view',                N'View tyres',                       N'Read tyres, fitments, tyre history and cost per km.'),
    ('fleet.tyre.manage',              N'Manage tyres',                     N'Fit, remove, rotate, repair, recap and scrap tyres; record tread inspections.'),
    -- M10 fuel (analytics and exception approval; the fuel ledger is Trucking)
    ('fleet.fuel.view',                N'View fuel analytics',              N'Read fuel efficiency and fuel exceptions by asset, driver and route.'),
    ('fleet.fuel.approve',             N'Approve fuel exceptions',          N'Approve or reject fills flagged as exceptions (over capacity, too frequent, outside the norm).'),
    -- M11 incidents
    ('fleet.incident.view',            N'View incidents',                   N'Read accidents, insurance claims and traffic violations.'),
    ('fleet.incident.manage',          N'Manage incidents',                 N'Record accidents and traffic violations and prepare insurance claims.'),
    ('fleet.claim.approve',            N'Approve insurance claims',         N'Approve an insurance claim for submission and record its settlement.'),
    -- M12 vendor billing and recharge
    ('fleet.vendorinvoice.view',       N'View vendor invoices',             N'Read vendor invoices, credit notes and ERP export batches.'),
    ('fleet.vendorinvoice.manage',     N'Manage vendor invoices',           N'Enter vendor invoices and credit notes and match them to POs and receipts.'),
    ('fleet.vendorinvoice.approve',    N'Approve vendor invoices',          N'Approve invoices outside the match tolerance.'),
    ('fleet.vendorinvoice.export',     N'Export to accounting',             N'Create ERP export batches (CSV now, SAP Business One later).'),
    ('fleet.recharge.release',         N'Release recharges',                N'Release customer damage invoices to Revenue and subcontractor deductions to Trucking.'),
    -- M13 compliance, M14 cost and reports
    ('fleet.compliance.view',          N'View compliance',                  N'Read document expiry and reminder status for assets and drivers.'),
    ('fleet.cost.view',                N'View asset cost',                  N'Read the asset cost ledger, cost per km and total cost of ownership.'),
    ('fleet.report.view',              N'View fleet reports',               N'Run fleet reports, inquiries and dashboards.')
) AS s (permission_code, display_name, description)
   ON t.permission_code = s.permission_code
WHEN MATCHED THEN UPDATE SET
    module_code = 'FLEET', display_name = s.display_name, description = s.description, is_active = 1
WHEN NOT MATCHED THEN
    INSERT (permission_code, module_code, display_name, description)
    VALUES (s.permission_code, 'FLEET', s.display_name, s.description);
PRINT CONCAT('>> fleet permissions merged: ', @@ROWCOUNT);
GO

-- ============================================================
-- 2. Guard: every fleet.* code belongs to module FLEET
--    (a code filed under another module would escape RequireModule("FLEET")).
-- ============================================================
DECLARE @stray NVARCHAR(MAX) = (
    SELECT STRING_AGG(permission_code + ' (' + module_code + ')', ', ')
    FROM iam.permission WHERE permission_code LIKE 'fleet.%' AND module_code <> 'FLEET');
IF @stray IS NOT NULL
BEGIN
    DECLARE @m NVARCHAR(2048) = N'fleet.* codes filed under another module: ' + @stray;
    THROW 50371, @m, 1;
END
GO

SELECT module_code, COUNT(*) AS permissions, SUM(CAST(is_active AS INT)) AS active
FROM iam.permission WHERE module_code = 'FLEET' GROUP BY module_code;
GO

INSERT INTO dbo.schema_version (script_name, description)
SELECT '37_fleet_permissions.sql', N'43 fleet.* permissions (setup, assets, meters, people, PM, work requests/orders, inspections, inventory, procurement, tyres, fuel, incidents, vendor invoices, recharge, compliance, cost, reports)'
WHERE NOT EXISTS (SELECT 1 FROM dbo.schema_version WHERE script_name = '37_fleet_permissions.sql');
GO

PRINT '>> 37_fleet_permissions.sql completed — run 38 next.';
GO
