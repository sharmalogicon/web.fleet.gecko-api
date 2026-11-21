-- ============================================================
-- GECKO IDENTITY — SUPPLIER PERMISSIONS (Fleet P1, vendor role)
-- Script: 00_gecko_identity/39_supplier_permissions.sql   (written by the Fleet
-- backend session; runs through FLEET_RUN on gecko_identity)
--
-- gecko_master gets a SUPPLIER party role (01_gecko_master/51). Managing
-- suppliers is a purchasing job; mdm.party.manage would also let a purchaser edit
-- customers' credit terms. So suppliers get their own two codes (module MDM),
-- used by the Platform API's /api/master/suppliers:
--   mdm.supplier.view    read suppliers and their terms
--   mdm.supplier.manage  register suppliers, edit their terms / status
--
-- Templates: TENANT_OWNER, OPS_MANAGER, FLEET_MANAGER, PURCHASER → view + manage;
-- WORKSHOP_SUPERVISOR, STOREKEEPER, ACCOUNTS, VIEWER → view. Existing system
-- roles of every tenant are backfilled (only roles that already exist).
-- Idempotent. Run as sysadmin or a member of gecko_system.
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

IF NOT EXISTS (SELECT 1 FROM lookup.module WHERE module_code = 'MDM' AND is_active = 1)
    THROW 50390, 'MDM is not an active row of lookup.module.', 1;
GO

MERGE iam.permission AS t
USING (VALUES
    ('mdm.supplier.view',   N'View suppliers',   N'Read suppliers (parties with the SUPPLIER role), their categories, terms and status.'),
    ('mdm.supplier.manage', N'Manage suppliers', N'Register suppliers and maintain their categories, payment terms, ERP code, rating and approval status.')
) AS s (permission_code, display_name, description)
   ON t.permission_code = s.permission_code
WHEN MATCHED THEN UPDATE SET
    module_code = 'MDM', display_name = s.display_name, description = s.description, is_active = 1
WHEN NOT MATCHED THEN
    INSERT (permission_code, module_code, display_name, description)
    VALUES (s.permission_code, 'MDM', s.display_name, s.description);
PRINT CONCAT('>> supplier permissions merged: ', @@ROWCOUNT);
GO

IF OBJECT_ID('tempdb..#grants') IS NOT NULL DROP TABLE #grants;
CREATE TABLE #grants (role_code VARCHAR(40) COLLATE DATABASE_DEFAULT NOT NULL, permission_code VARCHAR(80) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (role_code, permission_code));
INSERT INTO #grants (role_code, permission_code)
SELECT r.role_code, p.code
FROM (VALUES ('TENANT_OWNER'), ('OPS_MANAGER'), ('FLEET_MANAGER'), ('PURCHASER')) AS r (role_code)
CROSS JOIN (VALUES ('mdm.supplier.view'), ('mdm.supplier.manage')) AS p (code)
UNION ALL
SELECT r.role_code, 'mdm.supplier.view'
FROM (VALUES ('WORKSHOP_SUPERVISOR'), ('STOREKEEPER'), ('ACCOUNTS'), ('VIEWER')) AS r (role_code);

-- Only templates that exist (a database without the Fleet templates still gets the platform ones).
DELETE g FROM #grants g WHERE NOT EXISTS (SELECT 1 FROM iam.role_template rt WHERE rt.role_code = g.role_code AND rt.is_active = 1);

MERGE iam.role_template_permission AS t
USING #grants AS s
   ON t.role_code = s.role_code AND t.permission_code = s.permission_code
WHEN NOT MATCHED THEN
    INSERT (role_code, permission_code) VALUES (s.role_code, s.permission_code);
PRINT CONCAT('>> supplier template grants added: ', @@ROWCOUNT);

EXEC sp_set_session_context @key = N'IsSystemContext', @value = 1;
DECLARE @now DATETIMEOFFSET(7) = SYSUTCDATETIME() AT TIME ZONE 'UTC';
INSERT INTO iam.role_permission (tenant_id, role_id, permission_code, created_at)
SELECT r.tenant_id, r.role_id, g.permission_code, @now
FROM iam.role r
JOIN #grants g ON g.role_code = r.role_code
WHERE r.deleted_at IS NULL
  AND r.is_system = 1
  AND NOT EXISTS (SELECT 1 FROM iam.role_permission rp
                  WHERE rp.role_id = r.role_id AND rp.permission_code = g.permission_code AND rp.deleted_at IS NULL);
PRINT CONCAT('>> supplier grants backfilled on system roles: ', @@ROWCOUNT);
EXEC sp_set_session_context @key = N'IsSystemContext', @value = 0;
GO

-- Guard
IF (SELECT COUNT(*) FROM iam.permission WHERE permission_code IN ('mdm.supplier.view','mdm.supplier.manage') AND is_active = 1) <> 2
    OR NOT EXISTS (SELECT 1 FROM iam.role_template_permission WHERE role_code = 'TENANT_OWNER' AND permission_code = 'mdm.supplier.manage')
    THROW 50391, '39_supplier_permissions: permissions or owner grant missing.', 1;
GO

INSERT INTO dbo.schema_version (script_name, description)
SELECT '39_supplier_permissions.sql', N'mdm.supplier.view / mdm.supplier.manage (SUPPLIER party role) + template grants + backfill on system roles'
WHERE NOT EXISTS (SELECT 1 FROM dbo.schema_version WHERE script_name = '39_supplier_permissions.sql');
GO
PRINT '>> 39_supplier_permissions.sql completed.';
GO
