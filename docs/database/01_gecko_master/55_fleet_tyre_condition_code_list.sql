-- ============================================================
-- GECKO MASTER DATA — FLEET TYRE CONDITION CODE LIST (Fleet backend item #1)
-- Script: 01_gecko_master/55_fleet_tyre_condition_code_list.sql
--
-- FLEET_TYRE_CONDITION: the condition of a tyre at registration / inspection / removal (owner answer 13 Q6: a code list,
-- not a fixed GOOD/FAIR/POOR). Starting values = the UI session's proposal (ui-prompts/replies/13_tyre_condition_seed.sql):
-- an overall grade plus the usual removal findings. OPEN list (allows_tenant_values = 1): a tenant may add its own.
-- The Fleet tyre endpoints refuse a code that is not in this list (global or the tenant's).
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
    ('FLEET_TYRE_CONDITION', N'Condition of a fleet tyre at registration / inspection (overall grade and common damage findings)', 'FLEET', 1, NULL)
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
    ('FLEET_TYRE_CONDITION', 'NEW',             N'New, never fitted',                    NULL,  10),
    ('FLEET_TYRE_CONDITION', 'GOOD',            N'Good - serviceable',                   NULL,  20),
    ('FLEET_TYRE_CONDITION', 'FAIR',            N'Fair - serviceable, monitor',          NULL,  30),
    ('FLEET_TYRE_CONDITION', 'WORN',            N'Worn - near the pull-out tread depth', NULL,  40),
    ('FLEET_TYRE_CONDITION', 'IRREGULAR_WEAR',  N'Irregular / uneven wear',              NULL,  50),
    ('FLEET_TYRE_CONDITION', 'CUT',             N'Cut or chip in the tread',             NULL,  60),
    ('FLEET_TYRE_CONDITION', 'PUNCTURED',       N'Puncture',                             NULL,  70),
    ('FLEET_TYRE_CONDITION', 'SIDEWALL_DAMAGE', N'Sidewall damage',                      NULL,  80),
    ('FLEET_TYRE_CONDITION', 'BULGE',           N'Bulge / blister',                      NULL,  90),
    ('FLEET_TYRE_CONDITION', 'SEPARATION',      N'Tread or ply separation',              NULL, 100),
    ('FLEET_TYRE_CONDITION', 'BEAD_DAMAGE',     N'Bead damage',                          NULL, 110),
    ('FLEET_TYRE_CONDITION', 'CRACKED',         N'Weather / ozone cracking',             NULL, 120),
    ('FLEET_TYRE_CONDITION', 'POOR',            N'Poor - unserviceable, remove',         NULL, 130),
    ('FLEET_TYRE_CONDITION', 'SCRAP',           N'Scrap - not repairable or recappable', NULL, 140)
) AS s (category_code, code, description_en, iso_code, sort_order)
   ON t.category_code = s.category_code AND t.code = s.code
WHEN MATCHED THEN UPDATE SET
    description_en = s.description_en, iso_code = s.iso_code, sort_order = s.sort_order, is_active = 1
WHEN NOT MATCHED THEN
    INSERT (category_code, code, description_en, iso_code, sort_order)
    VALUES (s.category_code, s.code, s.description_en, s.iso_code, s.sort_order);
PRINT CONCAT('>> FLEET_TYRE_CONDITION starting values merged: ', @@ROWCOUNT);
GO

IF (SELECT COUNT(*) FROM lookup.code_list_value WHERE category_code = 'FLEET_TYRE_CONDITION' AND is_active = 1) < 14
    THROW 50402, '55_fleet_tyre_condition_code_list: starting values missing.', 1;
GO

EXEC dbo.usp_record_script '55_fleet_tyre_condition_code_list.sql', N'Fleet #1: FLEET_TYRE_CONDITION open code list (owning module FLEET) + 14 global starting values';
GO

PRINT '>> 55_fleet_tyre_condition_code_list.sql completed.';
GO
