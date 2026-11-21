-- ============================================================
-- GECKO REVENUE — SCT TAX INVOICE / RECEIPT FOR SUBCONTRACTOR DEDUCTIONS (Fleet P14, recharge case A)
-- Script: 62_subcon_deduction_invoice.sql
-- Owner:  S12 Billing & E-invoice
--
-- Owner 2026-11-21: workshop work / parts deducted from a subcontractor's (รถร่วม) statement need an SCT tax
-- invoice. Standard practice (ERP / fleet SaaS, Thai Revenue Code s.78/1 — for a service the tax point is when
-- payment is received; netting against the payout IS the payment): ONE tax invoice / receipt per subcontractor per
-- PAID statement, dated the statement's paid date, one line per deducted Fleet recharge line (it names the work
-- order). Trucking queues trucking.subcon_settlement.paid; the Platform API's Revenue handler issues the invoice.
--
--   billing.subcon_deduction_invoice        one row per PAID statement that carried Fleet deductions → its invoice
--                                           (unique on the statement: a replayed message issues nothing twice).
--                                           settled_at = the offset (statement paid) date: the invoice needs no
--                                           cash receipt, it was paid by netting.
--   billing.subcon_deduction_invoice_line   marks a billing.invoice_line as a deduction line (invoice_line.charge_id =
--                                           Trucking's settlement.subcon_deduction_request id), with the recharge / WO.
--
-- PLAY SAFE = ADDITIVE ONLY (TOS is live on this database): two NEW tables; billing.invoice / invoice_line are
-- written by the API as for Fleet invoices (CREDIT type, numbered from the INVOICE series), nothing is altered.
-- Re-run 08_rls_policy.sql AFTER this script (it adds the RLS predicates for the new tables). Idempotent.
-- ============================================================

USE gecko_revenue;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   billing.subcon_deduction_invoice
-- @purpose The SCT tax invoice / receipt issued for the Fleet deductions on one PAID subcontractor statement.
-- @vector  none — new (legacy deducted by hand, no tax document)
-- @owner   S12 Billing & E-invoice
-- @flags   A
-- @phase   Fleet P14
IF OBJECT_ID('billing.subcon_deduction_invoice') IS NULL
BEGIN
    CREATE TABLE billing.subcon_deduction_invoice (
        invoice_id              UNIQUEIDENTIFIER    NOT NULL,   -- ref billing.invoice (same id, one-to-one)
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        subcon_settlement_id    UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_trucking settlement.subcon_settlement
        settlement_no           VARCHAR(30)         NOT NULL,
        subcon_party_code       VARCHAR(25)         NOT NULL,
        settled_at              DATETIMEOFFSET(7)   NOT NULL,   -- the statement's paid date: the invoice was paid by offset
        source_message_id       BIGINT              NULL,       -- the Trucking outbox message that issued it
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_subcon_deduction_invoice__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_subcon_deduction_invoice PRIMARY KEY CLUSTERED (invoice_id)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_subcon_deduction_invoice__settlement ON billing.subcon_deduction_invoice (tenant_id, subcon_settlement_id);
    CREATE NONCLUSTERED INDEX ix_subcon_deduction_invoice__party ON billing.subcon_deduction_invoice (tenant_id, subcon_party_code, settled_at);
    PRINT '>> billing.subcon_deduction_invoice created.';
END
GO

DENY UPDATE ON billing.subcon_deduction_invoice TO gecko_app;
DENY UPDATE ON billing.subcon_deduction_invoice TO gecko_system;
GO

-- @table   billing.subcon_deduction_invoice_line
-- @purpose Marks a billing.invoice_line as a deducted Fleet recharge line (subcon deduction request), with its recharge and work order.
-- @vector  none — new
-- @owner   S12 Billing & E-invoice
-- @flags   A
-- @phase   Fleet P14
IF OBJECT_ID('billing.subcon_deduction_invoice_line') IS NULL
BEGIN
    CREATE TABLE billing.subcon_deduction_invoice_line (
        invoice_line_id         UNIQUEIDENTIFIER    NOT NULL,   -- ref billing.invoice_line (same id, one-to-one)
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        invoice_id              UNIQUEIDENTIFIER    NOT NULL,   -- ref billing.invoice
        deduction_request_id    UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_trucking settlement.subcon_deduction_request
        recharge_id             UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_fleet maint.recharge
        recharge_no             VARCHAR(40)         NOT NULL,
        work_order_no           VARCHAR(30)         NOT NULL,
        vehicle_code            VARCHAR(30)         NULL,
        source_line_type        VARCHAR(10)         NOT NULL,   -- PART, LABOR, SUBLET, SUNDRY
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_subcon_deduction_invoice_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_subcon_deduction_invoice_line PRIMARY KEY CLUSTERED (invoice_line_id)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_subcon_deduction_invoice_line__request ON billing.subcon_deduction_invoice_line (tenant_id, deduction_request_id);
    CREATE NONCLUSTERED INDEX ix_subcon_deduction_invoice_line__invoice ON billing.subcon_deduction_invoice_line (tenant_id, invoice_id);
    CREATE NONCLUSTERED INDEX ix_subcon_deduction_invoice_line__recharge ON billing.subcon_deduction_invoice_line (tenant_id, recharge_id);
    PRINT '>> billing.subcon_deduction_invoice_line created.';
END
GO

DENY UPDATE ON billing.subcon_deduction_invoice_line TO gecko_app;
DENY UPDATE ON billing.subcon_deduction_invoice_line TO gecko_system;
GO

EXEC dbo.usp_record_script '62_subcon_deduction_invoice.sql', N'Fleet P14: billing.subcon_deduction_invoice + _line (A): SCT tax invoice per PAID subcontractor statement; additive only';
GO

IF OBJECT_ID('billing.subcon_deduction_invoice') IS NULL OR OBJECT_ID('billing.subcon_deduction_invoice_line') IS NULL
    THROW 50620, '62_subcon_deduction_invoice: a table is missing.', 1;
GO
PRINT '>> 62_subcon_deduction_invoice.sql completed. Re-run 08_rls_policy.sql next (FLEET_RUN 062).';
GO
