-- ============================================================
-- GECKO FLEET — RECHARGE (P5)
-- Script: 14_maint_recharge.sql
--
--   maint.recharge   one release of a work order's billable lines to one bill-to
--                    party in one mode:
--                      INVOICE    (case B, customer damage) → gecko_revenue billing.fleet_charge
--                      DEDUCTION  (case A, subcontractor truck) → gecko_trucking
--                                 settlement.subcon_deduction_request
--                    Prices are fixed on the WO lines (recharge block) at release.
--                    The other database is written after the Fleet save, in
--                    process; the recharge id is the idempotency key, so a failed
--                    delivery (status FAILED, delivery_error) is simply retried.
--                    Status: RELEASED → ACCEPTED (delivered) → INVOICED / DEDUCTED
--                    (read back from Revenue / Trucking); FAILED; CANCELLED.
-- The WO lines point at it through recharge_id (11_maint_wr_wo).
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   maint.recharge
-- @purpose One release of a work order's billable lines to a customer invoice (Revenue) or a subcontractor deduction (Trucking), with totals and delivery status.
-- @vector  Fleet.WorkOrderInvoice (legacy WO receipt)
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   5
IF OBJECT_ID('maint.recharge') IS NULL
BEGIN
    CREATE TABLE maint.recharge (
        recharge_id             UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_recharge__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the work order's branch
        recharge_no             VARCHAR(40)         NOT NULL,   -- <WO no>-R<n>
        work_order_id           UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.work_order
        work_order_no           VARCHAR(30)         NOT NULL,
        bill_to_party_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:party.party
        bill_to_party_code      VARCHAR(25)         NOT NULL,
        bill_to_name            NVARCHAR(200)       NULL,
        recharge_mode           VARCHAR(20)         NOT NULL,   -- INVOICE, DEDUCTION
        currency_code           CHAR(3)             NOT NULL,
        rate_card_code          VARCHAR(30)         NULL,       -- the repair card that priced it (NULL = keyed prices)
        labor_amount            DECIMAL(18,2)       NOT NULL CONSTRAINT df_recharge__labor DEFAULT 0,
        parts_amount            DECIMAL(18,2)       NOT NULL CONSTRAINT df_recharge__parts DEFAULT 0,
        sublet_amount           DECIMAL(18,2)       NOT NULL CONSTRAINT df_recharge__sublet DEFAULT 0,
        sundry_amount           DECIMAL(18,2)       NOT NULL CONSTRAINT df_recharge__sundry DEFAULT 0,
        discount_amount         DECIMAL(18,2)       NOT NULL CONSTRAINT df_recharge__discount DEFAULT 0,
        net_amount              DECIMAL(18,2)       NOT NULL CONSTRAINT df_recharge__net DEFAULT 0,   -- after discounts
        tax_amount              DECIMAL(18,2)       NOT NULL CONSTRAINT df_recharge__tax DEFAULT 0,   -- VAT estimate (the invoice decides)
        total_amount            DECIMAL(18,2)       NOT NULL CONSTRAINT df_recharge__total DEFAULT 0,
        line_count              SMALLINT            NOT NULL CONSTRAINT df_recharge__lines DEFAULT 0,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_recharge__status DEFAULT 'RELEASED',   -- RELEASED, ACCEPTED, INVOICED, DEDUCTED, FAILED, CANCELLED
        released_at             DATETIMEOFFSET(7)   NOT NULL,
        released_by             UNIQUEIDENTIFIER    NULL,
        delivered_at            DATETIMEOFFSET(7)   NULL,
        delivery_attempts       SMALLINT            NOT NULL CONSTRAINT df_recharge__attempts DEFAULT 0,
        delivery_error          NVARCHAR(1000)      NULL,
        external_ref            VARCHAR(60)         NULL,       -- Revenue invoice no / Trucking statement no, once known
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_recharge__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_recharge__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_recharge PRIMARY KEY CLUSTERED (recharge_id),
        CONSTRAINT ck_recharge__mode CHECK (recharge_mode IN ('INVOICE','DEDUCTION')),
        CONSTRAINT ck_recharge__status CHECK (status IN ('RELEASED','ACCEPTED','INVOICED','DEDUCTED','FAILED','CANCELLED')),
        CONSTRAINT ck_recharge__delivered CHECK (status NOT IN ('ACCEPTED','INVOICED','DEDUCTED') OR delivered_at IS NOT NULL),
        CONSTRAINT ck_recharge__cancelled CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL),
        CONSTRAINT ck_recharge__amounts CHECK (net_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0 AND discount_amount >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_recharge__no ON maint.recharge (tenant_id, recharge_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_recharge__work_order ON maint.recharge (tenant_id, work_order_id) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_recharge__status ON maint.recharge (tenant_id, branch_id, status, released_at) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'recharge';
END
GO

EXEC dbo.usp_record_script '14_maint_recharge.sql', N'maint.recharge: one release of billable WO lines (INVOICE → Revenue fleet_charge, DEDUCTION → Trucking subcon_deduction_request); temporal';
GO

IF OBJECT_ID('history.maint_recharge') IS NULL
    THROW 50000, '14_maint_recharge: the table or its history is missing.', 1;
GO
PRINT '14_maint_recharge.sql completed.';
GO
