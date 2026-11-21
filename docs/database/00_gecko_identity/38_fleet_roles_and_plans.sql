-- ============================================================
-- GECKO IDENTITY — FLEET PLANS, SCT PILOT ENTITLEMENT, ROLE TEMPLATES, GRANTS
-- Script: 38_fleet_roles_and_plans.sql
-- Owner:  Identity & Access
--
-- ROWS ONLY, in existing generic tables:
--   subscription.plan              FLEET STARTER and PROFESSIONAL (none exist yet)
--   subscription.plan_limit        ASSETS and USERS per plan
--   subscription.entitlement       FLEET for the pilot tenant SCT (section 0 parameters)
--   iam.role_template              4 new standard roles (WORKSHOP_SUPERVISOR,
--                                  TECHNICIAN, STOREKEEPER, PURCHASER)
--   iam.role_template_permission   what each new role holds, plus fleet codes
--                                  for the existing FLEET_MANAGER (from 30),
--                                  TENANT_OWNER, OPS_MANAGER, ACCOUNTS, VIEWER
--   iam.role / iam.role_permission backfill for tenants entitled to FLEET
--
-- FLEET_MANAGER EXISTS (30, created for Trucking's vehicles and drivers). Its
-- template row is NOT changed here; it only gains the fleet.* grants, so one
-- person can run both the Trucking fleet screens and the Fleet workshop.
--
-- TECHNICIAN holds work-order labour, inspections and work requests only —
-- the technician app (phase 2) needs nothing more. Like DRIVER in 30, a
-- guard below fails the script if anyone widens it by accident.
--
-- REPAIR TARIFF: WORKSHOP_SUPERVISOR and FLEET_MANAGER get revenue.tariff.view
-- so the Fleet UI can show repair rate cards; editing them stays with the
-- pricing roles (revenue.tariff.manage / .approve).
--
-- BACKFILL RULE (as 30): grants missing on SYSTEM roles are added; a role a
-- tenant created itself is never touched. The 4 new templates are added as
-- roles only to tenants with a live FLEET entitlement (TRIAL / ACTIVE /
-- PAST_DUE). NOTE: 08's usp_provision_tenant copies EVERY active assignable
-- template into every new tenant (the same open question as in 30).
--
-- PRICES ARE PLACEHOLDERS, marked as 07 marks them. Limits are first guesses
-- for review, not commitments.
--
-- Idempotent. Run as sysadmin or a member of gecko_system. Run after 37.
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

IF NOT EXISTS (SELECT 1 FROM dbo.schema_version WHERE script_name = '37_fleet_permissions.sql')
    THROW 50380, 'Run 37_fleet_permissions.sql first.', 1;
GO

-- ============================================================
-- 0. PARAMETERS — REVIEW BEFORE RUNNING
--    The pilot tenant and the branches that get FLEET. SCT1 is the branch
--    that holds the TRUCKING entitlement today. Add a row per workshop branch
--    once SCT confirms how many workshops / stores it runs (open question).
--    A temp table, because variables do not survive GO.
-- ============================================================
DROP TABLE IF EXISTS #pilot;
CREATE TABLE #pilot (
    tenant_code   VARCHAR(30) COLLATE DATABASE_DEFAULT NOT NULL,
    branch_code   VARCHAR(30) COLLATE DATABASE_DEFAULT NOT NULL,
    plan_code     VARCHAR(30) COLLATE DATABASE_DEFAULT NOT NULL,
    trial_days    INT         NOT NULL,   -- TRIAL length; the pilot runs until go-live is fixed at the end of P3
    PRIMARY KEY (tenant_code, branch_code)
);
INSERT INTO #pilot (tenant_code, branch_code, plan_code, trial_days) VALUES
    ('SCT', 'SCT1', 'PROFESSIONAL', 180);
GO

-- iam.role, iam.role_permission and subscription.entitlement are under RLS:
-- system context for the writes below.
EXEC sp_set_session_context @key = N'IsSystemContext', @value = 1;
GO

-- ============================================================
-- 1. Plans and limits (module FLEET)
-- ============================================================
MERGE subscription.[plan] AS t
USING (VALUES
    ('FLEET', 'STARTER',      N'Starter',      N'PLACEHOLDER PRICE - CONFIRM BEFORE QUOTING. Asset register, work orders, PM, inspections, parts stock.',                  1, 400.00,  4000.00, 'THB', 1),
    ('FLEET', 'PROFESSIONAL', N'Professional', N'PLACEHOLDER PRICE - CONFIRM BEFORE QUOTING. Starter + procurement, tyres, incidents and claims, vendor invoices, recharge, TCO.', 2, 900.00,  9000.00, 'THB', 1)
) AS s (module_code, plan_code, display_name, description, tier_level, price_monthly, price_yearly, currency, is_public)
   ON t.module_code = s.module_code AND t.plan_code = s.plan_code AND t.deleted_at IS NULL
WHEN NOT MATCHED THEN
    INSERT (module_code, plan_code, display_name, description, tier_level, price_monthly, price_yearly, currency, is_public)
    VALUES (s.module_code, s.plan_code, s.display_name, s.description, s.tier_level, s.price_monthly, s.price_yearly, s.currency, s.is_public);
PRINT CONCAT('>> fleet plans added: ', @@ROWCOUNT);
GO

-- metric_code is free text (no CHECK); period CHECK is TOTAL / YEAR / MONTH.
-- NULL limit = unlimited (07's convention). ASSETS is a hard limit: one more
-- registered asset past the plan is refused rather than billed.
MERGE subscription.plan_limit AS t
USING (
    SELECT p.plan_id, s.metric_code, s.display_name, s.limit_value, s.period, s.is_hard_limit
    FROM (VALUES
        ('STARTER',      'ASSETS', N'Assets', 50,   'TOTAL', 1),
        ('STARTER',      'USERS',  N'Users',  10,   'MONTH', 0),
        ('PROFESSIONAL', 'ASSETS', N'Assets', 500,  'TOTAL', 1),
        ('PROFESSIONAL', 'USERS',  N'Users',  40,   'MONTH', 0)
    ) AS s (plan_code, metric_code, display_name, limit_value, period, is_hard_limit)
    JOIN subscription.[plan] p ON p.module_code = 'FLEET' AND p.plan_code = s.plan_code AND p.deleted_at IS NULL
) AS s
   ON t.plan_id = s.plan_id AND t.metric_code = s.metric_code AND t.deleted_at IS NULL
WHEN NOT MATCHED THEN
    INSERT (plan_id, metric_code, display_name, limit_value, period, is_hard_limit)
    VALUES (s.plan_id, s.metric_code, s.display_name, s.limit_value, s.period, s.is_hard_limit);
PRINT CONCAT('>> fleet plan limits added: ', @@ROWCOUNT);
GO

IF (SELECT COUNT(*) FROM subscription.plan_limit l JOIN subscription.[plan] p ON p.plan_id = l.plan_id
    WHERE p.module_code = 'FLEET' AND l.deleted_at IS NULL AND l.metric_code = 'ASSETS') < 2
    THROW 50381, 'A FLEET plan is missing its ASSETS limit.', 1;
GO

-- ============================================================
-- 2. Pilot entitlement (branch-scoped, as TOS / TRUCKING are)
--    Fails loudly if the tenant or a branch is not found, rather than
--    silently entitling nobody.
-- ============================================================
DECLARE @missing NVARCHAR(MAX) = (
    SELECT STRING_AGG(pl.tenant_code + '/' + pl.branch_code, ', ')
    FROM #pilot pl
    WHERE NOT EXISTS (
        SELECT 1 FROM tenant.tenant tn
        JOIN tenant.branch b ON b.tenant_id = tn.tenant_id AND b.deleted_at IS NULL AND b.is_active = 1
        WHERE tn.tenant_code = pl.tenant_code AND tn.deleted_at IS NULL AND b.branch_code = pl.branch_code));
IF @missing IS NOT NULL
BEGIN
    DECLARE @m NVARCHAR(2048) = N'Pilot tenant/branch not found or inactive: ' + @missing + N'. Fix section 0.';
    THROW 50382, @m, 1;
END

DECLARE @now DATETIMEOFFSET(7) = SYSUTCDATETIME() AT TIME ZONE 'UTC';

INSERT INTO subscription.entitlement (tenant_id, branch_id, module_code, plan_id, status, billing_cycle, trial_ends_at, notes, created_at, updated_at)
SELECT tn.tenant_id, b.branch_id, 'FLEET', p.plan_id, 'TRIAL', 'MONTHLY', DATEADD(DAY, pl.trial_days, @now),
       N'Fleet pilot (P0). Go-live date fixed at the end of P3.', @now, @now
FROM #pilot pl
JOIN tenant.tenant tn ON tn.tenant_code = pl.tenant_code AND tn.deleted_at IS NULL
JOIN tenant.branch b  ON b.tenant_id = tn.tenant_id AND b.branch_code = pl.branch_code AND b.deleted_at IS NULL
JOIN subscription.[plan] p ON p.module_code = 'FLEET' AND p.plan_code = pl.plan_code AND p.deleted_at IS NULL
WHERE NOT EXISTS (SELECT 1 FROM subscription.entitlement e
                  WHERE e.tenant_id = tn.tenant_id AND e.branch_id = b.branch_id
                    AND e.module_code = 'FLEET' AND e.deleted_at IS NULL);
PRINT CONCAT('>> fleet pilot entitlements added: ', @@ROWCOUNT);
GO

-- ============================================================
-- 3. Role templates (the 4 new ones; FLEET_MANAGER is left as 30 made it)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM iam.role_template WHERE role_code = 'FLEET_MANAGER' AND is_active = 1)
    THROW 50383, 'FLEET_MANAGER template is missing — run 30_trucking_roles_and_plans.sql first.', 1;
GO

MERGE iam.role_template AS t
USING (VALUES
    ('WORKSHOP_SUPERVISOR', N'Workshop Supervisor', N'Runs the workshop: approves work requests, plans and closes work orders, PM, inspections and defects.', 0, 1, 36),
    ('STOREKEEPER',         N'Storekeeper',         N'Parts store: items, receipts, issues to work orders, transfers and stock counts.',                     0, 1, 62),
    ('PURCHASER',           N'Purchaser',           N'Buys parts and services: purchase orders, vendor returns and vendor invoices.',                        0, 1, 63),
    ('TECHNICIAN',          N'Technician',          N'Workshop app: records own labour on assigned work orders, inspections and defects.',                   0, 1, 81)
) AS s (role_code, display_name, description, is_tenant_admin, is_assignable, sort_order)
   ON t.role_code = s.role_code
WHEN MATCHED THEN UPDATE SET
    display_name = s.display_name, description = s.description, is_tenant_admin = s.is_tenant_admin,
    is_assignable = s.is_assignable, sort_order = s.sort_order, is_active = 1
WHEN NOT MATCHED THEN
    INSERT (role_code, display_name, description, is_tenant_admin, is_assignable, sort_order)
    VALUES (s.role_code, s.display_name, s.description, s.is_tenant_admin, s.is_assignable, s.sort_order);
PRINT CONCAT('>> fleet role templates merged: ', @@ROWCOUNT);
GO

-- ============================================================
-- 4. Template grants. Kept in a temp table so section 6 backfills exactly these pairs.
-- ============================================================
DROP TABLE IF EXISTS #grants;
-- COLLATE DATABASE_DEFAULT: temp tables otherwise take the server collation and clash with the database's UTF-8 columns.
CREATE TABLE #grants (role_code VARCHAR(40) COLLATE DATABASE_DEFAULT NOT NULL, permission_code VARCHAR(80) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (role_code, permission_code));

-- FLEET_MANAGER: every active fleet code (runs the module), plus a view of repair tariffs.
INSERT INTO #grants (role_code, permission_code)
SELECT 'FLEET_MANAGER', p.permission_code FROM iam.permission p
WHERE p.module_code = 'FLEET' AND p.is_active = 1;
INSERT INTO #grants (role_code, permission_code) VALUES ('FLEET_MANAGER', 'revenue.tariff.view');

INSERT INTO #grants (role_code, permission_code) VALUES
    -- WORKSHOP_SUPERVISOR
    ('WORKSHOP_SUPERVISOR', 'fleet.asset.view'), ('WORKSHOP_SUPERVISOR', 'fleet.meter.record'), ('WORKSHOP_SUPERVISOR', 'fleet.meter.override'),
    ('WORKSHOP_SUPERVISOR', 'fleet.people.view'),
    ('WORKSHOP_SUPERVISOR', 'fleet.pm.view'), ('WORKSHOP_SUPERVISOR', 'fleet.pm.manage'),
    ('WORKSHOP_SUPERVISOR', 'fleet.workrequest.create'), ('WORKSHOP_SUPERVISOR', 'fleet.workrequest.approve'),
    ('WORKSHOP_SUPERVISOR', 'fleet.workorder.view'), ('WORKSHOP_SUPERVISOR', 'fleet.workorder.manage'), ('WORKSHOP_SUPERVISOR', 'fleet.workorder.labor'),
    ('WORKSHOP_SUPERVISOR', 'fleet.workorder.approve'), ('WORKSHOP_SUPERVISOR', 'fleet.workorder.close'),
    ('WORKSHOP_SUPERVISOR', 'fleet.inspection.perform'), ('WORKSHOP_SUPERVISOR', 'fleet.inspection.manage'),
    ('WORKSHOP_SUPERVISOR', 'fleet.inventory.view'), ('WORKSHOP_SUPERVISOR', 'fleet.stock.issue'),
    ('WORKSHOP_SUPERVISOR', 'fleet.purchase.view'), ('WORKSHOP_SUPERVISOR', 'fleet.purchase.request'),
    ('WORKSHOP_SUPERVISOR', 'fleet.tyre.view'), ('WORKSHOP_SUPERVISOR', 'fleet.tyre.manage'),
    ('WORKSHOP_SUPERVISOR', 'fleet.incident.view'), ('WORKSHOP_SUPERVISOR', 'fleet.compliance.view'),
    ('WORKSHOP_SUPERVISOR', 'fleet.cost.view'), ('WORKSHOP_SUPERVISOR', 'fleet.report.view'),
    ('WORKSHOP_SUPERVISOR', 'revenue.tariff.view'),
    -- TECHNICIAN (guarded in section 5)
    ('TECHNICIAN', 'fleet.workorder.labor'), ('TECHNICIAN', 'fleet.inspection.perform'), ('TECHNICIAN', 'fleet.workrequest.create'),
    -- STOREKEEPER
    ('STOREKEEPER', 'fleet.asset.view'), ('STOREKEEPER', 'fleet.workorder.view'),
    ('STOREKEEPER', 'fleet.inventory.view'), ('STOREKEEPER', 'fleet.inventory.manage'),
    ('STOREKEEPER', 'fleet.stock.issue'), ('STOREKEEPER', 'fleet.stock.adjust'),
    ('STOREKEEPER', 'fleet.purchase.view'), ('STOREKEEPER', 'fleet.purchase.request'), ('STOREKEEPER', 'fleet.purchase.receive'),
    ('STOREKEEPER', 'fleet.tyre.view'), ('STOREKEEPER', 'fleet.report.view'),
    -- PURCHASER
    ('PURCHASER', 'fleet.asset.view'), ('PURCHASER', 'fleet.workorder.view'), ('PURCHASER', 'fleet.inventory.view'),
    ('PURCHASER', 'fleet.purchase.view'), ('PURCHASER', 'fleet.purchase.request'), ('PURCHASER', 'fleet.purchase.manage'),
    ('PURCHASER', 'fleet.vendorinvoice.view'), ('PURCHASER', 'fleet.vendorinvoice.manage'),
    ('PURCHASER', 'fleet.report.view'),
    -- ACCOUNTS (existing): vendor invoices, export, recharge, cost
    ('ACCOUNTS', 'fleet.purchase.view'), ('ACCOUNTS', 'fleet.vendorinvoice.view'), ('ACCOUNTS', 'fleet.vendorinvoice.manage'),
    ('ACCOUNTS', 'fleet.vendorinvoice.approve'), ('ACCOUNTS', 'fleet.vendorinvoice.export'), ('ACCOUNTS', 'fleet.recharge.release'),
    ('ACCOUNTS', 'fleet.incident.view'), ('ACCOUNTS', 'fleet.cost.view'), ('ACCOUNTS', 'fleet.report.view');

-- TENANT_OWNER: every active fleet code (07's "owner holds everything").
INSERT INTO #grants (role_code, permission_code)
SELECT 'TENANT_OWNER', p.permission_code FROM iam.permission p
WHERE p.module_code = 'FLEET' AND p.is_active = 1;

-- OPS_MANAGER: every active fleet code except setup (numbering and approval
-- chains are an owner / fleet-manager decision).
INSERT INTO #grants (role_code, permission_code)
SELECT 'OPS_MANAGER', p.permission_code FROM iam.permission p
WHERE p.module_code = 'FLEET' AND p.is_active = 1 AND p.permission_code <> 'fleet.setup.manage';

-- VIEWER: every fleet *.view code (07's rule).
INSERT INTO #grants (role_code, permission_code)
SELECT 'VIEWER', p.permission_code FROM iam.permission p
WHERE p.module_code = 'FLEET' AND p.is_active = 1 AND p.permission_code LIKE '%.view';

-- Guard before writing: every code exists and is active; every role is a template.
DECLARE @bad NVARCHAR(MAX) = (
    SELECT STRING_AGG(g.role_code + ' -> ' + g.permission_code, ', ')
    FROM #grants g
    WHERE NOT EXISTS (SELECT 1 FROM iam.permission p WHERE p.permission_code = g.permission_code AND p.is_active = 1)
       OR NOT EXISTS (SELECT 1 FROM iam.role_template rt WHERE rt.role_code = g.role_code AND rt.is_active = 1));
IF @bad IS NOT NULL
BEGIN
    DECLARE @m NVARCHAR(2048) = N'Unknown role or inactive permission in the fleet grants: ' + @bad;
    THROW 50384, @m, 1;
END

MERGE iam.role_template_permission AS t
USING #grants AS s
   ON t.role_code = s.role_code AND t.permission_code = s.permission_code
WHEN NOT MATCHED THEN
    INSERT (role_code, permission_code) VALUES (s.role_code, s.permission_code);
PRINT CONCAT('>> fleet template grants added: ', @@ROWCOUNT);

-- ============================================================
-- 5. Guards on the result
-- ============================================================
DECLARE @wide NVARCHAR(MAX) = (
    SELECT STRING_AGG(rtp.permission_code, ', ') FROM iam.role_template_permission rtp
    WHERE rtp.role_code = 'TECHNICIAN'
      AND rtp.permission_code NOT IN ('fleet.workorder.labor', 'fleet.inspection.perform', 'fleet.workrequest.create'));
IF @wide IS NOT NULL
BEGIN
    DECLARE @m2 NVARCHAR(2048) = N'TECHNICIAN must hold only labour, inspection and work-request codes; it also holds: ' + @wide;
    THROW 50385, @m2, 1;
END

DECLARE @setup NVARCHAR(MAX) = (
    SELECT STRING_AGG(role_code, ', ') FROM iam.role_template_permission
    WHERE permission_code = 'fleet.setup.manage' AND role_code NOT IN ('TENANT_OWNER', 'FLEET_MANAGER'));
IF @setup IS NOT NULL
BEGIN
    DECLARE @m3 NVARCHAR(2048) = N'fleet.setup.manage is templated to ' + @setup + N' — numbering and approval chains are owner / fleet-manager only. Confirm and update this guard.';
    THROW 50386, @m3, 1;
END

-- ============================================================
-- 6. Backfill tenants entitled to FLEET
--    a) the new system roles; b) the missing grants on system roles.
-- ============================================================
DECLARE @now DATETIMEOFFSET(7) = SYSUTCDATETIME() AT TIME ZONE 'UTC';

INSERT INTO iam.role (tenant_id, role_code, display_name, description, is_system, is_tenant_admin, created_at, updated_at)
SELECT DISTINCT e.tenant_id, rt.role_code, rt.display_name, rt.description, 1, rt.is_tenant_admin, @now, @now
FROM subscription.entitlement e
JOIN tenant.tenant tn ON tn.tenant_id = e.tenant_id AND tn.deleted_at IS NULL
CROSS JOIN iam.role_template rt
WHERE e.module_code = 'FLEET' AND e.deleted_at IS NULL AND e.status IN ('TRIAL','ACTIVE','PAST_DUE')
  AND rt.role_code IN ('FLEET_MANAGER','WORKSHOP_SUPERVISOR','STOREKEEPER','PURCHASER','TECHNICIAN')
  AND rt.is_active = 1 AND rt.is_assignable = 1
  AND NOT EXISTS (SELECT 1 FROM iam.role r WHERE r.tenant_id = e.tenant_id AND r.role_code = rt.role_code AND r.deleted_at IS NULL);
PRINT CONCAT('>> fleet roles added to entitled tenants: ', @@ROWCOUNT);

INSERT INTO iam.role_permission (tenant_id, role_id, permission_code, created_at)
SELECT r.tenant_id, r.role_id, g.permission_code, @now
FROM iam.role r
JOIN #grants g ON g.role_code = r.role_code
WHERE r.deleted_at IS NULL
  AND r.is_system = 1
  AND NOT EXISTS (SELECT 1 FROM iam.role_permission rp
                  WHERE rp.role_id = r.role_id AND rp.permission_code = g.permission_code AND rp.deleted_at IS NULL);
PRINT CONCAT('>> fleet grants backfilled on system roles: ', @@ROWCOUNT);
GO

EXEC sp_set_session_context @key = N'IsSystemContext', @value = 0;
GO

-- Report
SELECT rt.role_code, COUNT(rtp.permission_code) AS fleet_template_permissions
FROM iam.role_template rt
LEFT JOIN iam.role_template_permission rtp ON rtp.role_code = rt.role_code AND rtp.permission_code LIKE 'fleet.%'
WHERE rt.role_code IN ('FLEET_MANAGER','WORKSHOP_SUPERVISOR','STOREKEEPER','PURCHASER','TECHNICIAN','TENANT_OWNER','OPS_MANAGER','ACCOUNTS','VIEWER')
GROUP BY rt.role_code ORDER BY rt.role_code;
GO

INSERT INTO dbo.schema_version (script_name, description)
SELECT '38_fleet_roles_and_plans.sql', N'FLEET STARTER/PROFESSIONAL plans + ASSETS/USERS limits, SCT pilot entitlement, 4 fleet role templates + grants (and fleet codes for fleet manager/owner/ops/accounts/viewer), backfill for FLEET-entitled tenants'
WHERE NOT EXISTS (SELECT 1 FROM dbo.schema_version WHERE script_name = '38_fleet_roles_and_plans.sql');
GO

PRINT '>> 38_fleet_roles_and_plans.sql completed.';
GO
