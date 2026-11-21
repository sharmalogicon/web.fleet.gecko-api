-- ============================================================
-- GECKO FLEET — PROCUREMENT (P4)
-- Script: 13_purch.sql
--
--   purch.goods_request / _line    parts asked for by a work order, an asset or the
--                                  store (FLT_GRQ). The UI's "Goods Requests" (header)
--                                  and "Goods Requisitions" (with lines, approval)
--                                  screens both show this one document. Each line is
--                                  met from stock (issue) and / or by ordering (PO).
--   purch.purchase_order / _line   order to a supplier (FLT_PO): approval, money
--                                  block, received / invoiced / cancelled qty per line
--   purch.goods_receipt / _line    goods received against PO lines or without a PO
--                                  (FLT_GRN); posting writes RECEIPT ledger rows, lots
--   purch.vendor_return / _line    goods sent back against GRN lines, valued at the
--                                  received lot / line cost (FLT_RTV)
-- Supplier = gecko_master party with role SUPPLIER (id + code pair, no FK).
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   purch.goods_request
-- @purpose Parts asked for by a work order, an asset or the store (FLT_GRQ); met from stock and / or ordered; approval policy GOODS_REQUEST.
-- @vector  Fleet.GoodsRequestHeader, Fleet.GoodsRequisition
-- @owner   Fleet Procurement
-- @flags   T
-- @phase   4
IF OBJECT_ID('purch.goods_request') IS NULL
BEGIN
    CREATE TABLE purch.goods_request (
        goods_request_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_goods_request__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_GRQ
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_goods_request__status DEFAULT 'DRAFT',   -- DRAFT, SUBMITTED, APPROVED, PARTIAL, FULFILLED, REJECTED, CANCELLED
        required_date           DATE                NULL,
        warehouse_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.warehouse to supply from / deliver to
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order
        work_order_no           VARCHAR(30)         NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.asset_profile (the screen's equipment)
        asset_code              VARCHAR(30)         NULL,
        job_ref_no              VARCHAR(40)         NULL,       -- free reference (the screen's Job Ref)
        requested_by_user_id    UNIQUEIDENTIFIER    NULL,
        submitted_at            DATETIMEOFFSET(7)   NULL,
        approval_status         VARCHAR(20)         NOT NULL CONSTRAINT df_goods_request__approval DEFAULT 'NOT_REQUIRED',   -- NOT_REQUIRED, PENDING, APPROVED, REJECTED
        approved_at             DATETIMEOFFSET(7)   NULL,
        approved_by             UNIQUEIDENTIFIER    NULL,
        reject_reason           NVARCHAR(500)       NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_goods_request__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_goods_request__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_goods_request PRIMARY KEY CLUSTERED (goods_request_id),
        CONSTRAINT ck_goods_request__status CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','PARTIAL','FULFILLED','REJECTED','CANCELLED')),
        CONSTRAINT ck_goods_request__approval CHECK (approval_status IN ('NOT_REQUIRED','PENDING','APPROVED','REJECTED')),
        CONSTRAINT ck_goods_request__rejected CHECK (status <> 'REJECTED' OR reject_reason IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_goods_request__document ON purch.goods_request (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_goods_request__branch_status ON purch.goods_request (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_goods_request__work_order ON purch.goods_request (tenant_id, work_order_id) WHERE work_order_id IS NOT NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'purch', @table = 'goods_request';
END
GO

-- @table   purch.goods_request_line
-- @purpose One item asked for: qty, how much came from stock, how much was ordered, the WO part it serves.
-- @vector  Fleet.GoodsRequestDetail
-- @owner   Fleet Procurement
-- @flags   T
-- @phase   4
IF OBJECT_ID('purch.goods_request_line') IS NULL
BEGIN
    CREATE TABLE purch.goods_request_line (
        goods_request_line_id   UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_goods_request_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        goods_request_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref purch.goods_request
        line_no                 SMALLINT            NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NULL,       -- ref inv.item (NULL = free text: a service or a one-off part)
        item_code               VARCHAR(40)         NULL,
        description             NVARCHAR(300)       NOT NULL,
        qty                     DECIMAL(18,4)       NOT NULL,   -- in uom_code
        uom_code                VARCHAR(10)         NOT NULL,
        uom_factor              DECIMAL(18,6)       NOT NULL,   -- base units per uom_code at entry
        issued_base_qty         DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_request_line__issued DEFAULT 0,   -- met from stock (posted issues)
        ordered_base_qty        DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_request_line__ordered DEFAULT 0,   -- on purchase orders (not cancelled)
        cancelled_base_qty      DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_request_line__cancelled DEFAULT 0,
        wo_part_id              UNIQUEIDENTIFIER    NULL,       -- ref maint.wo_part
        preferred_supplier_party_id UNIQUEIDENTIFIER    NULL,
        preferred_supplier_party_code VARCHAR(25)         NULL,
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_goods_request_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_goods_request_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_goods_request_line PRIMARY KEY CLUSTERED (goods_request_line_id),
        CONSTRAINT ck_goods_request_line__qty CHECK (qty > 0 AND uom_factor > 0 AND issued_base_qty >= 0 AND ordered_base_qty >= 0 AND cancelled_base_qty >= 0),
        CONSTRAINT ck_goods_request_line__supplier_pair CHECK ((preferred_supplier_party_id IS NULL AND preferred_supplier_party_code IS NULL) OR (preferred_supplier_party_id IS NOT NULL AND preferred_supplier_party_code IS NOT NULL)),
        CONSTRAINT ck_goods_request_line__item_pair CHECK ((item_id IS NULL AND item_code IS NULL) OR (item_id IS NOT NULL AND item_code IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_goods_request_line__line ON purch.goods_request_line (tenant_id, goods_request_id, line_no) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'purch', @table = 'goods_request_line';
END
GO

-- @table   purch.purchase_order
-- @purpose An order to a supplier (FLT_PO): delivery store, terms, quotation, approval, money block, receipt progress.
-- @vector  Fleet.PurchaseOrderHeader
-- @owner   Fleet Procurement
-- @flags   T
-- @phase   4
IF OBJECT_ID('purch.purchase_order') IS NULL
BEGIN
    CREATE TABLE purch.purchase_order (
        purchase_order_id       UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_purchase_order__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_PO
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_purchase_order__status DEFAULT 'DRAFT',   -- DRAFT, PENDING_APPROVAL, APPROVED, SENT, PARTIALLY_RECEIVED, RECEIVED, CLOSED, REJECTED, CANCELLED
        supplier_party_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:party.party (role SUPPLIER)
        supplier_party_code     VARCHAR(25)         NOT NULL,   -- copy for lists
        supplier_name           NVARCHAR(200)       NULL,       -- copy for lists / print
        required_date           DATE                NULL,
        warehouse_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.warehouse to deliver to (NULL = direct to a job)
        payment_term_code       VARCHAR(20)         NULL,       -- the screen's credit term
        vendor_quote_no         VARCHAR(40)         NULL,
        ordered_by_name         NVARCHAR(150)       NULL,       -- the screen's Order By
        goods_request_id        UNIQUEIDENTIFIER    NULL,       -- ref purch.goods_request (when made from one)
        goods_request_no        VARCHAR(30)         NULL,
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order (a PO for one job)
        currency_code           CHAR(3)             NOT NULL,   -- document currency
        exchange_rate           DECIMAL(18,8)       NOT NULL CONSTRAINT df_purchase_order__rate DEFAULT 1,
        subtotal_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_purchase_order__subtotal DEFAULT 0,   -- sum of line amounts after line discounts
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_purchase_order__discount DEFAULT 0,   -- header discount
        tax_code                VARCHAR(20)         NULL,       -- VAT code (gecko_master)
        tax_rate                DECIMAL(9,4)        NOT NULL CONSTRAINT df_purchase_order__tax_rate DEFAULT 0,   -- % (the screen's VAT)
        tax_amount              DECIMAL(18,4)       NOT NULL CONSTRAINT df_purchase_order__tax DEFAULT 0,
        total_amount            DECIMAL(18,4)       NOT NULL CONSTRAINT df_purchase_order__total DEFAULT 0,   -- subtotal − discount + tax (server-calculated)
        approval_status         VARCHAR(20)         NOT NULL CONSTRAINT df_purchase_order__approval DEFAULT 'NOT_REQUIRED',   -- NOT_REQUIRED, PENDING, APPROVED, REJECTED
        approved_at             DATETIMEOFFSET(7)   NULL,
        approved_by             UNIQUEIDENTIFIER    NULL,
        reject_reason           NVARCHAR(500)       NULL,
        submitted_at            DATETIMEOFFSET(7)   NULL,
        sent_at                 DATETIMEOFFSET(7)   NULL,
        closed_at               DATETIMEOFFSET(7)   NULL,
        closed_by               UNIQUEIDENTIFIER    NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_purchase_order__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_purchase_order__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_purchase_order PRIMARY KEY CLUSTERED (purchase_order_id),
        CONSTRAINT ck_purchase_order__status CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SENT','PARTIALLY_RECEIVED','RECEIVED','CLOSED','REJECTED','CANCELLED')),
        CONSTRAINT ck_purchase_order__approval CHECK (approval_status IN ('NOT_REQUIRED','PENDING','APPROVED','REJECTED')),
        CONSTRAINT ck_purchase_order__rejected CHECK (status <> 'REJECTED' OR reject_reason IS NOT NULL),
        CONSTRAINT ck_purchase_order__money CHECK (exchange_rate > 0 AND tax_rate >= 0 AND tax_rate <= 100 AND discount_amount >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_purchase_order__document ON purch.purchase_order (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_purchase_order__branch_status ON purch.purchase_order (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_purchase_order__supplier ON purch.purchase_order (tenant_id, supplier_party_id, status) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'purch', @table = 'purchase_order';
END
GO

-- @table   purch.purchase_order_line
-- @purpose One line on a PO: item or free text, qty, price, discount, tax, and how much was received, invoiced, cancelled.
-- @vector  Fleet.PurchaseOrderDetail
-- @owner   Fleet Procurement
-- @flags   T
-- @phase   4
IF OBJECT_ID('purch.purchase_order_line') IS NULL
BEGIN
    CREATE TABLE purch.purchase_order_line (
        purchase_order_line_id  UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_purchase_order_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        purchase_order_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref purch.purchase_order
        line_no                 SMALLINT            NOT NULL,
        item_id                 UNIQUEIDENTIFIER    NULL,       -- ref inv.item (NULL = free text: a service or a one-off part)
        item_code               VARCHAR(40)         NULL,
        description             NVARCHAR(300)       NOT NULL,
        vendor_part_no          VARCHAR(60)         NULL,
        qty                     DECIMAL(18,4)       NOT NULL,   -- in uom_code
        uom_code                VARCHAR(10)         NOT NULL,
        uom_factor              DECIMAL(18,6)       NOT NULL,   -- base units per uom_code at entry
        unit_price              DECIMAL(18,4)       NOT NULL,   -- per uom_code, document currency
        discount_type           VARCHAR(10)         NULL,       -- PERCENT, AMOUNT
        discount_value          DECIMAL(18,4)       NOT NULL CONSTRAINT df_purchase_order_line__discount DEFAULT 0,   -- % or amount as keyed
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_purchase_order_line__discount_amount DEFAULT 0,
        line_amount             DECIMAL(18,4)       NOT NULL,   -- qty × unit_price − discount_amount
        tax_code                VARCHAR(20)         NULL,
        received_qty            DECIMAL(18,4)       NOT NULL CONSTRAINT df_purchase_order_line__received DEFAULT 0,   -- in uom_code, posted receipts − returns
        invoiced_qty            DECIMAL(18,4)       NOT NULL CONSTRAINT df_purchase_order_line__invoiced DEFAULT 0,   -- P6 vendor invoices
        cancelled_qty           DECIMAL(18,4)       NOT NULL CONSTRAINT df_purchase_order_line__cancelled DEFAULT 0,   -- short-closed
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order (direct-to-job line)
        wo_part_id              UNIQUEIDENTIFIER    NULL,       -- ref maint.wo_part
        goods_request_line_id   UNIQUEIDENTIFIER    NULL,       -- ref purch.goods_request_line
        required_date           DATE                NULL,
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_purchase_order_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_purchase_order_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_purchase_order_line PRIMARY KEY CLUSTERED (purchase_order_line_id),
        CONSTRAINT ck_purchase_order_line__qty CHECK (qty > 0 AND uom_factor > 0 AND received_qty >= 0 AND invoiced_qty >= 0 AND cancelled_qty >= 0 AND cancelled_qty <= qty),
        CONSTRAINT ck_purchase_order_line__price CHECK (unit_price >= 0 AND discount_value >= 0 AND discount_amount >= 0),
        CONSTRAINT ck_purchase_order_line__discount_type CHECK (discount_type IS NULL OR discount_type IN ('PERCENT','AMOUNT')),
        CONSTRAINT ck_purchase_order_line__item_pair CHECK ((item_id IS NULL AND item_code IS NULL) OR (item_id IS NOT NULL AND item_code IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_purchase_order_line__line ON purch.purchase_order_line (tenant_id, purchase_order_id, line_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_purchase_order_line__item ON purch.purchase_order_line (tenant_id, item_id) WHERE item_id IS NOT NULL AND deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_purchase_order_line__grq_line ON purch.purchase_order_line (tenant_id, goods_request_line_id) WHERE goods_request_line_id IS NOT NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'purch', @table = 'purchase_order_line';
END
GO

-- @table   purch.goods_receipt
-- @purpose Goods received from a supplier into a store (FLT_GRN), against PO lines or without a PO; posting writes RECEIPT ledger rows.
-- @vector  Fleet.GoodsReceiveHeader
-- @owner   Fleet Procurement
-- @flags   T
-- @phase   4
IF OBJECT_ID('purch.goods_receipt') IS NULL
BEGIN
    CREATE TABLE purch.goods_receipt (
        goods_receipt_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_goods_receipt__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_GRN
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_goods_receipt__status DEFAULT 'DRAFT',   -- DRAFT, POSTED, CANCELLED
        supplier_party_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:party.party (role SUPPLIER)
        supplier_party_code     VARCHAR(25)         NOT NULL,   -- copy for lists
        supplier_name           NVARCHAR(200)       NULL,       -- copy for lists / print
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        purchase_order_id       UNIQUEIDENTIFIER    NULL,       -- ref purch.purchase_order (the screen's PO No; lines may span POs of the same supplier)
        purchase_order_no       VARCHAR(30)         NULL,
        delivery_note_no        VARCHAR(40)         NULL,
        supplier_invoice_no     VARCHAR(40)         NULL,
        received_at             DATETIMEOFFSET(7)   NOT NULL,
        received_by_name        NVARCHAR(150)       NULL,       -- the screen's Receipt By
        currency_code           CHAR(3)             NOT NULL,   -- document currency
        exchange_rate           DECIMAL(18,8)       NOT NULL CONSTRAINT df_goods_receipt__rate DEFAULT 1,
        subtotal_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_receipt__subtotal DEFAULT 0,   -- sum of line amounts after line discounts
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_receipt__discount DEFAULT 0,   -- header discount
        tax_code                VARCHAR(20)         NULL,       -- VAT code (gecko_master)
        tax_rate                DECIMAL(9,4)        NOT NULL CONSTRAINT df_goods_receipt__tax_rate DEFAULT 0,   -- % (the screen's VAT)
        tax_amount              DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_receipt__tax DEFAULT 0,
        total_amount            DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_receipt__total DEFAULT 0,   -- subtotal − discount + tax (server-calculated)
        posted_at               DATETIMEOFFSET(7)   NULL,       -- written to the stock ledger at
        posted_by               UNIQUEIDENTIFIER    NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_goods_receipt__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_goods_receipt__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_goods_receipt PRIMARY KEY CLUSTERED (goods_receipt_id),
        CONSTRAINT ck_goods_receipt__status CHECK (status IN ('DRAFT','POSTED','CANCELLED')),
        CONSTRAINT ck_goods_receipt__posted CHECK (status <> 'POSTED' OR posted_at IS NOT NULL),
        CONSTRAINT ck_goods_receipt__money CHECK (exchange_rate > 0 AND tax_rate >= 0 AND tax_rate <= 100)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_goods_receipt__document ON purch.goods_receipt (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_goods_receipt__branch_status ON purch.goods_receipt (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_goods_receipt__supplier ON purch.goods_receipt (tenant_id, supplier_party_id, status) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'purch', @table = 'goods_receipt';
END
GO

-- @table   purch.goods_receipt_line
-- @purpose One line received: PO line, qty, cost, bin, lot / serial, or straight to a work order.
-- @vector  Fleet.GoodsReceiveItem
-- @owner   Fleet Procurement
-- @flags   T
-- @phase   4
IF OBJECT_ID('purch.goods_receipt_line') IS NULL
BEGIN
    CREATE TABLE purch.goods_receipt_line (
        goods_receipt_line_id   UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_goods_receipt_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        goods_receipt_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref purch.goods_receipt
        line_no                 SMALLINT            NOT NULL,
        purchase_order_line_id  UNIQUEIDENTIFIER    NULL,       -- ref purch.purchase_order_line
        item_id                 UNIQUEIDENTIFIER    NULL,       -- ref inv.item (NULL = free text: a service or a one-off part)
        item_code               VARCHAR(40)         NULL,
        description             NVARCHAR(300)       NOT NULL,
        qty                     DECIMAL(18,4)       NOT NULL,   -- in uom_code
        uom_code                VARCHAR(10)         NOT NULL,
        uom_factor              DECIMAL(18,6)       NOT NULL,   -- base units per uom_code at entry
        unit_price              DECIMAL(18,4)       NOT NULL,   -- per uom_code, document currency
        discount_type           VARCHAR(10)         NULL,       -- PERCENT, AMOUNT
        discount_value          DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_receipt_line__discount DEFAULT 0,   -- % or amount as keyed
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_receipt_line__discount_amount DEFAULT 0,
        line_amount             DECIMAL(18,4)       NOT NULL,   -- qty × unit_price − discount_amount
        base_qty                DECIMAL(18,4)       NOT NULL,   -- qty × uom_factor
        unit_cost_base          DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_receipt_line__unit_cost DEFAULT 0,   -- line_amount × rate ÷ base_qty (base currency, base unit)
        bin_id                  UNIQUEIDENTIFIER    NULL,       -- ref inv.bin
        lot_no                  VARCHAR(60)         NULL,
        serial_no               VARCHAR(60)         NULL,
        expiry_date             DATE                NULL,
        stock_lot_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_lot (set at posting)
        direct_to_work_order_id UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order: received and issued in one go
        returned_base_qty       DECIMAL(18,4)       NOT NULL CONSTRAINT df_goods_receipt_line__returned DEFAULT 0,   -- posted vendor returns
        stock_ledger_id         UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_ledger RECEIPT (set at posting)
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_goods_receipt_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_goods_receipt_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_goods_receipt_line PRIMARY KEY CLUSTERED (goods_receipt_line_id),
        CONSTRAINT ck_goods_receipt_line__qty CHECK (qty > 0 AND uom_factor > 0 AND base_qty > 0 AND returned_base_qty >= 0 AND returned_base_qty <= base_qty),
        CONSTRAINT ck_goods_receipt_line__price CHECK (unit_price >= 0 AND unit_cost_base >= 0),
        CONSTRAINT ck_goods_receipt_line__discount_type CHECK (discount_type IS NULL OR discount_type IN ('PERCENT','AMOUNT')),
        CONSTRAINT ck_goods_receipt_line__item_pair CHECK ((item_id IS NULL AND item_code IS NULL) OR (item_id IS NOT NULL AND item_code IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_goods_receipt_line__line ON purch.goods_receipt_line (tenant_id, goods_receipt_id, line_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_goods_receipt_line__po_line ON purch.goods_receipt_line (tenant_id, purchase_order_line_id) WHERE purchase_order_line_id IS NOT NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'purch', @table = 'goods_receipt_line';
END
GO

-- @table   purch.vendor_return
-- @purpose Goods sent back to a supplier against posted GRN lines (FLT_RTV); valued at the received cost; expected credit.
-- @vector  Fleet.GoodsReturnHeader
-- @owner   Fleet Procurement
-- @flags   T
-- @phase   4
IF OBJECT_ID('purch.vendor_return') IS NULL
BEGIN
    CREATE TABLE purch.vendor_return (
        vendor_return_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_vendor_return__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_RTV
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_vendor_return__status DEFAULT 'DRAFT',   -- DRAFT, POSTED, CANCELLED
        supplier_party_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:party.party (role SUPPLIER)
        supplier_party_code     VARCHAR(25)         NOT NULL,   -- copy for lists
        supplier_name           NVARCHAR(200)       NULL,       -- copy for lists / print
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse taken from
        reason_code             VARCHAR(30)         NULL,       -- DAMAGED, WRONG_ITEM, EXCESS, WARRANTY, OTHER (open list)
        returned_by_name        NVARCHAR(150)       NULL,       -- the screen's Return By
        expected_credit_amount  DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_return__credit DEFAULT 0,   -- document currency
        currency_code           CHAR(3)             NOT NULL,
        total_cost              DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_return__total_cost DEFAULT 0,   -- base currency, set at posting
        posted_at               DATETIMEOFFSET(7)   NULL,       -- written to the stock ledger at
        posted_by               UNIQUEIDENTIFIER    NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_return__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_return__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_vendor_return PRIMARY KEY CLUSTERED (vendor_return_id),
        CONSTRAINT ck_vendor_return__status CHECK (status IN ('DRAFT','POSTED','CANCELLED')),
        CONSTRAINT ck_vendor_return__posted CHECK (status <> 'POSTED' OR posted_at IS NOT NULL),
        CONSTRAINT ck_vendor_return__reason CHECK (reason_code IS NULL OR (reason_code = UPPER(reason_code) COLLATE Latin1_General_100_CS_AS AND reason_code NOT LIKE '%[^A-Z0-9_]%'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_return__document ON purch.vendor_return (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_vendor_return__branch_status ON purch.vendor_return (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'purch', @table = 'vendor_return';
END
GO

-- @table   purch.vendor_return_line
-- @purpose One line sent back: the GRN line it comes from, qty, the received cost, the expected credit.
-- @vector  Fleet.GoodsReturnItem
-- @owner   Fleet Procurement
-- @flags   T
-- @phase   4
IF OBJECT_ID('purch.vendor_return_line') IS NULL
BEGIN
    CREATE TABLE purch.vendor_return_line (
        vendor_return_line_id   UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_vendor_return_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        vendor_return_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref purch.vendor_return
        line_no                 SMALLINT            NOT NULL,
        goods_receipt_line_id   UNIQUEIDENTIFIER    NOT NULL,   -- ref purch.goods_receipt_line
        purchase_order_no       VARCHAR(30)         NULL,       -- copy for the screen's PO No
        item_id                 UNIQUEIDENTIFIER    NULL,       -- ref inv.item
        item_code               VARCHAR(40)         NULL,
        description             NVARCHAR(300)       NOT NULL,
        serial_no               VARCHAR(60)         NULL,
        bin_id                  UNIQUEIDENTIFIER    NULL,
        stock_lot_id            UNIQUEIDENTIFIER    NULL,
        base_qty                DECIMAL(18,4)       NOT NULL,
        unit_cost_base          DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_return_line__unit_cost DEFAULT 0,   -- the GRN line's cost
        credit_unit_price       DECIMAL(18,4)       NOT NULL,   -- document currency, per base unit
        credit_amount           DECIMAL(18,4)       NOT NULL,
        stock_ledger_id         UNIQUEIDENTIFIER    NULL,       -- ref inv.stock_ledger VENDOR_RETURN (set at posting)
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_return_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_return_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_vendor_return_line PRIMARY KEY CLUSTERED (vendor_return_line_id),
        CONSTRAINT ck_vendor_return_line__qty CHECK (base_qty > 0 AND unit_cost_base >= 0 AND credit_unit_price >= 0 AND credit_amount >= 0),
        CONSTRAINT ck_vendor_return_line__item_pair CHECK ((item_id IS NULL AND item_code IS NULL) OR (item_id IS NOT NULL AND item_code IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_return_line__line ON purch.vendor_return_line (tenant_id, vendor_return_id, line_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_vendor_return_line__grn_line ON purch.vendor_return_line (tenant_id, goods_receipt_line_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'purch', @table = 'vendor_return_line';
END
GO

EXEC dbo.usp_record_script '13_purch.sql', N'purch: goods_request(+line), purchase_order(+line), goods_receipt(+line), vendor_return(+line) — all temporal';
GO

IF OBJECT_ID('history.purch_goods_request') IS NULL OR OBJECT_ID('history.purch_goods_request_line') IS NULL
   OR OBJECT_ID('history.purch_purchase_order') IS NULL OR OBJECT_ID('history.purch_purchase_order_line') IS NULL
   OR OBJECT_ID('history.purch_goods_receipt') IS NULL OR OBJECT_ID('history.purch_goods_receipt_line') IS NULL
   OR OBJECT_ID('history.purch_vendor_return') IS NULL OR OBJECT_ID('history.purch_vendor_return_line') IS NULL
    THROW 50000, '13_purch: a table or its history is missing.', 1;
GO
PRINT '13_purch.sql completed.';
GO
