-- ============================================================
-- GECKO TRUCKING — SUBCONTRACTOR DEDUCTION REQUESTS FROM FLEET (Fleet P5)
-- Script: 41_subcon_deduction_request.sql   (source kept with the Fleet docs; runs via FLEET_RUN)
--
--   settlement.subcon_deduction_request   one Fleet recharge line (case A, mode
--     DEDUCTION: workshop work / parts on a subcontractor's truck) waiting for the
--     subcontractor's next statement. Creating a statement turns the PENDING
--     requests of that subcontractor into DEDUCTION lines (negative amounts) and
--     marks them SETTLED; voiding the statement puts them back to PENDING.
--     Idempotent on (recharge_id, source_line_type, source_line_id): a replayed
--     release adds nothing.
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_trucking;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   settlement.subcon_deduction_request
-- @purpose A Fleet recharge line to deduct from a subcontractor's next statement: amount, source work order, status.
-- @vector  none — new (legacy deducted by hand)
-- @owner   Trucking Settlement
-- @flags   T
-- @phase   Fleet P5
IF OBJECT_ID('settlement.subcon_deduction_request') IS NULL
BEGIN
    CREATE TABLE settlement.subcon_deduction_request (
        subcon_deduction_request_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_subcon_deduction_request__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the work order's branch
        subcon_party_id         UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:party.party (the subcontractor)
        subcon_party_code       VARCHAR(25)         NOT NULL,
        source_context          VARCHAR(20)         NOT NULL CONSTRAINT df_subcon_deduction_request__source DEFAULT 'FLEET',
        recharge_id             UNIQUEIDENTIFIER    NOT NULL,   -- gecko_fleet maint.recharge
        recharge_no             VARCHAR(40)         NOT NULL,
        work_order_id           UNIQUEIDENTIFIER    NOT NULL,   -- gecko_fleet maint.work_order
        work_order_no           VARCHAR(30)         NOT NULL,
        vehicle_code            VARCHAR(30)         NULL,       -- the truck repaired
        source_line_type        VARCHAR(10)         NOT NULL,   -- PART, LABOR, SUBLET, SUNDRY
        source_line_id          UNIQUEIDENTIFIER    NULL,
        charge_code             VARCHAR(20)         NOT NULL,
        description             NVARCHAR(300)       NOT NULL,
        quantity                DECIMAL(18,4)       NOT NULL,
        unit_rate               DECIMAL(18,4)       NOT NULL,
        amount                  DECIMAL(18,2)       NOT NULL,   -- POSITIVE: what the subcontractor owes (the statement line is −amount)
        currency_code           CHAR(3)             NOT NULL,
        vat_code                VARCHAR(20)         NULL,
        vat_rate                DECIMAL(9,4)        NOT NULL CONSTRAINT df_subcon_deduction_request__vat DEFAULT 0,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_subcon_deduction_request__status DEFAULT 'PENDING',   -- PENDING, SETTLED, CANCELLED
        subcon_settlement_id    UNIQUEIDENTIFIER    NULL,       -- ref settlement.subcon_settlement (SETTLED)
        subcon_settlement_line_id UNIQUEIDENTIFIER  NULL,       -- ref settlement.subcon_settlement_line
        settled_at              DATETIMEOFFSET(7)   NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_subcon_deduction_request__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_subcon_deduction_request__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_subcon_deduction_request PRIMARY KEY CLUSTERED (subcon_deduction_request_id),
        CONSTRAINT ck_subcon_deduction_request__source CHECK (source_context IN ('FLEET')),
        CONSTRAINT ck_subcon_deduction_request__line_type CHECK (source_line_type IN ('PART','LABOR','SUBLET','SUNDRY')),
        CONSTRAINT ck_subcon_deduction_request__status CHECK (status IN ('PENDING','SETTLED','CANCELLED')),
        CONSTRAINT ck_subcon_deduction_request__settled CHECK (status <> 'SETTLED' OR subcon_settlement_id IS NOT NULL),
        CONSTRAINT ck_subcon_deduction_request__values CHECK (quantity > 0 AND unit_rate >= 0 AND amount > 0 AND vat_rate >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_subcon_deduction_request__source
        ON settlement.subcon_deduction_request (tenant_id, recharge_id, source_line_type, source_line_id) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_subcon_deduction_request__pending
        ON settlement.subcon_deduction_request (tenant_id, subcon_party_id, status, currency_code) INCLUDE (amount) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_subcon_deduction_request__settlement
        ON settlement.subcon_deduction_request (tenant_id, subcon_settlement_id) WHERE subcon_settlement_id IS NOT NULL;
    EXEC dbo.usp_enable_temporal @schema = 'settlement', @table = 'subcon_deduction_request';
END
GO

EXEC dbo.usp_record_script '41_subcon_deduction_request.sql', N'Fleet P5: settlement.subcon_deduction_request (Fleet recharge deductions waiting for the subcontractor statement; temporal)';
GO

IF OBJECT_ID('history.settlement_subcon_deduction_request') IS NULL
    THROW 50041, '41_subcon_deduction_request: the table or its history is missing.', 1;
GO
PRINT '41_subcon_deduction_request.sql completed.';
GO
