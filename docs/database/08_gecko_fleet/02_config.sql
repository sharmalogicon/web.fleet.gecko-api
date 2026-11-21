-- ============================================================
-- GECKO FLEET — CONFIGURATION (tenant-editable fleet setup)
-- Script: 02_config.sql
--
-- What a tenant sets up once and then rarely changes: how fleet documents are
-- numbered, fleet settings, who must approve which document above which
-- amount, and the internal cost of an hour of workshop labour per trade.
--
-- Replaces, from the legacy DMS:
--   Utility.DocumentNumberHeader / Utility.usp_GenerateDocumentNumber -> number_series / number_series_counter / usp_next_number
--   hard-coded values in procedures and screens                       -> fleet_setting
--   IsApproved / ApprovedBy / ApprovedOn flags only                   -> approval_policy
--   Master.ChargePrice (cost side)                                    -> labor_cost_rate
--   (SELL rates for labour are the gecko_revenue repair tariff, not here.)
--
-- The @vector tag names the legacy DMS source (the tag keeps its name so the
-- platform's doc parser reads Fleet scripts unchanged).
--
-- WHY CODE COLUMNS USE A FORMAT CHECK, NOT A VALUE LIST
-- gecko_trucking lists its series codes in a CHECK (TRK_ORDER, ...). Fleet
-- adds document types phase by phase (P1..P11), and the additive-only rule
-- forbids changing a CHECK once the table is deployed. So series_code,
-- document_type and setting_code get a FORMAT check here (prefix, upper case,
-- A-Z 0-9 _), and the Fleet module validates the value against its catalogue.
-- Structural enums that will never grow (reset period, date format, value
-- type) keep a closed value list, as everywhere else.
--
-- Default rows for a tenant (its number series and settings) are written by
-- the Fleet setup service when the FLEET module is enabled for that tenant —
-- not by this script — so a tenant created next year gets them the same way
-- as one created today. 17_seed_reference.sql holds the default catalogue.
--
-- Temporal (flag T) on every table except the counter: "what was the rule on
-- the day this PO was approved" must be answerable.
-- Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Known series codes (validated by the Fleet module; doc 02 §4):
--   FLT_WR   work request            FLT_WO   work order
--   FLT_GRQ  goods request           FLT_PO   purchase order
--   FLT_GRN  goods receipt           FLT_RTV  return to vendor
--   FLT_ISS  stock issue             FLT_ADJ  stock adjustment
--   FLT_TRF  stock transfer          FLT_CNT  stock count
--   FLT_TCH  tyre change             FLT_TMN  tyre maintenance
--   FLT_INS  inspection              FLT_ACC  accident report
--   FLT_CLM  insurance claim         FLT_VIN  vendor invoice
--   FLT_VCN  vendor credit note

-- @table   config.number_series
-- @purpose How one kind of fleet document is numbered (work order, PO, GRN, claim...): prefix, date part, reset period, length, and whether gaps are allowed.
-- @vector  Utility.DocumentNumberHeader (fleet document types)
-- @owner   Fleet Setup
-- @flags   T
-- @phase   0
IF OBJECT_ID('config.number_series') IS NULL
BEGIN
    CREATE TABLE config.number_series (
        number_series_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_number_series__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NULL,       -- NULL = the tenant-wide definition; set = an override for one branch
        series_code             VARCHAR(30)         NOT NULL,   -- which document: FLT_WO, FLT_PO, FLT_GRN... (catalogue above)
        description             NVARCHAR(200)       NULL,       -- what the series is for, shown on the setup screen
        prefix                  VARCHAR(20)         NULL,       -- fixed text at the start, e.g. WO, PO, GRN
        separator               VARCHAR(2)          NOT NULL CONSTRAINT df_number_series__separator DEFAULT '-',   -- character between the parts, '' for none
        include_branch_code     BIT                 NOT NULL CONSTRAINT df_number_series__include_branch DEFAULT 1,   -- 1 = branch code printed in the number
        count_per_branch        BIT                 NOT NULL CONSTRAINT df_number_series__count_per_branch DEFAULT 1,   -- 1 = each branch has its own running counter
        date_part_format        VARCHAR(10)         NOT NULL CONSTRAINT df_number_series__date_part DEFAULT 'YYMM',   -- date printed in the number: NONE, YYYY, YY, YYYYMM, YYMM
        reset_period            VARCHAR(10)         NOT NULL CONSTRAINT df_number_series__reset DEFAULT 'MONTHLY',   -- when the counter restarts: NEVER, YEARLY, MONTHLY
        number_length           TINYINT             NOT NULL CONSTRAINT df_number_series__length DEFAULT 5,   -- digits of the running number, zero-padded
        start_number            BIGINT              NOT NULL CONSTRAINT df_number_series__start DEFAULT 1,   -- first number after a reset
        is_gap_free_required    BIT                 NOT NULL CONSTRAINT df_number_series__gap_free DEFAULT 0,   -- 1 = no number may ever be skipped (vendor invoices, credit notes if auditors need it)
        is_active               BIT                 NOT NULL CONSTRAINT df_number_series__is_active DEFAULT 1,   -- 0 = series switched off; new documents of this kind cannot be numbered
        legacy_ref              VARCHAR(80)         NULL,       -- legacy key, e.g. DocumentNumberHeader:240|Fleet\WONo
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_number_series__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_number_series__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_number_series PRIMARY KEY CLUSTERED (number_series_id),
        -- Format only (see header): FLT_ prefix, upper case, letters, digits and underscore.
        CONSTRAINT ck_number_series__code CHECK (series_code LIKE 'FLT[_]%' AND series_code = UPPER(series_code) COLLATE Latin1_General_100_CS_AS AND series_code NOT LIKE '%[^A-Z0-9_]%'),
        CONSTRAINT ck_number_series__date_part CHECK (date_part_format IN ('NONE','YYYY','YY','YYYYMM','YYMM')),
        CONSTRAINT ck_number_series__reset CHECK (reset_period IN ('NEVER','YEARLY','MONTHLY')),
        -- A counter that resets must print the period, or two documents would share a number.
        CONSTRAINT ck_number_series__reset_needs_date CHECK (
            reset_period = 'NEVER'
            OR (reset_period = 'YEARLY'  AND date_part_format <> 'NONE')
            OR (reset_period = 'MONTHLY' AND date_part_format IN ('YYYYMM','YYMM'))),
        -- Printing the branch but counting tenant-wide gives WO-BKK-00001, WO-LCB-00002.
        -- Printed and counted must agree (the gecko_revenue 12 lesson).
        CONSTRAINT ck_number_series__branch_counted CHECK (include_branch_code = 0 OR count_per_branch = 1),
        CONSTRAINT ck_number_series__length CHECK (number_length BETWEEN 3 AND 15),
        CONSTRAINT ck_number_series__start CHECK (start_number >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_number_series__branch
        ON config.number_series (tenant_id, branch_id, series_code) WHERE branch_id IS NOT NULL AND deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_number_series__tenant
        ON config.number_series (tenant_id, series_code) WHERE branch_id IS NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'config', @table = 'number_series';
END
GO

-- Deliberately NOT the standard shape (same as gecko_trucking 03 and
-- gecko_revenue 12): a natural composite key and no AUDIT block. This row is
-- locked and bumped on every document save; a GUID key, soft delete and
-- row_version add nothing but bytes and history noise, and it is never
-- deleted (a counter that goes away would hand out numbers again).

-- @table   config.number_series_counter
-- @purpose The last number issued for one series, per branch and per period. One small hot row per (series, branch, month or year).
-- @vector  Utility.DocumentNumberDetail (one column per month — unpivoted here into one row per period)
-- @owner   Fleet Setup
-- @flags   -
-- @phase   0
IF OBJECT_ID('config.number_series_counter') IS NULL
BEGIN
    CREATE TABLE config.number_series_counter (
        number_series_id    UNIQUEIDENTIFIER    NOT NULL,   -- ref config.number_series: the series this counter belongs to
        branch_code         VARCHAR(30)         NOT NULL,   -- branch counted, '' when the series counts tenant-wide
        period_key          VARCHAR(6)          NOT NULL,   -- 'ALL' (never resets), 'YYYY' or 'YYYYMM' in the BRANCH's local calendar
        tenant_id           UNIQUEIDENTIFIER    NOT NULL,   -- copied from the series so RLS covers the counter
        last_number         BIGINT              NOT NULL,   -- the last number handed out in this period
        updated_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_number_series_counter__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),   -- when the last number was taken
        CONSTRAINT pk_number_series_counter PRIMARY KEY CLUSTERED (number_series_id, branch_code, period_key),
        CONSTRAINT ck_number_series_counter__positive CHECK (last_number >= 0),
        CONSTRAINT ck_number_series_counter__period CHECK (period_key = 'ALL' OR period_key LIKE '[12][0-9][0-9][0-9]' OR period_key LIKE '[12][0-9][0-9][0-9][01][0-9]')
    );
    CREATE NONCLUSTERED INDEX ix_number_series_counter__tenant
        ON config.number_series_counter (tenant_id, number_series_id);
END
GO

-- ------------------------------------------------------------
-- config.usp_next_number — the ONLY way a fleet document gets its number.
-- Same body as gecko_trucking config.usp_next_number, so the shared C#
-- numbering service calls both the same way.
--
-- Replaces the legacy read-then-write on DocumentNumberDetail, which handed
-- the same number to two users saving at the same moment. Here the counter
-- row is read and bumped in ONE UPDATE under UPDLOCK + HOLDLOCK, so two
-- sessions can never get the same number.
--
-- GAP-FREE SEMANTICS
--   is_gap_free_required = 1 (vendor invoices / credit notes, if the
--     tenant's auditors need it): the caller MUST call this inside the
--     transaction that inserts the document; the procedure refuses to run
--     otherwise. A rollback undoes the bump, so the number is reused — no gap.
--     A document that is later CANCELLED keeps its number for ever.
--   is_gap_free_required = 0 (work orders, requests, POs, GRNs...):
--     the caller takes the number in its own short transaction. A save that
--     fails afterwards leaves a skipped number, which is acceptable for
--     operational documents.
--
-- The period is the BRANCH's local month: C# passes @at already converted to
-- branch time (00:30 on 1 Nov in Bangkok is 31 Oct in UTC and must be a
-- November number).
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE config.usp_next_number
    @series_code    VARCHAR(30),
    @branch_id      UNIQUEIDENTIFIER = NULL,
    @branch_code    VARCHAR(30) = NULL,
    @at             DATETIMEOFFSET(7) = NULL,   -- branch-local document time
    @number         NVARCHAR(60) OUTPUT,
    @tenant_id      UNIQUEIDENTIFIER = NULL     -- REQUIRED under system context, ignored otherwise
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @series_id UNIQUEIDENTIFIER, @series_tenant_id UNIQUEIDENTIFIER, @prefix VARCHAR(20), @sep VARCHAR(2),
            @with_branch BIT, @per_branch BIT, @date_fmt VARCHAR(10), @reset VARCHAR(10), @len TINYINT,
            @start BIGINT, @gap_free BIT;

    IF CAST(SESSION_CONTEXT(N'IsSystemContext') AS BIT) = 1 AND @tenant_id IS NULL
        THROW 50024, 'Under system context @tenant_id is required.', 1;
    IF ISNULL(CAST(SESSION_CONTEXT(N'IsSystemContext') AS BIT), 0) = 0
        SET @tenant_id = NULL;   -- a tenant session is already scoped by RLS

    -- A branch override wins over the tenant-wide definition.
    SELECT TOP (1)
           @series_id = number_series_id, @series_tenant_id = tenant_id, @prefix = prefix, @sep = separator,
           @with_branch = include_branch_code, @per_branch = count_per_branch, @date_fmt = date_part_format,
           @reset = reset_period, @len = number_length, @start = start_number, @gap_free = is_gap_free_required
    FROM config.number_series
    WHERE series_code = @series_code AND is_active = 1 AND deleted_at IS NULL
      AND (@tenant_id IS NULL OR tenant_id = @tenant_id)
      AND (branch_id = @branch_id OR branch_id IS NULL)
    ORDER BY CASE WHEN branch_id IS NULL THEN 1 ELSE 0 END;

    IF @series_id IS NULL
        THROW 50020, 'No active number series for this code (or it belongs to another tenant).', 1;
    IF @per_branch = 1 AND NULLIF(@branch_code, '') IS NULL
        THROW 50021, 'This number series is counted per branch; @branch_code is required.', 1;
    IF @gap_free = 1 AND @@TRANCOUNT = 0
        THROW 50023, 'A gap-free series must be numbered inside the transaction that writes the document.', 1;

    SET @at = ISNULL(@at, SYSUTCDATETIME() AT TIME ZONE 'UTC');
    DECLARE @period VARCHAR(6) = CASE @reset
        WHEN 'YEARLY'  THEN FORMAT(@at, 'yyyy')
        WHEN 'MONTHLY' THEN FORMAT(@at, 'yyyyMM')
        ELSE 'ALL' END;
    DECLARE @counter_branch VARCHAR(30) = CASE WHEN @per_branch = 1 THEN @branch_code ELSE '' END;

    DECLARE @next BIGINT;
    BEGIN TRANSACTION;
        UPDATE config.number_series_counter WITH (UPDLOCK, HOLDLOCK)
           SET @next = last_number = last_number + 1,
               updated_at = SYSUTCDATETIME() AT TIME ZONE 'UTC'
         WHERE number_series_id = @series_id AND branch_code = @counter_branch AND period_key = @period;

        IF @@ROWCOUNT = 0
        BEGIN
            SET @next = @start;
            INSERT INTO config.number_series_counter (number_series_id, branch_code, period_key, tenant_id, last_number)
            VALUES (@series_id, @counter_branch, @period, @series_tenant_id, @next);
        END
    COMMIT;   -- inside a caller's transaction this only decrements @@TRANCOUNT; the lock stays until the caller commits

    IF LEN(CAST(@next AS VARCHAR(20))) > @len
        THROW 50022, 'Number series overflowed its number_length. Increase number_length or reset the period.', 1;
    DECLARE @digits VARCHAR(20) = RIGHT(REPLICATE('0', @len) + CAST(@next AS VARCHAR(20)), @len);

    DECLARE @date_part VARCHAR(8) = CASE @date_fmt
        WHEN 'YYYY'   THEN FORMAT(@at, 'yyyy')
        WHEN 'YY'     THEN FORMAT(@at, 'yy')
        WHEN 'YYYYMM' THEN FORMAT(@at, 'yyyyMM')
        WHEN 'YYMM'   THEN FORMAT(@at, 'yyMM')
        ELSE NULL END;

    SET @number = CONCAT_WS(@sep, NULLIF(@prefix, ''), CASE WHEN @with_branch = 1 THEN @branch_code END, @date_part, @digits);
END
GO

GRANT EXECUTE ON config.usp_next_number TO gecko_app;
GRANT EXECUTE ON config.usp_next_number TO gecko_system;
GO

-- Known setting codes (validated by the Fleet module against its catalogue):
--   COSTING_METHOD                  WMA (weighted moving average; decision 2026-11-19 — the only value for now)
--   NEGATIVE_STOCK_ALLOWED          BOOL, default false: an issue may not take stock below zero
--   LABOUR_ROUNDING_MINUTES         INT, labour time is rounded up to this many minutes (e.g. 15)
--   OVER_RECEIPT_TOLERANCE_PCT      DECIMAL, how far a GRN may exceed the PO quantity
--   INVOICE_MATCH_TOLERANCE_PCT     DECIMAL, three-way match tolerance in percent (e.g. 2)
--   INVOICE_MATCH_TOLERANCE_AMOUNT  DECIMAL, three-way match tolerance in base currency (e.g. 100)
--   METER_MAX_KM_PER_DAY            DECIMAL, a reading implying more than this is SUSPECT
--   METER_MAX_HOURS_PER_DAY         DECIMAL, the same for hour meters
--   TYRE_MIN_TREAD_MM               DECIMAL, tread depth at which a tyre must be pulled
--   BLOCK_DISPATCH_ON_OOS_DEFECT    BOOL, an out-of-service defect sends fleet.asset.out_of_service to Trucking

-- @table   config.fleet_setting
-- @purpose One fleet setting for a tenant, or for one branch overriding the tenant value (e.g. costing method, stock tolerance, meter plausibility limit).
-- @vector  none — new (the legacy system hard-coded these values)
-- @owner   Fleet Setup
-- @flags   T
-- @phase   0
IF OBJECT_ID('config.fleet_setting') IS NULL
BEGIN
    CREATE TABLE config.fleet_setting (
        fleet_setting_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_fleet_setting__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NULL,       -- NULL = applies to every branch; set = this branch's override
        setting_code            VARCHAR(60)         NOT NULL,   -- upper-case name of the setting, e.g. COSTING_METHOD
        setting_value           NVARCHAR(1000)      NULL,       -- the value, as text; NULL = explicitly not set
        value_type              VARCHAR(20)         NOT NULL,   -- how to read the value: STRING, INT, DECIMAL, BOOL, DATE, CODE, JSON
        description             NVARCHAR(400)       NULL,       -- what the setting changes, in plain words
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_fleet_setting__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_fleet_setting__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_fleet_setting PRIMARY KEY CLUSTERED (fleet_setting_id),
        CONSTRAINT ck_fleet_setting__type CHECK (value_type IN ('STRING','INT','DECIMAL','BOOL','DATE','CODE','JSON')),
        CONSTRAINT ck_fleet_setting__code CHECK (setting_code = UPPER(setting_code) COLLATE Latin1_General_100_CS_AS AND setting_code NOT LIKE '%[^A-Z0-9_]%'),
        CONSTRAINT ck_fleet_setting__bool CHECK (value_type <> 'BOOL' OR setting_value IS NULL OR setting_value IN (N'true', N'false'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_fleet_setting__branch
        ON config.fleet_setting (tenant_id, branch_id, setting_code) WHERE branch_id IS NOT NULL AND deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_fleet_setting__tenant
        ON config.fleet_setting (tenant_id, setting_code) WHERE branch_id IS NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'config', @table = 'fleet_setting';
END
GO

-- Known document types (validated by the Fleet module; doc 01 §approvals):
--   WORK_REQUEST, WORK_ORDER, GOODS_REQUEST, PURCHASE_ORDER, STOCK_ADJUSTMENT,
--   VENDOR_INVOICE (outside the match tolerance), FUEL_EXCEPTION, INSURANCE_CLAIM
--
-- How the rows are read: for a document of type X in branch B worth amount A,
-- the approval levels needed are every active level whose min_amount <= A
-- (NULL min_amount = always), branch rows replacing the tenant rows for that
-- type. Level 1 is approved first. No row for a type = no approval needed.

-- @table   config.approval_policy
-- @purpose One approval step for one kind of fleet document: from which amount it applies, its level in the chain, and the permission the approver must hold.
-- @vector  none — new (the legacy system had only IsApproved / ApprovedBy / ApprovedOn on each document)
-- @owner   Fleet Setup
-- @flags   T
-- @phase   0
IF OBJECT_ID('config.approval_policy') IS NULL
BEGIN
    CREATE TABLE config.approval_policy (
        approval_policy_id      UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_approval_policy__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NULL,       -- NULL = every branch; set = this branch's own chain for the document type
        document_type           VARCHAR(30)         NOT NULL,   -- which document: WORK_ORDER, PURCHASE_ORDER... (catalogue above)
        approval_level          TINYINT             NOT NULL,   -- order in the chain, 1 = first approver
        min_amount              DECIMAL(18,4)       NULL,       -- the step applies when the document total is at least this; NULL = always
        currency_code           CHAR(3)             NULL,       -- currency of min_amount (the tenant's base currency); set only with min_amount
        required_permission     VARCHAR(80)         NOT NULL,   -- permission code the approver must hold, e.g. fleet.purchase.approve (gecko_identity iam.permission)
        description             NVARCHAR(200)       NULL,       -- shown to the user, e.g. "Workshop manager above 50,000 THB"
        is_active               BIT                 NOT NULL CONSTRAINT df_approval_policy__is_active DEFAULT 1,   -- 0 = step switched off without losing it
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_approval_policy__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_approval_policy__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_approval_policy PRIMARY KEY CLUSTERED (approval_policy_id),
        -- Format only (see header): upper case, letters, digits and underscore.
        CONSTRAINT ck_approval_policy__document_type CHECK (document_type = UPPER(document_type) COLLATE Latin1_General_100_CS_AS AND document_type NOT LIKE '%[^A-Z0-9_]%'),
        CONSTRAINT ck_approval_policy__level CHECK (approval_level BETWEEN 1 AND 9),
        CONSTRAINT ck_approval_policy__amount CHECK (min_amount IS NULL OR min_amount >= 0),
        -- An amount threshold means nothing without its currency, and a currency means nothing without an amount.
        CONSTRAINT ck_approval_policy__amount_pair CHECK ((min_amount IS NULL AND currency_code IS NULL) OR (min_amount IS NOT NULL AND currency_code IS NOT NULL)),
        CONSTRAINT ck_approval_policy__currency CHECK (currency_code IS NULL OR currency_code LIKE '[A-Z][A-Z][A-Z]'),
        CONSTRAINT ck_approval_policy__permission CHECK (required_permission LIKE 'fleet.%' AND required_permission = LOWER(required_permission) COLLATE Latin1_General_100_CS_AS)
    );
    -- One step per level per document type, per branch or tenant-wide.
    CREATE UNIQUE NONCLUSTERED INDEX uq_approval_policy__branch
        ON config.approval_policy (tenant_id, branch_id, document_type, approval_level) WHERE branch_id IS NOT NULL AND deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_approval_policy__tenant
        ON config.approval_policy (tenant_id, document_type, approval_level) WHERE branch_id IS NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'config', @table = 'approval_policy';
END
GO

-- @table   config.labor_cost_rate
-- @purpose What one hour of in-house workshop labour costs the tenant, per trade and branch, for a date range. Feeds work-order labour cost; sell rates are the gecko_revenue repair tariff.
-- @vector  Master.ChargePrice (cost side)
-- @owner   M2 People: Drivers & Technicians
-- @flags   T
-- @phase   0
IF OBJECT_ID('config.labor_cost_rate') IS NULL
BEGIN
    CREATE TABLE config.labor_cost_rate (
        labor_cost_rate_id      UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_labor_cost_rate__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NULL,       -- NULL = every branch; set = this workshop's own rate
        trade_code              VARCHAR(40)         NOT NULL,   -- FLEET_TRADE code list value in gecko_master, e.g. MECHANIC, ELECTRICIAN, TYRE_FITTER, BODY_SHOP
        cost_per_hour           DECIMAL(18,4)       NOT NULL,   -- normal-time cost of one labour hour
        ot_cost_per_hour        DECIMAL(18,4)       NULL,       -- overtime cost of one labour hour; NULL = same as normal time
        currency_code           CHAR(3)             NOT NULL,   -- currency of both rates
        effective_from          DATE                NOT NULL,   -- first day the rate applies (branch local date)
        effective_to            DATE                NULL,       -- last day the rate applies; NULL = until replaced
        remarks                 NVARCHAR(400)       NULL,       -- why the rate changed, e.g. annual wage review
        legacy_ref              VARCHAR(80)         NULL,       -- legacy key, e.g. ChargePrice:240:LAB-MECH
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_labor_cost_rate__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_labor_cost_rate__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_labor_cost_rate PRIMARY KEY CLUSTERED (labor_cost_rate_id),
        CONSTRAINT ck_labor_cost_rate__trade CHECK (trade_code = UPPER(trade_code) COLLATE Latin1_General_100_CS_AS),
        CONSTRAINT ck_labor_cost_rate__cost CHECK (cost_per_hour >= 0 AND (ot_cost_per_hour IS NULL OR ot_cost_per_hour >= 0)),
        CONSTRAINT ck_labor_cost_rate__currency CHECK (currency_code LIKE '[A-Z][A-Z][A-Z]'),
        CONSTRAINT ck_labor_cost_rate__dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
    );
    -- Overlapping date ranges for the same trade are refused by the Fleet module
    -- (a filtered index cannot express "ranges do not overlap"); this stops the
    -- obvious duplicate: two rates starting on the same day.
    CREATE UNIQUE NONCLUSTERED INDEX uq_labor_cost_rate__branch
        ON config.labor_cost_rate (tenant_id, branch_id, trade_code, effective_from) WHERE branch_id IS NOT NULL AND deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_labor_cost_rate__tenant
        ON config.labor_cost_rate (tenant_id, trade_code, effective_from) WHERE branch_id IS NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'config', @table = 'labor_cost_rate';
END
GO

EXEC dbo.usp_record_script '02_config.sql', N'config: number_series (+counter, usp_next_number), fleet_setting, approval_policy, labor_cost_rate — all temporal except the counter';
GO

PRINT '>> 02_config.sql completed.';
GO
