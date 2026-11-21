-- ============================================================
-- GECKO FLEET — STORE TRANSFER TARGETS (P13 backend #12)
-- Script: 23_inv_transfer_target.sql
--
--   inv.warehouse_transfer_target   the stores a store may send stock to (11 Q6, live B3). One row per
--                                     (sending store, receiving store). A store with NO rows may send to any active
--                                     store (open, as before); once it has rows, a transfer to a store not on its list
--                                     is refused by the API (400). Rows are soft-deleted when the list is replaced.
-- Additive only: a new table, nothing existing changes. Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   inv.warehouse_transfer_target
-- @purpose The receiving stores a sending store may transfer stock to (empty = any active store).
-- @vector  Stock.Location
-- @owner   Fleet Inventory
-- @flags   T
-- @phase   13
IF OBJECT_ID('inv.warehouse_transfer_target') IS NULL
BEGIN
    CREATE TABLE inv.warehouse_transfer_target (
        warehouse_transfer_target_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_warehouse_transfer_target__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the sending store's branch
        from_warehouse_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse (sender)
        to_warehouse_id         UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.warehouse (receiver, any branch of the tenant)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_warehouse_transfer_target__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_warehouse_transfer_target__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_warehouse_transfer_target PRIMARY KEY CLUSTERED (warehouse_transfer_target_id),
        CONSTRAINT ck_warehouse_transfer_target__not_self CHECK (from_warehouse_id <> to_warehouse_id)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_warehouse_transfer_target__pair
        ON inv.warehouse_transfer_target (tenant_id, from_warehouse_id, to_warehouse_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'inv', @table = 'warehouse_transfer_target';
END
GO

EXEC dbo.usp_record_script '23_inv_transfer_target.sql', N'P13 #12: inv.warehouse_transfer_target (store transfer targets)';
GO

IF OBJECT_ID('inv.warehouse_transfer_target') IS NULL
    THROW 50000, '23_inv_transfer_target: the table is missing.', 1;
GO
PRINT '23_inv_transfer_target.sql completed.';
GO
