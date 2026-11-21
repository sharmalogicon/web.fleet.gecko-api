-- ============================================================
-- GECKO FLEET — ASSET COST LEDGER (P9)
-- Script: 18_cost.sql
--
--   cost.asset_cost_entry     every cost (+) or recovery (−) that lands on an asset, base currency, one
--                             row per change: the API reconciles each source document (work order,
--                             fuel log, tyre event, fine, deduction, insurance settlement, recharge)
--                             against what is already posted and writes the difference. Never
--                             updated: a cancelled source gets an offsetting row.
--   cost.asset_cost_monthly   projection per asset, month and category (dashboards, cost per km,
--                             TCO, the Service Cost Summary); rebuilt from the entries for the months
--                             a sync touched. Rows are updated, never deleted (zero = nothing left).
-- Categories are checked as a FORMAT only (the list grows with new sources).
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   cost.asset_cost_entry
-- @purpose One cost / recovery posted to an asset from a source document (delta rows; the sum per source = its current amount).
-- @vector  (new)
-- @owner   Fleet Finance
-- @flags   A
-- @phase   9
IF OBJECT_ID('cost.asset_cost_entry') IS NULL
BEGIN
    CREATE TABLE cost.asset_cost_entry (
        asset_cost_entry_id     UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_asset_cost_entry__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        asset_code              VARCHAR(30)         NOT NULL,
        cost_date               DATE                NOT NULL,   -- when the cost belongs (WO completed, fuelled, paid, settled …)
        category                VARCHAR(20)         NOT NULL,   -- PM, REPAIR, BREAKDOWN, ACCIDENT, TYRE, FUEL, VIOLATION, RECOVERY, …
        amount                  DECIMAL(18,4)       NOT NULL,   -- base currency; + cost, − recovery; a delta against earlier rows of the same source
        currency_code           CHAR(3)             NOT NULL,   -- the base currency
        source_module           VARCHAR(10)         NOT NULL CONSTRAINT df_asset_cost_entry__module DEFAULT 'FLEET',
        source_doc_type         VARCHAR(20)         NOT NULL,   -- WO, FUEL, TYRE_EVENT, TVN_FINE, TVN_DEDUCT, CLAIM, RECHARGE
        source_doc_id           UNIQUEIDENTIFIER    NOT NULL,
        source_doc_no           VARCHAR(40)         NULL,
        posted_at               DATETIMEOFFSET(7)   NOT NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_asset_cost_entry__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_asset_cost_entry PRIMARY KEY CLUSTERED (asset_cost_entry_id),
        CONSTRAINT ck_asset_cost_entry__category CHECK (category = UPPER(category) COLLATE Latin1_General_100_CS_AS AND category NOT LIKE '%[^A-Z_]%'),
        CONSTRAINT ck_asset_cost_entry__doc_type CHECK (source_doc_type = UPPER(source_doc_type) COLLATE Latin1_General_100_CS_AS AND source_doc_type NOT LIKE '%[^A-Z_]%'),
        CONSTRAINT ck_asset_cost_entry__module CHECK (source_module IN ('FLEET','TRUCKING')),
        CONSTRAINT ck_asset_cost_entry__currency CHECK (currency_code LIKE '[A-Z][A-Z][A-Z]'),
        CONSTRAINT ck_asset_cost_entry__amount CHECK (amount <> 0)
    );
    CREATE NONCLUSTERED INDEX ix_asset_cost_entry__asset ON cost.asset_cost_entry (tenant_id, asset_profile_id, cost_date) INCLUDE (category, amount);
    CREATE NONCLUSTERED INDEX ix_asset_cost_entry__source ON cost.asset_cost_entry (tenant_id, source_doc_type, source_doc_id, category) INCLUDE (amount);
    CREATE NONCLUSTERED INDEX ix_asset_cost_entry__date ON cost.asset_cost_entry (tenant_id, branch_id, cost_date) INCLUDE (category, amount);
    EXEC dbo.usp_make_append_only @schema = 'cost', @table = 'asset_cost_entry';
END
GO

-- @table   cost.asset_cost_monthly
-- @purpose Cost per asset, month and category (projection of cost.asset_cost_entry) for dashboards, cost per km and TCO.
-- @vector  (new)
-- @owner   Fleet Finance
-- @flags   -
-- @phase   9
IF OBJECT_ID('cost.asset_cost_monthly') IS NULL
BEGIN
    CREATE TABLE cost.asset_cost_monthly (
        asset_cost_monthly_id   UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_asset_cost_monthly__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        month_start             DATE                NOT NULL,   -- first day of the month
        category                VARCHAR(20)         NOT NULL,
        amount                  DECIMAL(18,4)       NOT NULL CONSTRAINT df_asset_cost_monthly__amount DEFAULT 0,   -- base currency
        entry_count             INT                 NOT NULL CONSTRAINT df_asset_cost_monthly__count DEFAULT 0,
        refreshed_at            DATETIMEOFFSET(7)   NOT NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_asset_cost_monthly__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_asset_cost_monthly__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_asset_cost_monthly PRIMARY KEY CLUSTERED (asset_cost_monthly_id),
        CONSTRAINT ck_asset_cost_monthly__month CHECK (DAY(month_start) = 1),
        CONSTRAINT ck_asset_cost_monthly__category CHECK (category = UPPER(category) COLLATE Latin1_General_100_CS_AS AND category NOT LIKE '%[^A-Z_]%')
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_asset_cost_monthly__key ON cost.asset_cost_monthly (tenant_id, asset_profile_id, month_start, category) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_asset_cost_monthly__month ON cost.asset_cost_monthly (tenant_id, branch_id, month_start) INCLUDE (asset_profile_id, category, amount);
END
GO

EXEC dbo.usp_record_script '18_cost.sql', N'P9: cost.asset_cost_entry (append-only), cost.asset_cost_monthly (projection)';
GO

IF OBJECT_ID('cost.asset_cost_entry') IS NULL OR OBJECT_ID('cost.asset_cost_monthly') IS NULL
    THROW 50000, '18_cost: a table is missing.', 1;
GO
PRINT '18_cost.sql completed.';
GO
