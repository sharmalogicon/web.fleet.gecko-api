-- ============================================================
-- GECKO FLEET — ERP (SAP BUSINESS ONE) CONNECTION AND MAPPING (P10)
-- Script: 19_erp.sql
--
--   config.erp_connection   one per tenant and target: the SAP B1 Service Layer URL, company database and
--                           user. The PASSWORD IS NOT STORED: password_ref names a host secret
--                           (configuration key Erp:Secrets:<password_ref>). base_url fake://… = the built-in
--                           simulator (tests, UAT demos). last_payment_sync_at = the payment pull watermark.
--   config.erp_mapping      Gecko code → SAP code: BP (supplier party → CardCode; none = the party code), TAX
--                           (VAT rate, e.g. 7 → a SAP purchase tax code), WHT (WHT rate → WTCode), GL (line kind
--                           GRN_STOCK / GRN_SERVICE / WO_SUBLET / TYRE_EVENT / MANUAL / CREDIT → G/L account).
--   ap.payment              + a filtered unique index so a payment pulled from SAP is recorded once (additive).
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   config.erp_connection
-- @purpose The tenant's ERP (SAP Business One Service Layer) endpoint and login name; the password lives in the host secrets.
-- @vector  (new)
-- @owner   Fleet Finance
-- @flags   T
-- @phase   10
IF OBJECT_ID('config.erp_connection') IS NULL
BEGIN
    CREATE TABLE config.erp_connection (
        erp_connection_id       UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_erp_connection__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        target                  VARCHAR(10)         NOT NULL CONSTRAINT df_erp_connection__target DEFAULT 'SAP_B1',   -- SAP_B1
        base_url                VARCHAR(300)        NOT NULL,   -- https://<host>:50000/b1s/v1 — or fake://<name> (simulator)
        company_db              VARCHAR(100)        NOT NULL,   -- SAP company database
        user_name               VARCHAR(100)        NOT NULL,
        password_ref            VARCHAR(100)        NULL,       -- host secret Erp:Secrets:<ref>; never the password itself
        default_series          INT                 NULL,       -- SAP document series for A/P documents (NULL = SAP's default)
        is_active               BIT                 NOT NULL CONSTRAINT df_erp_connection__active DEFAULT 1,
        last_test_at            DATETIMEOFFSET(7)   NULL,
        last_test_result        NVARCHAR(500)       NULL,
        last_payment_sync_at    DATETIMEOFFSET(7)   NULL,       -- payments pulled up to (watermark)
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_erp_connection__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_erp_connection__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_erp_connection PRIMARY KEY CLUSTERED (erp_connection_id),
        CONSTRAINT ck_erp_connection__target CHECK (target IN ('SAP_B1')),
        CONSTRAINT ck_erp_connection__url CHECK (base_url LIKE 'https://%' OR base_url LIKE 'http://%' OR base_url LIKE 'fake://%')
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_erp_connection__target ON config.erp_connection (tenant_id, target) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'config', @table = 'erp_connection';
END
GO

-- @table   config.erp_mapping
-- @purpose Gecko code → ERP code per kind (business partner, tax code, WHT code, G/L account by line kind).
-- @vector  (new)
-- @owner   Fleet Finance
-- @flags   T
-- @phase   10
IF OBJECT_ID('config.erp_mapping') IS NULL
BEGIN
    CREATE TABLE config.erp_mapping (
        erp_mapping_id          UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_erp_mapping__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        target                  VARCHAR(10)         NOT NULL CONSTRAINT df_erp_mapping__target DEFAULT 'SAP_B1',
        map_type                VARCHAR(10)         NOT NULL,   -- BP, TAX, WHT, GL
        gecko_code              VARCHAR(40)         NOT NULL,   -- party code / rate ("7", "3") / line kind
        erp_code                VARCHAR(50)         NOT NULL,   -- CardCode / TaxCode / WTCode / AccountCode
        description             NVARCHAR(200)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_erp_mapping__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_erp_mapping__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_erp_mapping PRIMARY KEY CLUSTERED (erp_mapping_id),
        CONSTRAINT ck_erp_mapping__target CHECK (target IN ('SAP_B1')),
        CONSTRAINT ck_erp_mapping__type CHECK (map_type IN ('BP','TAX','WHT','GL')),
        CONSTRAINT ck_erp_mapping__code CHECK (gecko_code = UPPER(gecko_code) COLLATE Latin1_General_100_CS_AS)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_erp_mapping__key ON config.erp_mapping (tenant_id, target, map_type, gecko_code) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'config', @table = 'erp_mapping';
END
GO

-- A payment pulled from SAP is recorded once per invoice and SAP reference.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_payment__erp_ref' AND object_id = OBJECT_ID('ap.payment'))
    CREATE UNIQUE NONCLUSTERED INDEX uq_payment__erp_ref ON ap.payment (tenant_id, vendor_invoice_id, payment_ref)
        WHERE source = 'ERP' AND payment_ref IS NOT NULL;
GO

EXEC dbo.usp_record_script '19_erp.sql', N'P10: config.erp_connection, config.erp_mapping (temporal); ap.payment ERP ref index';
GO

IF OBJECT_ID('history.config_erp_connection') IS NULL OR OBJECT_ID('history.config_erp_mapping') IS NULL
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_payment__erp_ref')
    THROW 50000, '19_erp: a table, its history or the payment index is missing.', 1;
GO
PRINT '19_erp.sql completed.';
GO
