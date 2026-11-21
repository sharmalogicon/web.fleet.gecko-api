-- ============================================================
-- GECKO MASTER DATA — SUPPLIER ROLE (Fleet P1, plan doc 02 / doc 03)
-- Script: 01_gecko_master/51_supplier_extension.sql   (written by the Fleet
-- backend session; runs through FLEET_RUN on gecko_master)
--
-- Gecko had no vendor role. Fleet buys parts and tyres, sends work to outside
-- workshops (sublet), pays towing and insurers; P4 (purchase orders), P7
-- (claims) and P8 (vendor invoices) all need "this party is a supplier".
-- Same pattern as the haulier / forwarder roles: one row in party.party, one
-- ROLE row per extension table. A party can hold several roles at once (a
-- subcontractor is haulier + supplier + recharge bill-to).
--
--   1. lookup SUPPLIER_CATEGORY — open code list (tenants may add values),
--      owning module MDM: PARTS, TYRE, REPAIR_SUBCON, FUEL, INSURER, TOWING,
--      TRANSPORT, SERVICES.
--   2. party.supplier_extension — the supplier role: categories, payment terms,
--      withholding tax, lead time, minimum order, ERP (SAP B1) business-partner
--      code, rating, and the vendor status APPROVED / ON_HOLD / BLOCKED.
--
-- System versioning and the RLS predicates are added HERE for this table only.
-- gecko_master's generic 11_temporal_history.sql / 10_rls_policy.sql are NOT
-- re-run: locally 11 would also version audit.* / equipment.container_renumber,
-- which their owners keep unversioned. Additive only. Idempotent.
-- Run as sysadmin (lookup.* is read-only for the application logins).
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

-- ------------------------------------------------------------
-- 1. SUPPLIER_CATEGORY code list
-- ------------------------------------------------------------
MERGE lookup.code_list_category AS t
USING (VALUES
    ('SUPPLIER_CATEGORY', N'What a supplier provides (parts, tyres, outside repair, fuel, insurance, towing ...)', 'MDM', 1, NULL)
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
    ('SUPPLIER_CATEGORY', 'PARTS',         N'Spare parts and consumables',            NULL, 10),
    ('SUPPLIER_CATEGORY', 'TYRE',          N'Tyres and retreading (recap)',           NULL, 20),
    ('SUPPLIER_CATEGORY', 'REPAIR_SUBCON', N'Outside workshop / sublet repair',       NULL, 30),
    ('SUPPLIER_CATEGORY', 'FUEL',          N'Fuel and lubricants',                    NULL, 40),
    ('SUPPLIER_CATEGORY', 'INSURER',       N'Insurance company',                      NULL, 50),
    ('SUPPLIER_CATEGORY', 'TOWING',        N'Towing and recovery',                    NULL, 60),
    ('SUPPLIER_CATEGORY', 'TRANSPORT',     N'Transport / haulage subcontractor',      NULL, 70),
    ('SUPPLIER_CATEGORY', 'SERVICES',      N'Other services (calibration, cleaning, inspection ...)', NULL, 80)
) AS s (category_code, code, description_en, iso_code, sort_order)
   ON t.category_code = s.category_code AND t.code = s.code
WHEN MATCHED THEN UPDATE SET
    description_en = s.description_en, iso_code = s.iso_code, sort_order = s.sort_order, is_active = 1
WHEN NOT MATCHED THEN
    INSERT (category_code, code, description_en, iso_code, sort_order)
    VALUES (s.category_code, s.code, s.description_en, s.iso_code, s.sort_order);
PRINT CONCAT('>> SUPPLIER_CATEGORY starting values merged: ', @@ROWCOUNT);
GO

-- ------------------------------------------------------------
-- 2. party.supplier_extension
-- ------------------------------------------------------------
IF OBJECT_ID('party.supplier_extension') IS NULL
    CREATE TABLE party.supplier_extension (
        party_id            UNIQUEIDENTIFIER    NOT NULL,   -- one role row per party
        tenant_id           UNIQUEIDENTIFIER    NOT NULL,
        supplier_categories VARCHAR(200)        NULL,       -- comma list of SUPPLIER_CATEGORY codes, e.g. PARTS,TYRE
        payment_term_code   VARCHAR(20)         NULL,       -- soft ref -> lookup.payment_term (CASH, CREDIT ...)
        credit_term_days    SMALLINT            NULL,       -- days we have to pay their invoices
        withholding_tax_code VARCHAR(20)        NULL,       -- soft ref -> commercial.tax_code (tax_type = WITHHOLDING), deducted when paying
        lead_time_days      SMALLINT            NULL,       -- usual days from order to delivery (reorder planning)
        min_order_amount    DECIMAL(19,4)       NULL,       -- smallest order they accept
        min_order_currency  CHAR(3)             NULL,       -- currency of the above
        erp_bp_code         VARCHAR(30)         NULL,       -- accounting / SAP Business One business-partner code (vendor)
        rating              TINYINT             NULL,       -- 1 (poor) .. 5 (excellent), set by purchasing
        supplier_status     VARCHAR(20)         NOT NULL CONSTRAINT df_supplier_ext__status DEFAULT 'APPROVED',   -- APPROVED, ON_HOLD (no new orders), BLOCKED (nothing)
        status_reason       NVARCHAR(200)       NULL,       -- why ON_HOLD / BLOCKED
        created_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_supplier_ext__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by          UNIQUEIDENTIFIER    NULL,
        updated_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_supplier_ext__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by          UNIQUEIDENTIFIER    NULL,
        deleted_at          DATETIMEOFFSET(7)   NULL,
        deleted_by          UNIQUEIDENTIFIER    NULL,
        row_version         ROWVERSION          NOT NULL,
        CONSTRAINT pk_supplier_extension PRIMARY KEY CLUSTERED (party_id),
        CONSTRAINT ck_supplier_ext__status CHECK (supplier_status IN ('APPROVED','ON_HOLD','BLOCKED')),
        CONSTRAINT ck_supplier_ext__categories CHECK (supplier_categories IS NULL
            OR (supplier_categories = UPPER(supplier_categories) COLLATE Latin1_General_100_CS_AS AND supplier_categories NOT LIKE '%[^A-Z0-9_,]%')),
        CONSTRAINT ck_supplier_ext__min_order CHECK ((min_order_amount IS NULL AND min_order_currency IS NULL)
            OR (min_order_amount IS NOT NULL AND min_order_amount >= 0 AND min_order_currency LIKE '[A-Z][A-Z][A-Z]')),
        CONSTRAINT ck_supplier_ext__days CHECK ((credit_term_days IS NULL OR credit_term_days >= 0) AND (lead_time_days IS NULL OR lead_time_days >= 0)),
        CONSTRAINT ck_supplier_ext__rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
    );
GO

-- System versioning, the same way 11_temporal_history.sql does it (hidden period columns), for this table only.
IF OBJECTPROPERTY(OBJECT_ID('party.supplier_extension'), 'TableTemporalType') = 0
BEGIN
    ALTER TABLE party.supplier_extension ADD
        sys_valid_from DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL
            CONSTRAINT df_party_supplier_extension__sys_valid_from DEFAULT SYSUTCDATETIME(),
        sys_valid_to   DATETIME2(7) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL
            CONSTRAINT df_party_supplier_extension__sys_valid_to DEFAULT CONVERT(DATETIME2(7), '9999-12-31 23:59:59.9999999'),
        PERIOD FOR SYSTEM_TIME (sys_valid_from, sys_valid_to);
    ALTER TABLE party.supplier_extension SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = history.party_supplier_extension, DATA_CONSISTENCY_CHECK = ON));
    PRINT '>> system versioning enabled on party.supplier_extension -> history.party_supplier_extension';
END
GO

-- RLS: the same three predicates every party table has (10_rls_policy.sql), added only when missing. The policy is never dropped.
IF NOT EXISTS (SELECT 1 FROM sys.security_predicates WHERE target_object_id = OBJECT_ID('party.supplier_extension'))
    ALTER SECURITY POLICY dbo.tenant_isolation_policy
        ADD FILTER PREDICATE dbo.fn_tenant_security_predicate(tenant_id) ON party.supplier_extension,
        ADD BLOCK PREDICATE dbo.fn_tenant_security_predicate(tenant_id) ON party.supplier_extension AFTER INSERT,
        ADD BLOCK PREDICATE dbo.fn_tenant_security_predicate(tenant_id) ON party.supplier_extension AFTER UPDATE;
GO

-- Guard
IF OBJECTPROPERTY(OBJECT_ID('party.supplier_extension'), 'TableTemporalType') <> 2
    OR (SELECT COUNT(*) FROM sys.security_predicates WHERE target_object_id = OBJECT_ID('party.supplier_extension')) <> 3
    OR (SELECT COUNT(*) FROM lookup.code_list_value WHERE category_code = 'SUPPLIER_CATEGORY') < 8
    THROW 50000, '51_supplier_extension: versioning, RLS predicates or code list incomplete.', 1;
GO
EXEC dbo.usp_record_script '51_supplier_extension.sql', N'Fleet P1: SUPPLIER role (party.supplier_extension, versioned, RLS) + SUPPLIER_CATEGORY code list';
GO
PRINT '>> 51_supplier_extension.sql completed.';
GO
