-- ============================================================
-- GECKO FLEET — STOCK REVALUATION ON INVOICE PRICE VARIANCE (P12c)
-- Script: 21_inv_cost_adjustment.sql
--
--   inv.cost_adjustment   a value-only correction of a stock item's cost when the supplier invoices a GRN line at another
--                           price than it was received at. inv.stock_ledger cannot carry it (ck_stock_ledger__qty needs a
--                           quantity and CHECKs never change), so the value moves here:
--                             revalued_amount  → the qty still on hand at the store (stock_balance avg / value move)
--                             expensed_amount  → the share already issued (direct-to-WO lines: that WO's asset, posted to the
--                                                cost ledger as PRICE_VARIANCE; otherwise kept here, unattributed)
--                           Append-only: cancelling the invoice appends a reversing row (reverses_cost_adjustment_id).
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   inv.cost_adjustment
-- @purpose Value-only stock cost correction from a vendor invoice price variance on a GRN line (revalued on hand + expensed issued share).
-- @vector  (new)
-- @owner   Fleet Inventory
-- @flags   A
-- @phase   12
IF OBJECT_ID('inv.cost_adjustment') IS NULL
BEGIN
    CREATE TABLE inv.cost_adjustment (
        cost_adjustment_id      UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_cost_adjustment__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the warehouse's branch
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        warehouse_id            UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse
        vendor_invoice_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref ap.vendor_invoice
        vendor_invoice_line_id  UNIQUEIDENTIFIER    NOT NULL,   -- ref ap.vendor_invoice_line
        goods_receipt_line_id   UNIQUEIDENTIFIER    NOT NULL,   -- ref purch.goods_receipt_line
        source_doc_no           VARCHAR(30)         NOT NULL,   -- the vendor invoice document no.
        basis_qty               DECIMAL(18,4)       NOT NULL,   -- base units the variance is on (invoice qty × GRN uom factor)
        value_delta             DECIMAL(18,4)       NOT NULL,   -- signed, base currency (invoice − received value)
        qty_on_hand             DECIMAL(18,4)       NOT NULL,   -- item × warehouse on hand when posted
        avg_cost_before         DECIMAL(18,4)       NOT NULL,
        avg_cost_after          DECIMAL(18,4)       NOT NULL,
        revalued_amount         DECIMAL(18,4)       NOT NULL,   -- part of value_delta put on the stock still on hand
        expensed_amount         DECIMAL(18,4)       NOT NULL,   -- the rest (already issued)
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order (direct-to-WO receipt)
        asset_profile_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.asset_profile (expensed share goes to its cost)
        currency_code           CHAR(3)             NOT NULL,   -- base currency
        reverses_cost_adjustment_id UNIQUEIDENTIFIER NULL,      -- ref inv.cost_adjustment (invoice cancelled)
        posted_at               DATETIMEOFFSET(7)   NOT NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_cost_adjustment__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_cost_adjustment PRIMARY KEY CLUSTERED (cost_adjustment_id),
        CONSTRAINT ck_cost_adjustment__values CHECK (value_delta <> 0 AND basis_qty > 0 AND avg_cost_before >= 0 AND avg_cost_after >= 0
                                                      AND revalued_amount + expensed_amount = value_delta),
        CONSTRAINT ck_cost_adjustment__currency CHECK (currency_code LIKE '[A-Z][A-Z][A-Z]')
    );
    CREATE NONCLUSTERED INDEX ix_cost_adjustment__item ON inv.cost_adjustment (tenant_id, item_id, warehouse_id, posted_at) INCLUDE (value_delta, revalued_amount, expensed_amount);
    CREATE NONCLUSTERED INDEX ix_cost_adjustment__invoice ON inv.cost_adjustment (tenant_id, vendor_invoice_id);
    CREATE UNIQUE NONCLUSTERED INDEX uq_cost_adjustment__line ON inv.cost_adjustment (tenant_id, vendor_invoice_line_id) WHERE reverses_cost_adjustment_id IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_cost_adjustment__reverses ON inv.cost_adjustment (tenant_id, reverses_cost_adjustment_id) WHERE reverses_cost_adjustment_id IS NOT NULL;
    EXEC dbo.usp_make_append_only @schema = 'inv', @table = 'cost_adjustment';
END
GO

EXEC dbo.usp_record_script '21_inv_cost_adjustment.sql', N'P12c: inv.cost_adjustment (append-only, invoice price variance revaluation)';
GO

IF OBJECT_ID('inv.cost_adjustment') IS NULL
    THROW 50000, '21_inv_cost_adjustment: the table is missing.', 1;
GO
PRINT '21_inv_cost_adjustment.sql completed.';
GO
