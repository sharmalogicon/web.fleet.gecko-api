-- ============================================================
-- GECKO MASTER DATA — FLEET ASSET CATEGORY CODE LIST (P1)
-- Script: 50_fleet_asset_category_code_list.sql
--
-- The tenant's own grouping of fleet assets (gecko_fleet
-- asset.asset_profile.asset_category_code), e.g. the legacy DMS's Thai
-- equipment categories. The maintenance CLASS (prime mover, forklift ...) is a
-- fixed Fleet list; the CATEGORY is free for each tenant, so this category has
-- NO global values: tenants add theirs as config.code_list_value rows
-- (Platform API /api/master/code-lists/FLEET_ASSET_CATEGORY).
--
-- Idempotent. Safe to re-run. Run as sysadmin (lookup.* is read-only to
-- both application logins).
-- ============================================================

USE gecko_master;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

SET NOCOUNT ON;
GO

IF NOT (IS_SRVROLEMEMBER('sysadmin') = 1)
BEGIN
    RAISERROR('Run as sysadmin. lookup.* is read-only for both application logins.', 16, 1);
    SET NOEXEC ON;
END
GO

IF NOT EXISTS (SELECT 1 FROM lookup.module WHERE module_code = 'FLEET' AND is_active = 1)
    THROW 50400, 'FLEET is not in lookup.module — run 13_module_vocabulary.sql first.', 1;
GO

MERGE lookup.code_list_category AS t
USING (VALUES
    ('FLEET_ASSET_CATEGORY', N'Tenant''s own grouping of fleet assets (any categories the tenant uses; no global values)', 'FLEET', 1, NULL)
) AS s (category_code, description_en, owning_module, allows_tenant_values, legacy_vector_category)
   ON t.category_code = s.category_code
WHEN MATCHED THEN UPDATE SET
    description_en = s.description_en, owning_module = s.owning_module,
    allows_tenant_values = s.allows_tenant_values, legacy_vector_category = s.legacy_vector_category, is_active = 1
WHEN NOT MATCHED THEN
    INSERT (category_code, description_en, owning_module, allows_tenant_values, legacy_vector_category)
    VALUES (s.category_code, s.description_en, s.owning_module, s.allows_tenant_values, s.legacy_vector_category);
PRINT CONCAT('>> FLEET_ASSET_CATEGORY category merged: ', @@ROWCOUNT);
GO

EXEC dbo.usp_record_script '50_fleet_asset_category_code_list.sql', N'Fleet P1: FLEET_ASSET_CATEGORY open code list (owning module FLEET), tenant values only';
GO

PRINT '>> 50_fleet_asset_category_code_list.sql completed.';
GO
