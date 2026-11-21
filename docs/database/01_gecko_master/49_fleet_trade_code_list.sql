-- ============================================================
-- GECKO MASTER DATA — FLEET TRADE CODE LIST (P1)
-- Script: 49_fleet_trade_code_list.sql
--
-- The workshop trades a fleet labour cost rate is set per (gecko_fleet
-- config.labor_cost_rate.trade_code) and, from P1 on, a technician's skills.
-- The Fleet setup endpoints refuse a trade code that is not in this list.
--
-- OPEN list (allows_tenant_values = 1): a tenant may add its own trades
-- (e.g. REEFER_TECH) as tenant rows in config.code_list_value. The global
-- starting set below is what any Thai truck workshop recognises.
--
-- Other fleet code lists (asset category, item category, tyre brand/size,
-- accident type ...) are added by the phase that first needs them.
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
    ('FLEET_TRADE', N'Workshop trade of a technician / labour cost rate (mechanic, electrician, tyre fitter ...)', 'FLEET', 1, NULL)
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
    ('FLEET_TRADE', 'MECHANIC',      N'Mechanic (engine, drivetrain, brakes)', NULL, 10),
    ('FLEET_TRADE', 'ELECTRICIAN',   N'Auto electrician',                      NULL, 20),
    ('FLEET_TRADE', 'TYRE_FITTER',   N'Tyre fitter',                           NULL, 30),
    ('FLEET_TRADE', 'BODY_SHOP',     N'Body and paint',                        NULL, 40),
    ('FLEET_TRADE', 'WELDER',        N'Welder / fabricator (chassis, trailer)', NULL, 50),
    ('FLEET_TRADE', 'AIR_CON',       N'Air-conditioning technician',            NULL, 60),
    ('FLEET_TRADE', 'HELPER',        N'Workshop helper',                        NULL, 70),
    ('FLEET_TRADE', 'INSPECTOR',     N'Inspector / quality check',              NULL, 80)
) AS s (category_code, code, description_en, iso_code, sort_order)
   ON t.category_code = s.category_code AND t.code = s.code
WHEN MATCHED THEN UPDATE SET
    description_en = s.description_en, iso_code = s.iso_code, sort_order = s.sort_order, is_active = 1
WHEN NOT MATCHED THEN
    INSERT (category_code, code, description_en, iso_code, sort_order)
    VALUES (s.category_code, s.code, s.description_en, s.iso_code, s.sort_order);
PRINT CONCAT('>> FLEET_TRADE starting values merged: ', @@ROWCOUNT);
GO

SELECT category_code, COUNT(*) AS global_values
FROM lookup.code_list_value
WHERE category_code = 'FLEET_TRADE'
GROUP BY category_code;
GO

EXEC dbo.usp_record_script '49_fleet_trade_code_list.sql', N'Fleet P1: FLEET_TRADE open code list (owning module FLEET) + 8 global starting trades';
GO

PRINT '>> 49_fleet_trade_code_list.sql completed.';
GO
