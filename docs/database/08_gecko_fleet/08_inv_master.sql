-- ============================================================
-- GECKO FLEET — PARTS & STORES MASTER DATA (P1)
-- Script: 08_inv_master.sql
--
-- The masters P4 (stock ledger, issues, purchasing) runs on. No quantities here:
-- stock on hand, average cost and the ledger come in P4 (07_inv in doc 02).
--   inv.warehouse         a store at a branch (MAIN, WORKSHOP, TYRE_STORE, MOBILE_VAN);
--                         one default store per branch (where the Stock screen's
--                         reorder fields and "location" apply)
--   inv.bin               a shelf / bin inside a store
--   inv.item              a part, consumable, tyre, lubricant, tool or service item
--                         (the Stock screen): code, description, type, category
--                         (FLEET_ITEM_CATEGORY), brand, base UoM (gecko_master
--                         lookup.uom), tracking, OEM part no / original part,
--                         warranty (value + DAY/WEEK/MONTH/YEAR, and km)
--   inv.item_alias        other numbers the same item is known by (superseded part
--                         numbers, barcodes, vendor numbers)
--   inv.item_vendor       which suppliers sell it (gecko_master SUPPLIER party),
--                         their part number, last / quoted price, lead time
--   inv.item_stock_policy item x store: reorder point, min, max, reorder qty, lead
--                         time, default bin
-- Selling price / claim markup on the Stock screen belong to the repair tariff
-- (gecko_revenue, P5) and are not stored here.
-- All temporal except item_alias. Run 91_rls_policy.sql AFTER. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   inv.warehouse
-- @purpose A store holding fleet stock at a branch (main store, workshop store, tyre store, service van); one default per branch.
-- @vector  FT-LOCATION lookup
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   1
IF OBJECT_ID('inv.warehouse') IS NULL
BEGIN
    CREATE TABLE inv.warehouse (
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_warehouse__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:org.branch
        warehouse_code          VARCHAR(20)         NOT NULL,
        name_en                 NVARCHAR(100)       NOT NULL,
        name_local              NVARCHAR(100)       NULL,
        warehouse_kind          VARCHAR(20)         NOT NULL CONSTRAINT df_warehouse__kind DEFAULT 'MAIN',   -- MAIN, WORKSHOP, TYRE_STORE, MOBILE_VAN
        is_default              BIT                 NOT NULL CONSTRAINT df_warehouse__is_default DEFAULT 0,   -- the branch's default store
        is_active               BIT                 NOT NULL CONSTRAINT df_warehouse__is_active DEFAULT 1,
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_warehouse__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_warehouse__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_warehouse PRIMARY KEY CLUSTERED (warehouse_id),
        CONSTRAINT ck_warehouse__code CHECK (warehouse_code = UPPER(warehouse_code) COLLATE Latin1_General_100_CS_AS AND warehouse_code NOT LIKE '%[^A-Z0-9._/-]%' AND LEN(warehouse_code) > 0),
        CONSTRAINT ck_warehouse__kind CHECK (warehouse_kind IN ('MAIN','WORKSHOP','TYRE_STORE','MOBILE_VAN')),
        CONSTRAINT ck_warehouse__default_active CHECK (is_default = 0 OR is_active = 1)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_warehouse__code
        ON inv.warehouse (tenant_id, warehouse_code) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_warehouse__default
        ON inv.warehouse (tenant_id, branch_id) WHERE is_default = 1 AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'warehouse';
END
GO

-- @table   inv.bin
-- @purpose A shelf / bin location inside a store.
-- @vector  Stock.Location
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   1
IF OBJECT_ID('inv.bin') IS NULL
BEGIN
    CREATE TABLE inv.bin (
        bin_id                  UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_bin__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        bin_code                VARCHAR(30)         NOT NULL,   -- e.g. A-01-03
        description             NVARCHAR(100)       NULL,
        is_active               BIT                 NOT NULL CONSTRAINT df_bin__is_active DEFAULT 1,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_bin__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_bin__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_bin PRIMARY KEY CLUSTERED (bin_id),
        CONSTRAINT ck_bin__code CHECK (bin_code = UPPER(bin_code) COLLATE Latin1_General_100_CS_AS AND LEN(bin_code) > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_bin__code
        ON inv.bin (tenant_id, warehouse_id, bin_code) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'bin';
END
GO

-- @table   inv.item
-- @purpose One stock item (part, consumable, tyre, lubricant, tool or service item): the Stock screen's master record.
-- @vector  Master.Stock
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   1
IF OBJECT_ID('inv.item') IS NULL
BEGIN
    CREATE TABLE inv.item (
        item_id                 UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_item__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        item_code               VARCHAR(40)         NOT NULL,   -- stock code
        description_en          NVARCHAR(300)       NOT NULL,
        description_local       NVARCHAR(300)       NULL,
        item_type               VARCHAR(20)         NOT NULL CONSTRAINT df_item__type DEFAULT 'PART',   -- PART, CONSUMABLE, TYRE, LUBRICANT, TOOL, SERVICE
        category_code           VARCHAR(40)         NULL,       -- FLEET_ITEM_CATEGORY code-list value (gecko_master)
        brand_code              VARCHAR(40)         NULL,       -- brand / make, e.g. BOSCH
        base_uom_code           VARCHAR(10)         NOT NULL,   -- ref gecko_master:lookup.uom (H87 piece, LTR litre ...)
        tracking                VARCHAR(10)         NOT NULL CONSTRAINT df_item__tracking DEFAULT 'NONE',   -- NONE, LOT, SERIAL (tyres: SERIAL)
        oem_part_no             VARCHAR(60)         NULL,       -- manufacturer part number
        is_original_part        BIT                 NOT NULL CONSTRAINT df_item__original DEFAULT 0,   -- genuine OEM part (vs aftermarket)
        warranty_value          SMALLINT            NULL,       -- warranty length, in warranty_period units
        warranty_period         VARCHAR(10)         NULL,       -- DAY, WEEK, MONTH, YEAR
        warranty_km             INT                 NULL,       -- warranty distance, whichever comes first
        is_stocked              BIT                 NOT NULL CONSTRAINT df_item__stocked DEFAULT 1,   -- 0 = bought for a job, never held (SERVICE items)
        is_active               BIT                 NOT NULL CONSTRAINT df_item__is_active DEFAULT 1,
        remarks                 NVARCHAR(1000)      NULL,
        legacy_ref              VARCHAR(80)         NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_item PRIMARY KEY CLUSTERED (item_id),
        CONSTRAINT ck_item__code CHECK (item_code = UPPER(item_code) COLLATE Latin1_General_100_CS_AS AND LEN(item_code) > 0),
        CONSTRAINT ck_item__type CHECK (item_type IN ('PART','CONSUMABLE','TYRE','LUBRICANT','TOOL','SERVICE')),
        CONSTRAINT ck_item__tracking CHECK (tracking IN ('NONE','LOT','SERIAL')),
        CONSTRAINT ck_item__warranty CHECK ((warranty_value IS NULL AND warranty_period IS NULL)
            OR (warranty_value > 0 AND warranty_period IN ('DAY','WEEK','MONTH','YEAR'))),
        CONSTRAINT ck_item__warranty_km CHECK (warranty_km IS NULL OR warranty_km > 0),
        CONSTRAINT ck_item__service CHECK (item_type <> 'SERVICE' OR is_stocked = 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_item__code
        ON inv.item (tenant_id, item_code) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_item__category
        ON inv.item (tenant_id, category_code, is_active) INCLUDE (item_code, description_en) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'item';
END
GO

-- @table   inv.item_alias
-- @purpose Another number the same item is known by: superseded part no, barcode, vendor no.
-- @vector  Stock.SubCode
-- @owner   Fleet Inventory
-- @flags   -
-- @phase   1
IF OBJECT_ID('inv.item_alias') IS NULL
BEGIN
    CREATE TABLE inv.item_alias (
        item_alias_id           UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_item_alias__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        alias_type              VARCHAR(20)         NOT NULL,   -- SUPERSEDED, BARCODE, VENDOR, OTHER
        alias_code              VARCHAR(60)         NOT NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item_alias__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item_alias__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_item_alias PRIMARY KEY CLUSTERED (item_alias_id),
        CONSTRAINT ck_item_alias__type CHECK (alias_type IN ('SUPERSEDED','BARCODE','VENDOR','OTHER')),
        CONSTRAINT ck_item_alias__code CHECK (LEN(alias_code) > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_item_alias__code
        ON inv.item_alias (tenant_id, alias_type, alias_code) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_item_alias__item
        ON inv.item_alias (tenant_id, item_id) WHERE deleted_at IS NULL;
END
GO

-- @table   inv.item_vendor
-- @purpose A supplier that sells an item: their part number, last and quoted price, lead time, preferred flag.
-- @vector  Master.StockVendor
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   1
IF OBJECT_ID('inv.item_vendor') IS NULL
BEGIN
    CREATE TABLE inv.item_vendor (
        item_vendor_id          UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_item_vendor__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        supplier_party_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:party.party (SUPPLIER role)
        supplier_party_code     VARCHAR(25)         NOT NULL,   -- code of the above
        vendor_part_no          VARCHAR(60)         NULL,
        purchase_uom_code       VARCHAR(10)         NULL,       -- ref gecko_master:lookup.uom; NULL = the item's base UoM
        last_price              DECIMAL(19,4)       NULL,       -- set by GRNs (P4)
        last_price_date         DATE                NULL,
        quoted_price            DECIMAL(19,4)       NULL,
        quote_valid_to          DATE                NULL,
        currency_code           CHAR(3)             NULL,       -- currency of the prices
        lead_time_days          SMALLINT            NULL,
        is_preferred            BIT                 NOT NULL CONSTRAINT df_item_vendor__preferred DEFAULT 0,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item_vendor__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item_vendor__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_item_vendor PRIMARY KEY CLUSTERED (item_vendor_id),
        CONSTRAINT ck_item_vendor__prices CHECK ((last_price IS NULL OR last_price >= 0) AND (quoted_price IS NULL OR quoted_price >= 0)),
        CONSTRAINT ck_item_vendor__currency CHECK ((last_price IS NULL AND quoted_price IS NULL) OR currency_code LIKE '[A-Z][A-Z][A-Z]'),
        CONSTRAINT ck_item_vendor__lead CHECK (lead_time_days IS NULL OR lead_time_days >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_item_vendor__pair
        ON inv.item_vendor (tenant_id, item_id, supplier_party_id) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_item_vendor__preferred
        ON inv.item_vendor (tenant_id, item_id) WHERE is_preferred = 1 AND deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_item_vendor__supplier
        ON inv.item_vendor (tenant_id, supplier_party_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'item_vendor';
END
GO

-- @table   inv.item_stock_policy
-- @purpose How an item is stocked in one store: reorder point, min / max, reorder quantity, lead time, default bin.
-- @vector  Stock.ReOrderLevel / MinQty / MaxQty / ReOrderQty / LeadTime / Location
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   1
IF OBJECT_ID('inv.item_stock_policy') IS NULL
BEGIN
    CREATE TABLE inv.item_stock_policy (
        item_stock_policy_id    UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_item_stock_policy__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        default_bin_id          UNIQUEIDENTIFIER    NULL,       -- ref inv.bin (of the same store): the Stock screen's "location"
        reorder_point           DECIMAL(18,4)       NULL,       -- reorder when stock falls to this
        min_qty                 DECIMAL(18,4)       NULL,
        max_qty                 DECIMAL(18,4)       NULL,
        reorder_qty             DECIMAL(18,4)       NULL,       -- usual quantity to order
        lead_time_days          SMALLINT            NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item_stock_policy__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item_stock_policy__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_item_stock_policy PRIMARY KEY CLUSTERED (item_stock_policy_id),
        CONSTRAINT ck_item_stock_policy__qty CHECK ((reorder_point IS NULL OR reorder_point >= 0) AND (min_qty IS NULL OR min_qty >= 0)
            AND (max_qty IS NULL OR max_qty >= 0) AND (reorder_qty IS NULL OR reorder_qty > 0)
            AND (min_qty IS NULL OR max_qty IS NULL OR min_qty <= max_qty)
            AND (lead_time_days IS NULL OR lead_time_days >= 0))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_item_stock_policy__pair
        ON inv.item_stock_policy (tenant_id, item_id, warehouse_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'item_stock_policy';
END
GO

IF OBJECT_ID('history.inv_warehouse') IS NULL OR OBJECT_ID('history.inv_bin') IS NULL OR OBJECT_ID('history.inv_item') IS NULL
   OR OBJECT_ID('inv.item_alias') IS NULL OR OBJECT_ID('history.inv_item_vendor') IS NULL OR OBJECT_ID('history.inv_item_stock_policy') IS NULL
    THROW 50000, '08_inv_master: a table or its history is missing.', 1;
GO
PRINT '08_inv_master.sql completed.';
GO
