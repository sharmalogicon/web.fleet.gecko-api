-- ============================================================
-- GECKO MASTER — FLEET RECHARGE CHARGE CODES (Fleet P5)
-- Script: 53_fleet_charge_codes.sql
--
-- Charge codes a Fleet work-order recharge is billed with, per FLEET tenant,
-- each with ONE variant (bill_to CUSTOMER, payment term CREDIT):
--   WO_LABOR        workshop labour            VAT7 + WHT3 (a service)
--   WO_PARTS        parts and materials        VAT7, no WHT (goods)
--   WO_SUBLET       outside work passed on     VAT7 + WHT3
--   WO_SUNDRY       shop supplies, call-out    VAT7 + WHT3
--   DAMAGE_RECHARGE damage passed on (claims)  VAT7, no WHT
-- Labour and parts are always separate lines because customers withhold 3 %
-- on services, not on goods (doc 01 §15.2). Tax codes VAT7 / WHT3 must exist
-- for the tenant (gecko_master 08 seeds them); a tenant without them gets
-- the codes with no tax on the variant and a PRINT warning.
-- Tenants come from gecko_identity entitlements (module FLEET): re-run after
-- a tenant gets FLEET. Idempotent: never changes an existing code / variant.
-- ============================================================

USE gecko_master;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

EXEC sp_set_session_context @key = N'IsSystemContext', @value = 1;
GO

IF DB_ID('gecko_identity') IS NULL
    PRINT '>> gecko_identity not on this server — fleet charge codes not seeded (run again where it is).';
ELSE
BEGIN
    DROP TABLE IF EXISTS #codes;
    CREATE TABLE #codes (
        charge_code VARCHAR(15) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY, description_en NVARCHAR(200) COLLATE DATABASE_DEFAULT NOT NULL,
        description_local NVARCHAR(200) COLLATE DATABASE_DEFAULT NULL, billing_unit_code VARCHAR(20) COLLATE DATABASE_DEFAULT NOT NULL,
        wht_code VARCHAR(20) COLLATE DATABASE_DEFAULT NULL);
    INSERT INTO #codes VALUES
        ('WO_LABOR',        N'WORKSHOP LABOUR',            N'ค่าแรงซ่อม',          'PER_HOUR', 'WHT3'),
        ('WO_PARTS',        N'SPARE PARTS AND MATERIALS',  N'ค่าอะไหล่และวัสดุ',     'PER_UNIT', NULL),
        ('WO_SUBLET',       N'OUTSIDE REPAIR WORK',        N'ค่าซ่อมภายนอก',       'LUMP_SUM', 'WHT3'),
        ('WO_SUNDRY',       N'SHOP SUPPLIES AND CALL-OUT', N'ค่าวัสดุสิ้นเปลือง/ออกบริการ', 'LUMP_SUM', 'WHT3'),
        ('DAMAGE_RECHARGE', N'DAMAGE RECHARGE',            N'ค่าเสียหาย',          'LUMP_SUM', NULL);

    DROP TABLE IF EXISTS #tenants;
    SELECT DISTINCT e.tenant_id INTO #tenants
    FROM gecko_identity.subscription.entitlement e
    JOIN gecko_identity.tenant.tenant t ON t.tenant_id = e.tenant_id AND t.deleted_at IS NULL AND t.status = 'ACTIVE'
    WHERE e.module_code = 'FLEET' AND e.deleted_at IS NULL AND e.status IN ('TRIAL','ACTIVE','PAST_DUE');
    DECLARE @tenant_count INT = (SELECT COUNT(*) FROM #tenants);
    PRINT CONCAT('>> FLEET tenants: ', @tenant_count);

    INSERT INTO commercial.charge_code (tenant_id, charge_code, description_en, description_local, module_code, charge_type, charge_category, billing_unit_code, is_by_service)
    SELECT tn.tenant_id, c.charge_code, c.description_en, c.description_local, 'FLEET', 'REPAIR', 'GENERAL', c.billing_unit_code, 0
    FROM #tenants tn CROSS JOIN #codes c
    WHERE NOT EXISTS (SELECT 1 FROM commercial.charge_code x WHERE x.tenant_id = tn.tenant_id AND x.deleted_at IS NULL AND x.charge_code = c.charge_code);
    PRINT CONCAT('>> fleet charge codes added: ', @@ROWCOUNT);

    INSERT INTO commercial.charge_code_variant (tenant_id, charge_code_id, bill_to, payment_term_code, tax_code_id, withholding_tax_code_id, credit_term_days,
        revenue_gl, cost_gl, legacy_charge_code)
    SELECT cc.tenant_id, cc.charge_code_id, 'CUSTOMER', 'CREDIT', vat.tax_code_id, wht.tax_code_id, 30, NULL, NULL, NULL
    FROM commercial.charge_code cc
    JOIN #codes c ON c.charge_code = cc.charge_code
    JOIN #tenants tn ON tn.tenant_id = cc.tenant_id
    OUTER APPLY (SELECT TOP 1 t.tax_code_id FROM commercial.tax_code t
                 WHERE t.tenant_id = cc.tenant_id AND t.tax_code = 'VAT7' AND t.deleted_at IS NULL AND t.is_active = 1) vat
    OUTER APPLY (SELECT TOP 1 t.tax_code_id FROM commercial.tax_code t
                 WHERE t.tenant_id = cc.tenant_id AND t.tax_code = c.wht_code AND t.deleted_at IS NULL AND t.is_active = 1) wht
    WHERE cc.deleted_at IS NULL AND cc.module_code = 'FLEET'
      AND NOT EXISTS (SELECT 1 FROM commercial.charge_code_variant v
                      WHERE v.tenant_id = cc.tenant_id AND v.deleted_at IS NULL AND v.charge_code_id = cc.charge_code_id
                        AND v.bill_to = 'CUSTOMER' AND v.payment_term_code = 'CREDIT');
    PRINT CONCAT('>> fleet charge code variants added: ', @@ROWCOUNT);

    IF EXISTS (SELECT 1 FROM #tenants tn WHERE NOT EXISTS (SELECT 1 FROM commercial.tax_code t WHERE t.tenant_id = tn.tenant_id AND t.tax_code = 'VAT7' AND t.deleted_at IS NULL))
        PRINT '>> WARNING: a FLEET tenant has no VAT7 tax code — its fleet charge variants carry no VAT. Seed the tax codes and fix the variants.';
END
GO

EXEC dbo.usp_record_script '53_fleet_charge_codes.sql', N'Fleet recharge charge codes WO_LABOR / WO_PARTS / WO_SUBLET / WO_SUNDRY / DAMAGE_RECHARGE (+ CUSTOMER/CREDIT variant, VAT7, WHT3 on services) per FLEET tenant';
GO
PRINT '53_fleet_charge_codes.sql completed.';
GO
