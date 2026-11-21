-- ============================================================
-- GECKO MASTER DATA — FLEET SERVICE + ITEM CATEGORY CODE LISTS (Fleet P1)
-- Script: 01_gecko_master/52_fleet_service_item_code_lists.sql
--
-- Two open code lists (tenants may add values), owning module FLEET:
--   FLEET_SERVICE_CATEGORY — category of a service task (maint.service_task).
--     Starting values = the categories the existing Service Types screen offers
--     (owner 2026-11-19: the back end adapts to the screens).
--   FLEET_ITEM_CATEGORY    — category of a part / stock item (inv.item).
-- Same shape as 49_fleet_trade_code_list.sql. Idempotent. Run as sysadmin.
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
    ('FLEET_SERVICE_CATEGORY', N'Category of a fleet service task (engine, brakes, tyres, PM, inspection ...)', 'FLEET', 1, NULL),
    ('FLEET_ITEM_CATEGORY',    N'Category of a fleet part / stock item (filters, brake parts, lubricants ...)',  'FLEET', 1, NULL)
) AS s (category_code, description_en, owning_module, allows_tenant_values, legacy_vector_category)
   ON t.category_code = s.category_code
WHEN MATCHED THEN UPDATE SET
    description_en = s.description_en, owning_module = s.owning_module,
    allows_tenant_values = s.allows_tenant_values, legacy_vector_category = s.legacy_vector_category, is_active = 1
WHEN NOT MATCHED THEN
    INSERT (category_code, description_en, owning_module, allows_tenant_values, legacy_vector_category)
    VALUES (s.category_code, s.description_en, s.owning_module, s.allows_tenant_values, s.legacy_vector_category);
GO

MERGE lookup.code_list_value AS t
USING (VALUES
    ('FLEET_SERVICE_CATEGORY', 'ENGINE',       N'Engine',                         NULL, 10),
    ('FLEET_SERVICE_CATEGORY', 'TRANSMISSION', N'Transmission and drivetrain',    NULL, 20),
    ('FLEET_SERVICE_CATEGORY', 'BRAKE',        N'Brakes',                         NULL, 30),
    ('FLEET_SERVICE_CATEGORY', 'TYRE',         N'Tyres',                          NULL, 40),
    ('FLEET_SERVICE_CATEGORY', 'ELECTRICAL',   N'Electrical',                     NULL, 50),
    ('FLEET_SERVICE_CATEGORY', 'BODY',         N'Body and paint',                 NULL, 60),
    ('FLEET_SERVICE_CATEGORY', 'PM',           N'Preventive maintenance',         NULL, 70),
    ('FLEET_SERVICE_CATEGORY', 'INSPECTION',   N'Inspection',                     NULL, 80),
    ('FLEET_ITEM_CATEGORY',    'ENGINE_PART',  N'Engine parts',                   NULL, 10),
    ('FLEET_ITEM_CATEGORY',    'FILTER',       N'Filters',                        NULL, 20),
    ('FLEET_ITEM_CATEGORY',    'BRAKE_PART',   N'Brake parts',                    NULL, 30),
    ('FLEET_ITEM_CATEGORY',    'ELECTRICAL',   N'Electrical parts and batteries', NULL, 40),
    ('FLEET_ITEM_CATEGORY',    'BODY_PART',    N'Body parts',                     NULL, 50),
    ('FLEET_ITEM_CATEGORY',    'TYRE',         N'Tyres and tubes',                NULL, 60),
    ('FLEET_ITEM_CATEGORY',    'LUBRICANT',    N'Oils and lubricants',            NULL, 70),
    ('FLEET_ITEM_CATEGORY',    'CONSUMABLE',   N'Consumables',                    NULL, 80),
    ('FLEET_ITEM_CATEGORY',    'TOOL',         N'Tools',                          NULL, 90)
) AS s (category_code, code, description_en, iso_code, sort_order)
   ON t.category_code = s.category_code AND t.code = s.code
WHEN MATCHED THEN UPDATE SET
    description_en = s.description_en, iso_code = s.iso_code, sort_order = s.sort_order, is_active = 1
WHEN NOT MATCHED THEN
    INSERT (category_code, code, description_en, iso_code, sort_order)
    VALUES (s.category_code, s.code, s.description_en, s.iso_code, s.sort_order);
PRINT CONCAT('>> fleet service / item category values merged: ', @@ROWCOUNT);
GO

IF (SELECT COUNT(*) FROM lookup.code_list_value WHERE category_code IN ('FLEET_SERVICE_CATEGORY','FLEET_ITEM_CATEGORY')) < 17
    THROW 50402, '52_fleet_service_item_code_lists: starting values missing.', 1;
GO
EXEC dbo.usp_record_script '52_fleet_service_item_code_lists.sql', N'Fleet P1: FLEET_SERVICE_CATEGORY (8, from the Service Types screen) + FLEET_ITEM_CATEGORY (9) open code lists';
GO
PRINT '>> 52_fleet_service_item_code_lists.sql completed.';
GO
