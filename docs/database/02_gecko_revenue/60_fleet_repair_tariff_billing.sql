-- ============================================================
-- GECKO REVENUE — FLEET REPAIR TARIFF AND RECHARGE CHARGES (Fleet P5)
-- Script: 60_fleet_repair_tariff_billing.sql
-- Owner:  S05 Commercial & Rating (tariff) / S12 Billing (charges)
--
-- WHAT
--   tariff.repair_rate_card       a repair price list: the STANDARD card (no party)
--                                 or a customer's / subcontractor's card (party pair);
--                                 currency, valid from/to, approval status
--   tariff.repair_rate_line       one price on a card, by kind:
--                                   LABOR       trade × time band → rate per hour (+ minimum hours)
--                                   FLAT        service task code → fixed price, or standard hours × labour rate
--                                   MARKUP      parts cost band (from/to, optional item category) → markup %
--                                   PART_PRICE  item code → fixed unit price
--                                   SUNDRY      shop supplies % of labour (cap), minimum charge, call-out, towing
--   billing.fleet_charge          one recharge line released by Fleet (customer case B,
--                                 mode INVOICE): what the customer is charged and from
--                                 which work-order line; READY → INVOICED
--   billing.fleet_invoice_line    marks a billing.invoice_line as coming from a fleet charge
--
-- DEVIATION from Fleet doc 02 (5 tariff tables): ONE line table with a kind. The
-- Fleet tariff screens have one line grid, and the rating reads one set of rows.
--
-- WHY PARALLEL TO billing.trucking_charge (47) and not billing.charge: same reasons
-- as 47 — billing.charge's source CHECK and missing keys (additive-only rule).
-- An invoice line for a fleet charge stores fleet_charge_id in invoice_line.charge_id
-- and a row in billing.fleet_invoice_line says which table that id lives in.
--
-- MONEY: rates DECIMAL(18,4); billed amounts DECIMAL(18,2) (gecko_revenue 14).
-- ORDER: after 47/50. These tables are outside RLS until 50_trucking_policy_refresh
-- runs again (it rebuilds the policy over every tenant table). Idempotent.
-- ============================================================

USE gecko_revenue;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================================
-- 1. tariff.repair_rate_card
-- ============================================================

-- @table   tariff.repair_rate_card
-- @purpose A repair price list for Fleet recharges: the standard card or one party's card, with validity and approval.
-- @vector  Master.ChargePrice (SellRateOwn / SellRateOther), Master.StockMarkup
-- @owner   S05 Commercial & Rating
-- @flags   T
-- @phase   Fleet P5
IF OBJECT_ID('tariff.repair_rate_card') IS NULL
BEGIN
    CREATE TABLE tariff.repair_rate_card (
        repair_rate_card_id UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_repair_rate_card__id DEFAULT NEWSEQUENTIALID(),
        tenant_id           UNIQUEIDENTIFIER    NOT NULL,
        card_code           VARCHAR(30)         NOT NULL,   -- the screens' quotation no / rate code
        card_date           DATE                NOT NULL,   -- quotation / rate date
        description         NVARCHAR(200)       NULL,
        party_id            UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:party.party (NULL = the STANDARD card)
        party_code          VARCHAR(25)         NULL,
        currency_code       CHAR(3)             NOT NULL,
        prices_include_tax  BIT                 NOT NULL CONSTRAINT df_repair_rate_card__incl_tax DEFAULT 0,
        effective_from      DATE                NOT NULL,
        effective_to        DATE                NULL,       -- NULL = open-ended
        status              VARCHAR(20)         NOT NULL CONSTRAINT df_repair_rate_card__status DEFAULT 'DRAFT',   -- DRAFT, PENDING, APPROVED, REJECTED, WITHDRAWN
        sales_person        NVARCHAR(100)       NULL,
        contact_no          VARCHAR(40)         NULL,
        remarks             NVARCHAR(1000)      NULL,
        submitted_at        DATETIMEOFFSET(7)   NULL,
        submitted_by        UNIQUEIDENTIFIER    NULL,
        approved_at         DATETIMEOFFSET(7)   NULL,
        approved_by         UNIQUEIDENTIFIER    NULL,
        rejected_at         DATETIMEOFFSET(7)   NULL,
        rejected_by         UNIQUEIDENTIFIER    NULL,
        reject_reason       NVARCHAR(500)       NULL,
        created_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_repair_rate_card__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by          UNIQUEIDENTIFIER    NULL,
        updated_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_repair_rate_card__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by          UNIQUEIDENTIFIER    NULL,
        deleted_at          DATETIMEOFFSET(7)   NULL,
        deleted_by          UNIQUEIDENTIFIER    NULL,
        row_version         ROWVERSION          NOT NULL,
        CONSTRAINT pk_repair_rate_card PRIMARY KEY CLUSTERED (repair_rate_card_id),
        CONSTRAINT ck_repair_rate_card__status CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','WITHDRAWN')),
        CONSTRAINT ck_repair_rate_card__party_pair CHECK ((party_id IS NULL AND party_code IS NULL) OR (party_id IS NOT NULL AND party_code IS NOT NULL)),
        CONSTRAINT ck_repair_rate_card__dates CHECK (effective_to IS NULL OR effective_to >= effective_from),
        CONSTRAINT ck_repair_rate_card__code CHECK (card_code = UPPER(card_code) COLLATE Latin1_General_100_CS_AS AND LEN(card_code) > 0),
        CONSTRAINT ck_repair_rate_card__rejected CHECK (status <> 'REJECTED' OR reject_reason IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_repair_rate_card__code ON tariff.repair_rate_card (tenant_id, card_code) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_repair_rate_card__lookup
        ON tariff.repair_rate_card (tenant_id, party_id, status, effective_from) INCLUDE (effective_to, currency_code) WHERE deleted_at IS NULL;
END
GO

-- ============================================================
-- 2. tariff.repair_rate_line
-- ============================================================

-- @table   tariff.repair_rate_line
-- @purpose One price on a repair card: labour rate, flat-rate job, parts markup band, fixed part price or sundry rule.
-- @vector  Master.ChargePrice, Master.StockMarkup
-- @owner   S05 Commercial & Rating
-- @flags   T
-- @phase   Fleet P5
IF OBJECT_ID('tariff.repair_rate_line') IS NULL
BEGIN
    CREATE TABLE tariff.repair_rate_line (
        repair_rate_line_id UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_repair_rate_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id           UNIQUEIDENTIFIER    NOT NULL,
        repair_rate_card_id UNIQUEIDENTIFIER    NOT NULL,   -- ref tariff.repair_rate_card
        line_no             SMALLINT            NOT NULL,
        line_kind           VARCHAR(20)         NOT NULL,   -- LABOR, FLAT, MARKUP, PART_PRICE, SUNDRY
        charge_code         VARCHAR(15)         NOT NULL,   -- gecko_master commercial.charge_code (WO_LABOR, WO_PARTS, WO_SUNDRY ...)
        description         NVARCHAR(200)       NULL,
        trade_code          VARCHAR(30)         NULL,       -- LABOR: FLEET_TRADE code (NULL = any trade)
        time_band           VARCHAR(10)         NULL,       -- LABOR: NORMAL, OT, HOLIDAY
        service_task_code   VARCHAR(30)         NULL,       -- FLAT: Fleet maint.service_task code
        item_category_code  VARCHAR(40)         NULL,       -- MARKUP / PART_PRICE: FLEET_ITEM_CATEGORY (NULL = any)
        item_code           VARCHAR(40)         NULL,       -- PART_PRICE: Fleet inv.item code
        cost_from           DECIMAL(18,4)       NULL,       -- MARKUP: unit-cost band, from (inclusive)
        cost_to             DECIMAL(18,4)       NULL,       -- MARKUP: to (exclusive; NULL = no upper end)
        sundry_kind         VARCHAR(20)         NULL,       -- SUNDRY: SHOP_SUPPLIES, MIN_CHARGE, CALL_OUT, TOWING
        rate                DECIMAL(18,4)       NULL,       -- LABOR per hour; FLAT fixed price; MARKUP %; PART_PRICE unit price; SUNDRY % (SHOP_SUPPLIES) or amount
        std_hours           DECIMAL(9,2)        NULL,       -- FLAT: hours charged at the labour rate when rate is NULL
        min_qty             DECIMAL(9,2)        NULL,       -- LABOR: minimum hours billed per line
        cap_amount          DECIMAL(18,4)       NULL,       -- SUNDRY SHOP_SUPPLIES: at most this amount per recharge
        billing_unit_code   VARCHAR(20)         NOT NULL,   -- PER_HOUR, LUMP_SUM, PER_UNIT, PERCENT
        created_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_repair_rate_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by          UNIQUEIDENTIFIER    NULL,
        updated_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_repair_rate_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by          UNIQUEIDENTIFIER    NULL,
        deleted_at          DATETIMEOFFSET(7)   NULL,
        deleted_by          UNIQUEIDENTIFIER    NULL,
        row_version         ROWVERSION          NOT NULL,
        CONSTRAINT pk_repair_rate_line PRIMARY KEY CLUSTERED (repair_rate_line_id),
        CONSTRAINT ck_repair_rate_line__kind CHECK (line_kind IN ('LABOR','FLAT','MARKUP','PART_PRICE','SUNDRY')),
        CONSTRAINT ck_repair_rate_line__band CHECK (time_band IS NULL OR time_band IN ('NORMAL','OT','HOLIDAY')),
        CONSTRAINT ck_repair_rate_line__sundry CHECK (sundry_kind IS NULL OR sundry_kind IN ('SHOP_SUPPLIES','MIN_CHARGE','CALL_OUT','TOWING')),
        CONSTRAINT ck_repair_rate_line__labor CHECK (line_kind <> 'LABOR' OR (time_band IS NOT NULL AND rate IS NOT NULL)),
        CONSTRAINT ck_repair_rate_line__flat CHECK (line_kind <> 'FLAT' OR (service_task_code IS NOT NULL AND (rate IS NOT NULL OR std_hours IS NOT NULL))),
        CONSTRAINT ck_repair_rate_line__markup CHECK (line_kind <> 'MARKUP' OR (cost_from IS NOT NULL AND rate IS NOT NULL AND (cost_to IS NULL OR cost_to > cost_from))),
        CONSTRAINT ck_repair_rate_line__part CHECK (line_kind <> 'PART_PRICE' OR (item_code IS NOT NULL AND rate IS NOT NULL)),
        CONSTRAINT ck_repair_rate_line__sundry_rule CHECK (line_kind <> 'SUNDRY' OR (sundry_kind IS NOT NULL AND rate IS NOT NULL)),
        CONSTRAINT ck_repair_rate_line__values CHECK ((rate IS NULL OR rate >= 0) AND (std_hours IS NULL OR std_hours > 0)
            AND (min_qty IS NULL OR min_qty > 0) AND (cap_amount IS NULL OR cap_amount >= 0) AND (cost_from IS NULL OR cost_from >= 0))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_repair_rate_line__line ON tariff.repair_rate_line (tenant_id, repair_rate_card_id, line_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_repair_rate_line__card ON tariff.repair_rate_line (tenant_id, repair_rate_card_id, line_kind) WHERE deleted_at IS NULL;
END
GO

-- ============================================================
-- 3. billing.fleet_charge
-- ============================================================

-- @table   billing.fleet_charge
-- @purpose One recharge line released by Fleet for a customer invoice: the work-order line it prices, the price trail, tax, status.
-- @vector  Fleet.WorkOrderInvoice lines (legacy WO receipt)
-- @owner   S12 Billing & E-invoice
-- @flags   T
-- @phase   Fleet P5
IF OBJECT_ID('billing.fleet_charge') IS NULL
BEGIN
    CREATE TABLE billing.fleet_charge (
        fleet_charge_id     UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_fleet_charge__id DEFAULT NEWSEQUENTIALID(),
        tenant_id           UNIQUEIDENTIFIER    NOT NULL,
        branch_id           UNIQUEIDENTIFIER    NOT NULL,   -- the work order's branch
        recharge_id         UNIQUEIDENTIFIER    NOT NULL,   -- gecko_fleet maint.recharge (the release; idempotency with source_line_id)
        recharge_no         VARCHAR(40)         NOT NULL,
        work_order_id       UNIQUEIDENTIFIER    NOT NULL,   -- gecko_fleet maint.work_order
        work_order_no       VARCHAR(30)         NOT NULL,
        asset_code          VARCHAR(30)         NULL,       -- the equipment repaired
        source_line_type    VARCHAR(10)         NOT NULL,   -- PART, LABOR, SUBLET, SUNDRY
        source_line_id      UNIQUEIDENTIFIER    NULL,       -- the gecko_fleet maint.wo_* line (NULL = a sundry the tariff added)
        payer_party_id      UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:party.party (the bill-to customer)
        payer_party_code    VARCHAR(25)         NOT NULL,
        charge_code         VARCHAR(15)         NOT NULL,
        charge_name         NVARCHAR(300)       NOT NULL,   -- the line's description, printed on the invoice
        quantity            DECIMAL(18,4)       NOT NULL,
        billing_unit_code   VARCHAR(20)         NULL,
        unit_rate           DECIMAL(18,4)       NOT NULL,
        discount_amount     DECIMAL(18,2)       NOT NULL CONSTRAINT df_fleet_charge__discount DEFAULT 0,
        amount              DECIMAL(18,2)       NOT NULL,   -- quantity × unit_rate − discount, rounded
        currency_code       CHAR(3)             NOT NULL,
        tax_code            VARCHAR(20)         NULL,
        tax_rate            DECIMAL(9,4)        NOT NULL CONSTRAINT df_fleet_charge__tax_rate DEFAULT 0,
        tax_amount          DECIMAL(18,2)       NOT NULL CONSTRAINT df_fleet_charge__tax DEFAULT 0,
        wht_code            VARCHAR(20)         NULL,       -- informational: the customer withholds (services)
        rate_card_ref       VARCHAR(80)         NULL,       -- card code / line no the price came from, or MANUAL
        priced_at           DATETIMEOFFSET(7)   NOT NULL,
        status              VARCHAR(20)         NOT NULL CONSTRAINT df_fleet_charge__status DEFAULT 'READY',   -- READY, INVOICED, CANCELLED
        invoice_id          UNIQUEIDENTIFIER    NULL,       -- ref billing.invoice
        invoice_line_id     UNIQUEIDENTIFIER    NULL,       -- ref billing.invoice_line
        cancelled_at        DATETIMEOFFSET(7)   NULL,
        cancelled_by        UNIQUEIDENTIFIER    NULL,
        cancel_reason       NVARCHAR(500)       NULL,
        created_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_fleet_charge__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by          UNIQUEIDENTIFIER    NULL,
        updated_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_fleet_charge__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by          UNIQUEIDENTIFIER    NULL,
        deleted_at          DATETIMEOFFSET(7)   NULL,
        deleted_by          UNIQUEIDENTIFIER    NULL,
        row_version         ROWVERSION          NOT NULL,
        CONSTRAINT pk_fleet_charge PRIMARY KEY CLUSTERED (fleet_charge_id),
        CONSTRAINT ck_fleet_charge__line_type CHECK (source_line_type IN ('PART','LABOR','SUBLET','SUNDRY')),
        CONSTRAINT ck_fleet_charge__status CHECK (status IN ('READY','INVOICED','CANCELLED')),
        CONSTRAINT ck_fleet_charge__invoiced CHECK (status <> 'INVOICED' OR invoice_id IS NOT NULL),
        CONSTRAINT ck_fleet_charge__values CHECK (quantity > 0 AND unit_rate >= 0 AND discount_amount >= 0 AND tax_rate >= 0)
    );
    -- A Fleet line is charged once per release (a replayed release adds nothing).
    CREATE UNIQUE NONCLUSTERED INDEX uq_fleet_charge__source
        ON billing.fleet_charge (tenant_id, recharge_id, source_line_type, source_line_id) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_fleet_charge__payer
        ON billing.fleet_charge (tenant_id, payer_party_id, status, branch_id) INCLUDE (amount, currency_code) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_fleet_charge__work_order ON billing.fleet_charge (tenant_id, work_order_id) WHERE deleted_at IS NULL;
END
GO

-- A person invoices and cancels these lines: every change kept (47's pattern).
IF (SELECT temporal_type FROM sys.tables WHERE object_id = OBJECT_ID('billing.fleet_charge')) = 0
BEGIN
    ALTER TABLE billing.fleet_charge ADD
        sys_valid_from DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL
            CONSTRAINT df_billing_fleet_charge__sys_valid_from DEFAULT SYSUTCDATETIME(),
        sys_valid_to   DATETIME2(7) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL
            CONSTRAINT df_billing_fleet_charge__sys_valid_to DEFAULT CONVERT(DATETIME2(7), '9999-12-31 23:59:59.9999999'),
        PERIOD FOR SYSTEM_TIME (sys_valid_from, sys_valid_to);
    ALTER TABLE billing.fleet_charge SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = history.billing_fleet_charge, DATA_CONSISTENCY_CHECK = ON));
    PRINT '>> billing.fleet_charge is system-versioned.';
END
GO
IF (SELECT temporal_type FROM sys.tables WHERE object_id = OBJECT_ID('tariff.repair_rate_card')) = 0
BEGIN
    ALTER TABLE tariff.repair_rate_card ADD
        sys_valid_from DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL
            CONSTRAINT df_tariff_repair_rate_card__sys_valid_from DEFAULT SYSUTCDATETIME(),
        sys_valid_to   DATETIME2(7) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL
            CONSTRAINT df_tariff_repair_rate_card__sys_valid_to DEFAULT CONVERT(DATETIME2(7), '9999-12-31 23:59:59.9999999'),
        PERIOD FOR SYSTEM_TIME (sys_valid_from, sys_valid_to);
    ALTER TABLE tariff.repair_rate_card SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = history.tariff_repair_rate_card, DATA_CONSISTENCY_CHECK = ON));
    PRINT '>> tariff.repair_rate_card is system-versioned.';
END
GO
IF (SELECT temporal_type FROM sys.tables WHERE object_id = OBJECT_ID('tariff.repair_rate_line')) = 0
BEGIN
    ALTER TABLE tariff.repair_rate_line ADD
        sys_valid_from DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL
            CONSTRAINT df_tariff_repair_rate_line__sys_valid_from DEFAULT SYSUTCDATETIME(),
        sys_valid_to   DATETIME2(7) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL
            CONSTRAINT df_tariff_repair_rate_line__sys_valid_to DEFAULT CONVERT(DATETIME2(7), '9999-12-31 23:59:59.9999999'),
        PERIOD FOR SYSTEM_TIME (sys_valid_from, sys_valid_to);
    ALTER TABLE tariff.repair_rate_line SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = history.tariff_repair_rate_line, DATA_CONSISTENCY_CHECK = ON));
    PRINT '>> tariff.repair_rate_line is system-versioned.';
END
GO

-- ============================================================
-- 4. billing.fleet_invoice_line (47's trucking_invoice_line shape)
-- ============================================================

-- @table   billing.fleet_invoice_line
-- @purpose Marks a billing.invoice_line as coming from a fleet recharge line (billing.fleet_charge).
-- @vector  none — new
-- @owner   S12 Billing & E-invoice
-- @flags   A
-- @phase   Fleet P5
IF OBJECT_ID('billing.fleet_invoice_line') IS NULL
BEGIN
    CREATE TABLE billing.fleet_invoice_line (
        invoice_line_id     UNIQUEIDENTIFIER    NOT NULL,   -- ref billing.invoice_line (same id, one-to-one)
        tenant_id           UNIQUEIDENTIFIER    NOT NULL,
        invoice_id          UNIQUEIDENTIFIER    NOT NULL,   -- ref billing.invoice
        fleet_charge_id     UNIQUEIDENTIFIER    NOT NULL,   -- ref billing.fleet_charge
        created_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_fleet_invoice_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by          UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_fleet_invoice_line PRIMARY KEY CLUSTERED (invoice_line_id)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_fleet_invoice_line__charge ON billing.fleet_invoice_line (tenant_id, fleet_charge_id);
    CREATE NONCLUSTERED INDEX ix_fleet_invoice_line__invoice ON billing.fleet_invoice_line (tenant_id, invoice_id);
END
GO

DENY UPDATE ON billing.fleet_invoice_line TO gecko_app;
DENY UPDATE ON billing.fleet_invoice_line TO gecko_system;
GO

EXEC dbo.usp_record_script '60_fleet_repair_tariff_billing.sql', N'Fleet P5: tariff.repair_rate_card + repair_rate_line (one line table, kinds LABOR/FLAT/MARKUP/PART_PRICE/SUNDRY, temporal), billing.fleet_charge (temporal), billing.fleet_invoice_line (A)';
GO

IF OBJECT_ID('history.tariff_repair_rate_card') IS NULL OR OBJECT_ID('history.tariff_repair_rate_line') IS NULL
   OR OBJECT_ID('history.billing_fleet_charge') IS NULL OR OBJECT_ID('billing.fleet_invoice_line') IS NULL
    THROW 50060, '60_fleet_repair_tariff_billing: a table or its history is missing.', 1;
GO
PRINT '>> 60_fleet_repair_tariff_billing.sql completed.';
GO
