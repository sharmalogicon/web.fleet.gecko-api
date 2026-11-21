-- ============================================================
-- GECKO FLEET — STOCK LEDGER AND STOCK DOCUMENTS (P4)
-- Script: 12_inv_stock.sql
--
--   inv.item_uom_conversion   purchase / issue unit → base unit factor per item
--   inv.stock_lot             a lot or serial number received (cost, GRN line, expiry)
--   inv.stock_ledger (A, P)   every stock movement, signed qty in the base unit, valued
--                             at weighted moving average (WMA, decision 2026-11-19);
--                             a correction is a REVERSAL row, never an update
--   inv.stock_balance         item × warehouse × bin × lot: on hand, reserved, value;
--                             written in the same transaction as the ledger row
--                             (UPDLOCK, HOLDLOCK). The average cost is per item ×
--                             warehouse: every balance row of that pair carries it.
--   inv.stock_reservation     qty held for a work-order part or a goods-request line
--   inv.stock_issue / _line   issue to a work order / asset / cost centre, or a
--                             return from it (FLT_ISS)
--   inv.stock_adjustment / _line  count, damage, write-off, found stock (FLT_ADJ,
--                             approval policy STOCK_ADJUSTMENT)
--   inv.stock_transfer / _line    store to store, also across branches (FLT_TRF)
--   inv.stock_count / _line   count sheet: system qty frozen at start, counted qty,
--                             variance → one stock adjustment (FLT_CNT)
-- Documents never change the ledger until POSTED; a posted document is cancelled
-- by REVERSAL rows. Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   inv.item_uom_conversion
-- @purpose How many base units one purchase / issue unit holds, per item (a BOX of 12, a DRUM of 200 l).
-- @vector  (new)
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   4
IF OBJECT_ID('inv.item_uom_conversion') IS NULL
BEGIN
    CREATE TABLE inv.item_uom_conversion (
        item_uom_conversion_id  UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_item_uom_conversion__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        uom_code                VARCHAR(10)         NOT NULL,   -- ref gecko_master:lookup.uom (not the item's base unit)
        factor_to_base          DECIMAL(18,6)       NOT NULL,   -- 1 uom_code = factor_to_base × base unit
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item_uom_conversion__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_item_uom_conversion__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_item_uom_conversion PRIMARY KEY CLUSTERED (item_uom_conversion_id),
        CONSTRAINT ck_item_uom_conversion__factor CHECK (factor_to_base > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_item_uom_conversion__item_uom ON inv.item_uom_conversion (tenant_id, item_id, uom_code) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'item_uom_conversion';
END
GO

-- @table   inv.stock_lot
-- @purpose A lot or serial number of an item as received: receipt date and unit cost, the GRN line, expiry.
-- @vector  StockLedger.LotNo
-- @owner   Fleet Inventory
-- @flags   -
-- @phase   4
IF OBJECT_ID('inv.stock_lot') IS NULL
BEGIN
    CREATE TABLE inv.stock_lot (
        stock_lot_id            UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_lot__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        lot_no                  VARCHAR(60)         NULL,       -- LOT items
        serial_no               VARCHAR(60)         NULL,       -- SERIAL items (one unit per lot row)
        received_at             DATETIMEOFFSET(7)   NULL,
        receipt_unit_cost       DECIMAL(18,4)       NULL,       -- base-unit cost at receipt (vendor returns are valued at it)
        goods_receipt_line_id   UNIQUEIDENTIFIER    NULL,       -- ref purch.goods_receipt_line
        expiry_date             DATE                NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_lot__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_lot__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_lot PRIMARY KEY CLUSTERED (stock_lot_id),
        CONSTRAINT ck_stock_lot__no CHECK ((lot_no IS NOT NULL AND serial_no IS NULL) OR (lot_no IS NULL AND serial_no IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_lot__lot ON inv.stock_lot (tenant_id, item_id, lot_no) WHERE lot_no IS NOT NULL AND deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_lot__serial ON inv.stock_lot (tenant_id, item_id, serial_no) WHERE serial_no IS NOT NULL AND deleted_at IS NULL;
END
GO

-- @table   inv.stock_ledger
-- @purpose Every stock movement: signed base-unit qty, value at moving average, running qty / average after it, source document; reversals cancel rows.
-- @vector  Fleet.StockLedger
-- @owner   Fleet Inventory
-- @flags   A, P
-- @phase   4
IF OBJECT_ID('inv.stock_ledger') IS NULL
BEGIN
    CREATE TABLE inv.stock_ledger (
        stock_ledger_id         UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_ledger__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the warehouse's branch
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        bin_id                  UNIQUEIDENTIFIER    NULL,       -- ref inv.bin
        stock_lot_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_lot
        movement_type           VARCHAR(20)         NOT NULL,   -- RECEIPT, ISSUE, ISSUE_RETURN, VENDOR_RETURN, ADJUST_IN, ADJUST_OUT, TRANSFER_OUT, TRANSFER_IN, OPENING, REVERSAL
        qty                     DECIMAL(18,4)       NOT NULL,   -- signed, base unit (+ in, − out)
        unit_cost               DECIMAL(18,4)       NOT NULL,   -- base-unit cost of this movement (issues: the average at the time)
        amount                  DECIMAL(18,4)       NOT NULL,   -- signed qty × unit_cost
        qty_after               DECIMAL(18,4)       NOT NULL,   -- item × warehouse on hand after the movement
        avg_cost_after          DECIMAL(18,4)       NOT NULL,   -- item × warehouse average after the movement
        currency_code           CHAR(3)             NOT NULL,   -- base currency
        source_doc_type         VARCHAR(10)         NOT NULL,   -- GRN, ISS, RTV, ADJ, TRF, CNT, WO, OPEN
        source_doc_id           UNIQUEIDENTIFIER    NOT NULL,
        source_line_id          UNIQUEIDENTIFIER    NULL,
        source_doc_no           VARCHAR(30)         NOT NULL,
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order (cost attribution)
        asset_profile_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.asset_profile
        reverses_stock_ledger_id UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_ledger (a REVERSAL row)
        posted_at               DATETIMEOFFSET(7)   NOT NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_ledger__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_stock_ledger PRIMARY KEY NONCLUSTERED (stock_ledger_id) ON [PRIMARY],
        CONSTRAINT ck_stock_ledger__movement CHECK (movement_type IN ('RECEIPT','ISSUE','ISSUE_RETURN','VENDOR_RETURN','ADJUST_IN','ADJUST_OUT','TRANSFER_OUT','TRANSFER_IN','OPENING','REVERSAL')),
        CONSTRAINT ck_stock_ledger__doc_type CHECK (source_doc_type IN ('GRN','ISS','RTV','ADJ','TRF','CNT','WO','OPEN')),
        CONSTRAINT ck_stock_ledger__qty CHECK (qty <> 0 AND unit_cost >= 0 AND qty_after >= -999999999 AND avg_cost_after >= 0),
        CONSTRAINT ck_stock_ledger__reversal CHECK ((movement_type = 'REVERSAL' AND reverses_stock_ledger_id IS NOT NULL) OR (movement_type <> 'REVERSAL' AND reverses_stock_ledger_id IS NULL))
    ) ON ps_month (posted_at);
    CREATE CLUSTERED INDEX cx_stock_ledger ON inv.stock_ledger (posted_at, stock_ledger_id) ON ps_month (posted_at);
    CREATE NONCLUSTERED INDEX ix_stock_ledger__item ON inv.stock_ledger (tenant_id, item_id, warehouse_id, posted_at) INCLUDE (qty, amount, movement_type) ON [PRIMARY];
    CREATE NONCLUSTERED INDEX ix_stock_ledger__source ON inv.stock_ledger (tenant_id, source_doc_id) ON [PRIMARY];
    CREATE NONCLUSTERED INDEX ix_stock_ledger__work_order ON inv.stock_ledger (tenant_id, work_order_id) WHERE work_order_id IS NOT NULL ON [PRIMARY];
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_ledger__reverses ON inv.stock_ledger (tenant_id, reverses_stock_ledger_id) WHERE reverses_stock_ledger_id IS NOT NULL ON [PRIMARY];
    EXEC dbo.usp_make_append_only @schema = 'inv', @table = 'stock_ledger';
END
GO

-- @table   inv.stock_balance
-- @purpose Stock on hand and reserved per item × warehouse × bin × lot, with the item × warehouse moving-average cost; kept in step with the ledger.
-- @vector  Stock.TotalQtyOnHand / AvgCostPerUnit
-- @owner   Fleet Inventory
-- @flags   -
-- @phase   4
IF OBJECT_ID('inv.stock_balance') IS NULL
BEGIN
    CREATE TABLE inv.stock_balance (
        stock_balance_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_balance__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        bin_id                  UNIQUEIDENTIFIER    NULL,       -- ref inv.bin (NULL = no bin)
        stock_lot_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_lot
        qty_on_hand             DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_balance__on_hand DEFAULT 0,
        qty_reserved            DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_balance__reserved DEFAULT 0,
        avg_unit_cost           DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_balance__avg DEFAULT 0,
        stock_value             DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_balance__value DEFAULT 0,
        last_movement_at        DATETIMEOFFSET(7)   NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_balance__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_balance__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_balance PRIMARY KEY CLUSTERED (stock_balance_id),
        CONSTRAINT ck_stock_balance__values CHECK (qty_reserved >= 0 AND avg_unit_cost >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_balance__key ON inv.stock_balance (tenant_id, item_id, warehouse_id, bin_id, stock_lot_id);
    CREATE NONCLUSTERED INDEX ix_stock_balance__warehouse ON inv.stock_balance (tenant_id, warehouse_id, item_id) INCLUDE (qty_on_hand, qty_reserved, stock_value);
END
GO

-- @table   inv.stock_reservation
-- @purpose Quantity held in a warehouse for a work-order part or a goods-request line until it is issued or released.
-- @vector  (new)
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   4
IF OBJECT_ID('inv.stock_reservation') IS NULL
BEGIN
    CREATE TABLE inv.stock_reservation (
        stock_reservation_id    UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_reservation__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        qty                     DECIMAL(18,4)       NOT NULL,   -- base unit, still held
        source_type             VARCHAR(20)         NOT NULL,   -- WO_PART, GOODS_REQUEST
        wo_part_id              UNIQUEIDENTIFIER    NULL,       -- ref maint.wo_part
        goods_request_line_id   UNIQUEIDENTIFIER    NULL,       -- ref purch.goods_request_line
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_stock_reservation__status DEFAULT 'ACTIVE',   -- ACTIVE, CONSUMED, RELEASED
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_reservation__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_reservation__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_reservation PRIMARY KEY CLUSTERED (stock_reservation_id),
        CONSTRAINT ck_stock_reservation__source CHECK (source_type IN ('WO_PART','GOODS_REQUEST')),
        CONSTRAINT ck_stock_reservation__status CHECK (status IN ('ACTIVE','CONSUMED','RELEASED')),
        CONSTRAINT ck_stock_reservation__qty CHECK (qty >= 0),
        CONSTRAINT ck_stock_reservation__ref CHECK ((source_type = 'WO_PART' AND wo_part_id IS NOT NULL) OR (source_type = 'GOODS_REQUEST' AND goods_request_line_id IS NOT NULL))
    );
    CREATE NONCLUSTERED INDEX ix_stock_reservation__item ON inv.stock_reservation (tenant_id, item_id, warehouse_id, status) INCLUDE (qty);
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_reservation__wo_part ON inv.stock_reservation (tenant_id, wo_part_id) WHERE wo_part_id IS NOT NULL AND status = 'ACTIVE' AND deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_reservation__grq_line ON inv.stock_reservation (tenant_id, goods_request_line_id) WHERE goods_request_line_id IS NOT NULL AND status = 'ACTIVE' AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'stock_reservation';
END
GO

-- @table   inv.stock_issue
-- @purpose Parts taken out of a store for a work order, an asset or a cost centre — or brought back (kind RETURN) (FLT_ISS).
-- @vector  usp_StockLedgerUpdateStockOut, Fleet.SparePartsMonitoring
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   4
IF OBJECT_ID('inv.stock_issue') IS NULL
BEGIN
    CREATE TABLE inv.stock_issue (
        stock_issue_id          UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_issue__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_ISS
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_stock_issue__status DEFAULT 'DRAFT',   -- DRAFT, POSTED, CANCELLED
        issue_kind              VARCHAR(10)         NOT NULL CONSTRAINT df_stock_issue__kind DEFAULT 'ISSUE',   -- ISSUE, RETURN (back into stock)
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        issue_to                VARCHAR(20)         NOT NULL,   -- WORK_ORDER, ASSET, COST_CENTRE
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order
        work_order_no           VARCHAR(30)         NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.asset_profile
        cost_centre_code        VARCHAR(30)         NULL,
        received_by_name        NVARCHAR(150)       NULL,       -- who took the parts
        total_cost              DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_issue__total DEFAULT 0,   -- set at posting
        posted_at               DATETIMEOFFSET(7)   NULL,       -- written to the stock ledger at
        posted_by               UNIQUEIDENTIFIER    NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_issue__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_issue__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_issue PRIMARY KEY CLUSTERED (stock_issue_id),
        CONSTRAINT ck_stock_issue__status CHECK (status IN ('DRAFT','POSTED','CANCELLED')),
        CONSTRAINT ck_stock_issue__kind CHECK (issue_kind IN ('ISSUE','RETURN')),
        CONSTRAINT ck_stock_issue__issue_to CHECK (issue_to IN ('WORK_ORDER','ASSET','COST_CENTRE')),
        CONSTRAINT ck_stock_issue__target CHECK ((issue_to = 'WORK_ORDER' AND work_order_id IS NOT NULL) OR (issue_to = 'ASSET' AND asset_profile_id IS NOT NULL) OR (issue_to = 'COST_CENTRE' AND cost_centre_code IS NOT NULL)),
        CONSTRAINT ck_stock_issue__posted CHECK (status <> 'POSTED' OR posted_at IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_issue__document ON inv.stock_issue (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_stock_issue__branch_status ON inv.stock_issue (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_stock_issue__work_order ON inv.stock_issue (tenant_id, work_order_id) WHERE work_order_id IS NOT NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'stock_issue';
END
GO

-- @table   inv.stock_issue_line
-- @purpose One item on a stock issue: qty in the entered unit and in the base unit, the cost given at posting, the WO part it serves.
-- @vector  Fleet.SparePartsMonitoring lines
-- @owner   Fleet Inventory
-- @flags   -
-- @phase   4
IF OBJECT_ID('inv.stock_issue_line') IS NULL
BEGIN
    CREATE TABLE inv.stock_issue_line (
        stock_issue_line_id     UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_issue_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        stock_issue_id          UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.stock_issue
        line_no                 SMALLINT            NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        item_code               VARCHAR(40)         NOT NULL,   -- copy for lists
        bin_id                  UNIQUEIDENTIFIER    NULL,       -- ref inv.bin
        stock_lot_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_lot (LOT / SERIAL items)
        qty                     DECIMAL(18,4)       NOT NULL,   -- in uom_code
        uom_code                VARCHAR(10)         NOT NULL,
        base_qty                DECIMAL(18,4)       NOT NULL,   -- qty × factor
        unit_cost               DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_issue_line__unit_cost DEFAULT 0,   -- base-unit average at posting
        cost_amount             DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_issue_line__cost DEFAULT 0,
        wo_part_id              UNIQUEIDENTIFIER    NULL,       -- ref maint.wo_part (the part line this fills)
        stock_ledger_id         UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_ledger (set at posting)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_issue_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_issue_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_issue_line PRIMARY KEY CLUSTERED (stock_issue_line_id),
        CONSTRAINT ck_stock_issue_line__qty CHECK (qty > 0 AND base_qty > 0 AND unit_cost >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_issue_line__line ON inv.stock_issue_line (tenant_id, stock_issue_id, line_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_stock_issue_line__wo_part ON inv.stock_issue_line (tenant_id, wo_part_id) WHERE wo_part_id IS NOT NULL AND deleted_at IS NULL;
END
GO

-- @table   inv.stock_adjustment
-- @purpose Stock put right outside a receipt or issue: count result, damage, write-off, found stock — with reason and approval (FLT_ADJ).
-- @vector  Fleet.GoodsAdjustmentHeader
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   4
IF OBJECT_ID('inv.stock_adjustment') IS NULL
BEGIN
    CREATE TABLE inv.stock_adjustment (
        stock_adjustment_id     UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_adjustment__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_ADJ
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_stock_adjustment__status DEFAULT 'DRAFT',   -- DRAFT, PENDING_APPROVAL, APPROVED, POSTED, REJECTED, CANCELLED
        adjustment_type         VARCHAR(20)         NOT NULL,   -- INCREASE, DECREASE, WRITE_OFF, COUNT (the screen's types; TRANSFER = inv.stock_transfer)
        reason_code             VARCHAR(30)         NULL,       -- DAMAGE, EXPIRED, LOST, FOUND, COUNT, OPENING, OTHER (open list)
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        stock_count_id          UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_count (made from a count)
        total_amount            DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_adjustment__total DEFAULT 0,   -- signed value, set at posting
        approval_status         VARCHAR(20)         NOT NULL CONSTRAINT df_stock_adjustment__approval DEFAULT 'NOT_REQUIRED',   -- NOT_REQUIRED, PENDING, APPROVED, REJECTED
        approved_at             DATETIMEOFFSET(7)   NULL,
        approved_by             UNIQUEIDENTIFIER    NULL,
        reject_reason           NVARCHAR(500)       NULL,
        posted_at               DATETIMEOFFSET(7)   NULL,       -- written to the stock ledger at
        posted_by               UNIQUEIDENTIFIER    NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_adjustment__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_adjustment__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_adjustment PRIMARY KEY CLUSTERED (stock_adjustment_id),
        CONSTRAINT ck_stock_adjustment__status CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','POSTED','REJECTED','CANCELLED')),
        CONSTRAINT ck_stock_adjustment__type CHECK (adjustment_type IN ('INCREASE','DECREASE','WRITE_OFF','COUNT')),
        CONSTRAINT ck_stock_adjustment__approval CHECK (approval_status IN ('NOT_REQUIRED','PENDING','APPROVED','REJECTED')),
        CONSTRAINT ck_stock_adjustment__reason CHECK (reason_code IS NULL OR (reason_code = UPPER(reason_code) COLLATE Latin1_General_100_CS_AS AND reason_code NOT LIKE '%[^A-Z0-9_]%')),
        CONSTRAINT ck_stock_adjustment__rejected CHECK (status <> 'REJECTED' OR reject_reason IS NOT NULL),
        CONSTRAINT ck_stock_adjustment__posted CHECK (status <> 'POSTED' OR posted_at IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_adjustment__document ON inv.stock_adjustment (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_stock_adjustment__branch_status ON inv.stock_adjustment (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'stock_adjustment';
END
GO

-- @table   inv.stock_adjustment_line
-- @purpose One item on a stock adjustment: signed base-unit change, the cost used for an increase, value.
-- @vector  Fleet.GoodsAdjustmentDetail
-- @owner   Fleet Inventory
-- @flags   -
-- @phase   4
IF OBJECT_ID('inv.stock_adjustment_line') IS NULL
BEGIN
    CREATE TABLE inv.stock_adjustment_line (
        stock_adjustment_line_id UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_adjustment_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        stock_adjustment_id     UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.stock_adjustment
        line_no                 SMALLINT            NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        item_code               VARCHAR(40)         NOT NULL,   -- copy for lists
        bin_id                  UNIQUEIDENTIFIER    NULL,       -- ref inv.bin
        stock_lot_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_lot (LOT / SERIAL items)
        qty_change              DECIMAL(18,4)       NOT NULL,   -- signed, base unit
        unit_cost               DECIMAL(18,4)       NULL,       -- increase: cost to bring it in at (NULL = current average); decrease: average at posting
        amount                  DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_adjustment_line__amount DEFAULT 0,
        remarks                 NVARCHAR(500)       NULL,
        stock_ledger_id         UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_ledger (set at posting)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_adjustment_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_adjustment_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_adjustment_line PRIMARY KEY CLUSTERED (stock_adjustment_line_id),
        CONSTRAINT ck_stock_adjustment_line__qty CHECK (qty_change <> 0 AND (unit_cost IS NULL OR unit_cost >= 0))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_adjustment_line__line ON inv.stock_adjustment_line (tenant_id, stock_adjustment_id, line_no) WHERE deleted_at IS NULL;
END
GO

-- @table   inv.stock_transfer
-- @purpose Stock moved from one store to another, also across branches: shipped (out of the source), then received (FLT_TRF).
-- @vector  (new)
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   4
IF OBJECT_ID('inv.stock_transfer') IS NULL
BEGIN
    CREATE TABLE inv.stock_transfer (
        stock_transfer_id       UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_transfer__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_TRF (branch = the sending branch)
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_stock_transfer__status DEFAULT 'DRAFT',   -- DRAFT, IN_TRANSIT, RECEIVED, CANCELLED
        from_warehouse_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        to_warehouse_id         UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        to_branch_id            UNIQUEIDENTIFIER    NOT NULL,   -- the receiving store's branch
        shipped_at              DATETIMEOFFSET(7)   NULL,
        shipped_by              UNIQUEIDENTIFIER    NULL,
        received_at             DATETIMEOFFSET(7)   NULL,
        received_by             UNIQUEIDENTIFIER    NULL,
        total_cost              DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_transfer__total DEFAULT 0,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_transfer__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_transfer__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_transfer PRIMARY KEY CLUSTERED (stock_transfer_id),
        CONSTRAINT ck_stock_transfer__status CHECK (status IN ('DRAFT','IN_TRANSIT','RECEIVED','CANCELLED')),
        CONSTRAINT ck_stock_transfer__stores CHECK (from_warehouse_id <> to_warehouse_id),
        CONSTRAINT ck_stock_transfer__shipped CHECK (status NOT IN ('IN_TRANSIT','RECEIVED') OR shipped_at IS NOT NULL),
        CONSTRAINT ck_stock_transfer__received CHECK (status <> 'RECEIVED' OR received_at IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_transfer__document ON inv.stock_transfer (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_stock_transfer__branch_status ON inv.stock_transfer (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_stock_transfer__to_branch ON inv.stock_transfer (tenant_id, to_branch_id, status) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'stock_transfer';
END
GO

-- @table   inv.stock_transfer_line
-- @purpose One item on a transfer: qty shipped at the sending store's average, qty received, bins at both ends.
-- @vector  (new)
-- @owner   Fleet Inventory
-- @flags   -
-- @phase   4
IF OBJECT_ID('inv.stock_transfer_line') IS NULL
BEGIN
    CREATE TABLE inv.stock_transfer_line (
        stock_transfer_line_id  UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_transfer_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        stock_transfer_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.stock_transfer
        line_no                 SMALLINT            NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        item_code               VARCHAR(40)         NOT NULL,   -- copy for lists
        bin_id                  UNIQUEIDENTIFIER    NULL,       -- ref inv.bin
        stock_lot_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_lot (LOT / SERIAL items)
        to_bin_id               UNIQUEIDENTIFIER    NULL,       -- ref inv.bin at the receiving store
        qty                     DECIMAL(18,4)       NOT NULL,   -- base unit
        received_qty            DECIMAL(18,4)       NULL,       -- base unit, at receipt (short = written off at the sender by an adjustment)
        unit_cost               DECIMAL(18,4)       NOT NULL CONSTRAINT df_stock_transfer_line__unit_cost DEFAULT 0,   -- sender's average at shipping
        out_stock_ledger_id     UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_ledger TRANSFER_OUT
        in_stock_ledger_id      UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_ledger TRANSFER_IN
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_transfer_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_transfer_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_transfer_line PRIMARY KEY CLUSTERED (stock_transfer_line_id),
        CONSTRAINT ck_stock_transfer_line__qty CHECK (qty > 0 AND (received_qty IS NULL OR (received_qty >= 0 AND received_qty <= qty)))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_transfer_line__line ON inv.stock_transfer_line (tenant_id, stock_transfer_id, line_no) WHERE deleted_at IS NULL;
END
GO

-- @table   inv.stock_count
-- @purpose A count sheet for one store: system qty frozen when counting starts, counted qty keyed, the variance posted as one adjustment (FLT_CNT).
-- @vector  (new)
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   4
IF OBJECT_ID('inv.stock_count') IS NULL
BEGIN
    CREATE TABLE inv.stock_count (
        stock_count_id          UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_count__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_CNT
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_stock_count__status DEFAULT 'DRAFT',   -- DRAFT, COUNTING, COMPLETED, POSTED, CANCELLED
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        scope                   VARCHAR(20)         NOT NULL CONSTRAINT df_stock_count__scope DEFAULT 'FULL',   -- FULL, CATEGORY, BIN, SELECTED
        scope_value             VARCHAR(40)         NULL,       -- category code / bin code for CATEGORY / BIN
        counting_started_at     DATETIMEOFFSET(7)   NULL,       -- system qty frozen at
        completed_at            DATETIMEOFFSET(7)   NULL,
        stock_adjustment_id     UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_adjustment (the variance)
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_count__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_count__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_count PRIMARY KEY CLUSTERED (stock_count_id),
        CONSTRAINT ck_stock_count__status CHECK (status IN ('DRAFT','COUNTING','COMPLETED','POSTED','CANCELLED')),
        CONSTRAINT ck_stock_count__scope CHECK (scope IN ('FULL','CATEGORY','BIN','SELECTED')),
        CONSTRAINT ck_stock_count__posted CHECK (status <> 'POSTED' OR stock_adjustment_id IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_count__document ON inv.stock_count (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_stock_count__branch_status ON inv.stock_count (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'stock_count';
END
GO

-- @table   inv.stock_count_line
-- @purpose One item × bin × lot on a count sheet: system qty, counted qty, variance.
-- @vector  (new)
-- @owner   Fleet Inventory
-- @flags   -
-- @phase   4
IF OBJECT_ID('inv.stock_count_line') IS NULL
BEGIN
    CREATE TABLE inv.stock_count_line (
        stock_count_line_id     UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_stock_count_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        stock_count_id          UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.stock_count
        line_no                 SMALLINT            NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        item_code               VARCHAR(40)         NOT NULL,   -- copy for lists
        bin_id                  UNIQUEIDENTIFIER    NULL,       -- ref inv.bin
        stock_lot_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_lot (LOT / SERIAL items)
        system_qty              DECIMAL(18,4)       NOT NULL,   -- base unit, at counting_started_at
        counted_qty             DECIMAL(18,4)       NULL,       -- NULL = not counted yet
        variance_qty            AS (counted_qty - system_qty) PERSISTED,
        counted_at              DATETIMEOFFSET(7)   NULL,
        counted_by              UNIQUEIDENTIFIER    NULL,
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_count_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_stock_count_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_stock_count_line PRIMARY KEY CLUSTERED (stock_count_line_id),
        CONSTRAINT ck_stock_count_line__qty CHECK (counted_qty IS NULL OR counted_qty >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_count_line__line ON inv.stock_count_line (tenant_id, stock_count_id, line_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_stock_count_line__key ON inv.stock_count_line (tenant_id, stock_count_id, item_id, bin_id, stock_lot_id) WHERE deleted_at IS NULL;
END
GO

-- stock_issue_line / stock_adjustment_line / stock_transfer_line / stock_count_line: no temporal history of their
-- own; they change only while the header is DRAFT / COUNTING, and posting writes the ledger (append-only).

EXEC dbo.usp_record_script '12_inv_stock.sql', N'inv: item_uom_conversion, stock_lot, stock_ledger (A, P, WMA), stock_balance, stock_reservation, stock_issue/adjustment/transfer/count + lines';
GO

IF OBJECT_ID('history.inv_item_uom_conversion') IS NULL OR OBJECT_ID('inv.stock_lot') IS NULL OR OBJECT_ID('inv.stock_ledger') IS NULL
   OR OBJECT_ID('inv.stock_balance') IS NULL OR OBJECT_ID('history.inv_stock_reservation') IS NULL
   OR OBJECT_ID('history.inv_stock_issue') IS NULL OR OBJECT_ID('inv.stock_issue_line') IS NULL
   OR OBJECT_ID('history.inv_stock_adjustment') IS NULL OR OBJECT_ID('inv.stock_adjustment_line') IS NULL
   OR OBJECT_ID('history.inv_stock_transfer') IS NULL OR OBJECT_ID('inv.stock_transfer_line') IS NULL
   OR OBJECT_ID('history.inv_stock_count') IS NULL OR OBJECT_ID('inv.stock_count_line') IS NULL
    THROW 50000, '12_inv_stock: a table or its history is missing.', 1;
GO
PRINT '12_inv_stock.sql completed.';
GO
