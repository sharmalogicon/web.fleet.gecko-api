-- ============================================================
-- GECKO FLEET — DATABASE, SCHEMAS, ROLES, VERSION TABLE, MONTHLY PARTITIONS
-- Script: 00_create_database.sql
--
-- The Fleet context: maintenance of every asset a tenant runs (trucks,
-- chassis, forklifts, reach stackers, gensets, light vehicles, tools) —
-- work requests and work orders, preventive maintenance, inspections and
-- defects, parts stock, procurement, tyres, accidents and claims, vendor
-- invoices (AP-lite) and the cost of each asset.
--
-- Fleet is sold as its own module (decision Q3/Q7), so it keeps its OWN asset
-- and driver register. Trucking stays the owner of its vehicles, chassis and
-- drivers: Fleet holds a linked, read-only copy (id + code pair), refreshed by
-- the trucking.vehicle/chassis/driver.changed events. Fuel stays in Trucking.
-- Parties, UoM, currency, tax, charge codes and code lists stay in
-- gecko_master; tenants, branches and users in gecko_identity; repair tariffs
-- and customer recharge invoices in gecko_revenue.
--
-- Design: docs/backend-analysis/02_Gecko_Fleet_Database_Design.docx (v0.2),
-- house rules: web.trucking.gecko-api/docs/database/CONVENTIONS.md.
--
-- SCHEMAS
--   config.*    number series, settings, approval policies, labour cost rates
--   asset.*     asset register, axle layouts, meter readings
--   people.*    drivers (own + linked), technicians, devices
--   maint.*     service library, PM programmes, work requests, work orders
--   insp.*      inspection templates, inspections, defects
--   inv.*       items, warehouses, stock ledger and balances, stock documents
--   purch.*     goods requests, purchase orders, goods receipts, vendor returns
--               (not 'proc': PROC is a reserved word in T-SQL)
--   tyre.*      tyres, fitments and tyre events
--   incident.*  accidents, insurance claims, traffic violations
--   ap.*        vendor invoices, credit notes, ERP export batches
--   cost.*      asset cost ledger and monthly projection
--   doc.*       attachment metadata (files live in blob storage)
--   sec.*       branch grants replicated from identity (if needed)
--   audit.*     activity ledger (append-only)
--   outbox.*    transactional outbox (what Fleet publishes)
--   inbox.*     idempotent consumer log (what Fleet has handled)
--   history.*   temporal history tables (written only by the engine)
--   archive.*   copies of closed, old aggregates
--   rpt.*       reporting views
--
-- HOUSE CONVENTIONS — identical to every other gecko_* database
--  1. NO FOREIGN KEYS. Anywhere. Ever. References are soft: an id column
--     (plus the code beside it when the row lives in another database).
--     Integrity comes from tenant_id on every row, filtered unique indexes,
--     CHECK constraints, the Fleet command handlers, soft delete only
--     (DENY DELETE) and the generated orphan check (92).
--  2. Every unique rule is a filtered unique index (deleted_at IS NULL),
--     leading with tenant_id.
--  3. DATETIMEOFFSET(7) defaulted (SYSUTCDATETIME() AT TIME ZONE 'UTC') —
--     never SYSDATETIMEOFFSET(): servers do not all run at UTC.
--  4. Money DECIMAL(18,4) with currency_code CHAR(3) beside it.
--  5. Fail-closed row-level security on SESSION_CONTEXT('TenantId') (91).
--  6. Every script idempotent and self-recording in dbo.schema_version.
--  7. Append-only, high-volume tables (asset.meter_reading, inv.stock_ledger,
--     audit.activity) are partitioned monthly on pf_month.
--
-- Run as the deploying admin (sysadmin / db_owner). Idempotent.
-- ============================================================

USE master;
GO

IF DB_ID('gecko_fleet') IS NULL
BEGIN
    PRINT '>> Creating database gecko_fleet...';
    EXEC('CREATE DATABASE gecko_fleet COLLATE Latin1_General_100_CI_AS_SC_UTF8');
END
ELSE
    PRINT '>> Database gecko_fleet already exists.';
GO

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF (SELECT is_read_committed_snapshot_on FROM sys.databases WHERE name = 'gecko_fleet') = 0
BEGIN
    -- The workshop board and the stock screens read all day while technicians
    -- and storekeepers post; readers must not block writers.
    ALTER DATABASE gecko_fleet SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
    PRINT '>> READ_COMMITTED_SNAPSHOT enabled.';
END
GO

-- Temporal history retention (24 months) only runs when this is ON.
-- It is ON by default; set explicitly so a restored copy cannot surprise us.
IF (SELECT is_temporal_history_retention_enabled FROM sys.databases WHERE name = 'gecko_fleet') = 0
    ALTER DATABASE gecko_fleet SET TEMPORAL_HISTORY_RETENTION ON;
GO

-- ------------------------------------------------------------
-- Schemas (all of them now, so 01 can grant them once; tables arrive per phase)
-- ------------------------------------------------------------
IF SCHEMA_ID('config')   IS NULL EXEC('CREATE SCHEMA config');
IF SCHEMA_ID('asset')    IS NULL EXEC('CREATE SCHEMA asset');
IF SCHEMA_ID('people')   IS NULL EXEC('CREATE SCHEMA people');
IF SCHEMA_ID('maint')    IS NULL EXEC('CREATE SCHEMA maint');
IF SCHEMA_ID('insp')     IS NULL EXEC('CREATE SCHEMA insp');
IF SCHEMA_ID('inv')      IS NULL EXEC('CREATE SCHEMA inv');
IF SCHEMA_ID('purch')    IS NULL EXEC('CREATE SCHEMA purch');
IF SCHEMA_ID('tyre')     IS NULL EXEC('CREATE SCHEMA tyre');
IF SCHEMA_ID('incident') IS NULL EXEC('CREATE SCHEMA incident');
IF SCHEMA_ID('ap')       IS NULL EXEC('CREATE SCHEMA ap');
IF SCHEMA_ID('cost')     IS NULL EXEC('CREATE SCHEMA cost');
IF SCHEMA_ID('doc')      IS NULL EXEC('CREATE SCHEMA doc');
IF SCHEMA_ID('sec')      IS NULL EXEC('CREATE SCHEMA sec');
IF SCHEMA_ID('audit')    IS NULL EXEC('CREATE SCHEMA audit');
IF SCHEMA_ID('outbox')   IS NULL EXEC('CREATE SCHEMA outbox');
IF SCHEMA_ID('inbox')    IS NULL EXEC('CREATE SCHEMA inbox');
IF SCHEMA_ID('history')  IS NULL EXEC('CREATE SCHEMA history');
IF SCHEMA_ID('archive')  IS NULL EXEC('CREATE SCHEMA archive');
IF SCHEMA_ID('rpt')      IS NULL EXEC('CREATE SCHEMA rpt');
GO

-- ------------------------------------------------------------
-- Roles. Members are added in 01 once the server logins are known to exist.
-- ------------------------------------------------------------
IF DATABASE_PRINCIPAL_ID('gecko_app')    IS NULL CREATE ROLE gecko_app;
IF DATABASE_PRINCIPAL_ID('gecko_system') IS NULL CREATE ROLE gecko_system;
GO

-- ------------------------------------------------------------
-- Script ledger — same shape as every other gecko_* database
-- ------------------------------------------------------------
IF OBJECT_ID('dbo.schema_version') IS NULL
BEGIN
    CREATE TABLE dbo.schema_version (
        version_id    INT IDENTITY(1,1)  NOT NULL,
        script_name   VARCHAR(200)       NOT NULL,
        description   NVARCHAR(400)      NULL,
        applied_at    DATETIMEOFFSET(7)  NOT NULL CONSTRAINT df_schema_version__applied_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        applied_by    NVARCHAR(128)      NOT NULL CONSTRAINT df_schema_version__applied_by DEFAULT (SUSER_SNAME()),
        CONSTRAINT pk_schema_version PRIMARY KEY CLUSTERED (version_id)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_schema_version__script ON dbo.schema_version (script_name);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_record_script
    @script_name VARCHAR(200),
    @description NVARCHAR(400)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.schema_version WHERE script_name = @script_name)
        INSERT INTO dbo.schema_version (script_name, description) VALUES (@script_name, @description);
END
GO

-- ------------------------------------------------------------
-- Monthly partitioning for append-only, high-volume tables
-- (asset.meter_reading, inv.stock_ledger, audit.activity).
--
-- RANGE RIGHT: each boundary is the FIRST instant of a month (UTC), so a row
-- stamped exactly at midnight on the 1st belongs to the new month.
-- 36 boundaries, 2026-01-01 .. 2028-12-01. Opening balances dated before
-- 2026 land in partition 1; rows after 2028-12 in the last one, until the
-- monthly maintenance job SPLITs the next month in ahead of time.
-- Same function and scheme names as gecko_trucking (CONVENTIONS §5).
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.partition_functions WHERE name = 'pf_month')
BEGIN
    DECLARE @values NVARCHAR(MAX) = N'';
    DECLARE @d DATE = '2026-01-01';
    WHILE @d <= '2028-12-01'
    BEGIN
        SET @values = @values + CASE WHEN @values = N'' THEN N'' ELSE N', ' END
                    + N'''' + CONVERT(NVARCHAR(10), @d, 23) + N'T00:00:00.0000000+00:00''';
        SET @d = DATEADD(MONTH, 1, @d);
    END
    EXEC(N'CREATE PARTITION FUNCTION pf_month (DATETIMEOFFSET(7)) AS RANGE RIGHT FOR VALUES (' + @values + N');');
    PRINT '>> Partition function pf_month created (36 monthly boundaries).';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.partition_schemes WHERE name = 'ps_month')
BEGIN
    CREATE PARTITION SCHEME ps_month AS PARTITION pf_month ALL TO ([PRIMARY]);
    PRINT '>> Partition scheme ps_month created.';
END
GO

DECLARE @boundaries INT = (SELECT fanout - 1 FROM sys.partition_functions WHERE name = 'pf_month');
IF @boundaries < 36
    THROW 50001, 'pf_month has fewer than 36 monthly boundaries.', 1;
GO

EXEC dbo.usp_record_script '00_create_database.sql', N'Database gecko_fleet (UTF-8, RCSI), all fleet schemas, roles, schema_version, pf_month/ps_month monthly 2026-01..2028-12';
GO

PRINT '>> 00_create_database.sql completed.';
GO
