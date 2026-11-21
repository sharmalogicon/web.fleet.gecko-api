-- ============================================================
-- GECKO MASTER — TRAFFIC FINE CHARGE CODE (Fleet P7)
-- Script: 54_fleet_traffic_fine_charge.sql
--
-- Owner 2026-11-20 (P7 Q6): a traffic fine the company paid is deducted from the
-- driver. For a SUBCON driver the deduction goes to the subcontractor's next
-- Trucking statement (settlement.subcon_deduction_request, the P5 path), which
-- needs a charge code on the line:
--   TRAFFIC_FINE   traffic fine passed on   no VAT, no WHT (a fine is not a supply)
-- One variant (bill_to CUSTOMER, payment term CREDIT, no tax), same shape as 53.
-- Tenants come from gecko_identity entitlements (module FLEET): re-run after a
-- tenant gets FLEET. Idempotent: never changes an existing code / variant.
-- ============================================================

USE gecko_master;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

EXEC sp_set_session_context @key = N'IsSystemContext', @value = 1;
GO

IF DB_ID('gecko_identity') IS NULL
    PRINT '>> gecko_identity not on this server — traffic fine charge code not seeded (run again where it is).';
ELSE
BEGIN
    DROP TABLE IF EXISTS #tenants;
    SELECT DISTINCT e.tenant_id INTO #tenants
    FROM gecko_identity.subscription.entitlement e
    JOIN gecko_identity.tenant.tenant t ON t.tenant_id = e.tenant_id AND t.deleted_at IS NULL AND t.status = 'ACTIVE'
    WHERE e.module_code = 'FLEET' AND e.deleted_at IS NULL AND e.status IN ('TRIAL','ACTIVE','PAST_DUE');
    DECLARE @tenant_count INT = (SELECT COUNT(*) FROM #tenants);
    PRINT CONCAT('>> FLEET tenants: ', @tenant_count);

    INSERT INTO commercial.charge_code (tenant_id, charge_code, description_en, description_local, module_code, charge_type, charge_category, billing_unit_code, is_by_service)
    SELECT tn.tenant_id, 'TRAFFIC_FINE', N'TRAFFIC FINE', N'ค่าปรับจราจร', 'FLEET', 'REPAIR', 'GENERAL', 'LUMP_SUM', 0
    FROM #tenants tn
    WHERE NOT EXISTS (SELECT 1 FROM commercial.charge_code x WHERE x.tenant_id = tn.tenant_id AND x.deleted_at IS NULL AND x.charge_code = 'TRAFFIC_FINE');
    PRINT CONCAT('>> traffic fine charge codes added: ', @@ROWCOUNT);

    INSERT INTO commercial.charge_code_variant (tenant_id, charge_code_id, bill_to, payment_term_code, tax_code_id, withholding_tax_code_id, credit_term_days,
        revenue_gl, cost_gl, legacy_charge_code)
    SELECT cc.tenant_id, cc.charge_code_id, 'CUSTOMER', 'CREDIT', NULL, NULL, 30, NULL, NULL, NULL
    FROM commercial.charge_code cc
    JOIN #tenants tn ON tn.tenant_id = cc.tenant_id
    WHERE cc.deleted_at IS NULL AND cc.module_code = 'FLEET' AND cc.charge_code = 'TRAFFIC_FINE'
      AND NOT EXISTS (SELECT 1 FROM commercial.charge_code_variant v
                      WHERE v.tenant_id = cc.tenant_id AND v.deleted_at IS NULL AND v.charge_code_id = cc.charge_code_id
                        AND v.bill_to = 'CUSTOMER' AND v.payment_term_code = 'CREDIT');
    PRINT CONCAT('>> traffic fine variants added: ', @@ROWCOUNT);
END
GO

EXEC dbo.usp_record_script '54_fleet_traffic_fine_charge.sql', N'Fleet P7: charge code TRAFFIC_FINE (no VAT / WHT, CUSTOMER/CREDIT variant) per FLEET tenant, for subcontractor driver fine deductions';
GO
PRINT '54_fleet_traffic_fine_charge.sql completed.';
GO
