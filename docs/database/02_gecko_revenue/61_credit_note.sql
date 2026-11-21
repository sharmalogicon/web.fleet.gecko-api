-- ============================================================
-- GECKO REVENUE — CREDIT NOTES (ใบลดหนี้) FOR ISSUED INVOICES (Fleet P12e)
-- Script: 61_credit_note.sql
-- Owner:  S12 Billing & E-invoice
--
-- Owner 2026-11-21 (P12e option 1, "play safe"): credit notes are built in
-- Revenue for EVERY product (TOS, Trucking, Fleet), database and API only —
-- no TOS / Trucking screen changes. Every credit invoice of every product is a
-- billing.invoice + billing.invoice_line (27), so one pair of NEW tables covers
-- them all.
--
-- PLAY SAFE = ADDITIVE ONLY. Nothing here alters, re-checks or writes to an
-- existing table: billing.invoice / invoice_line, billing.charge,
-- billing.trucking_charge and billing.fleet_charge are untouched. A credit note
-- does NOT change the status of the charges it credits (INVOICED stays
-- INVOICED); re-billing a corrected line is a new charge, as today.
--
--   billing.credit_note        one credit note against ONE issued invoice
--                              (Thai Revenue Code s.86/10: it names the
--                              original tax invoice and the reason). Numbered
--                              from the tenant's existing CREDIT_NOTE series
--                              (12: prefix CN, per branch and month, gap-free).
--                              ISSUED at once; CANCELLED keeps its number.
--   billing.credit_note_line   the amount credited on one invoice line (net of
--                              tax), with the line's tax rate copied. The API
--                              refuses more than what is left on the line
--                              (invoice line amount − ISSUED credit notes).
--
-- E-INVOICE: nothing submits invoices yet (billing.einvoice_submission has no
-- writer). When e-Tax submission is built, credit notes go the same way
-- (a credit_note_id column on einvoice_submission, additive).
--
-- ORDER: after 27 and 60. These tables are outside RLS until 08_rls_policy.sql
-- runs again (it regenerates the policy over every tenant table) — the next
-- FLEET_RUN entry. Idempotent.
-- ============================================================

USE gecko_revenue;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('billing.invoice') IS NULL
    THROW 50610, 'Run 27_invoice.sql first.', 1;
GO

-- ============================================================
-- 1. billing.credit_note
-- ============================================================

-- @table   billing.credit_note
-- @purpose A credit note (ใบลดหนี้) against one issued invoice: number, reason, totals, status.
-- @vector  Invoice.CreditNote (TOS / Fleet desktop WO credit note)
-- @owner   S12 Billing & E-invoice
-- @flags   T
-- @phase   Fleet P12e
IF OBJECT_ID('billing.credit_note') IS NULL
BEGIN
    CREATE TABLE billing.credit_note (
        credit_note_id      UNIQUEIDENTIFIER    NOT NULL,
        tenant_id           UNIQUEIDENTIFIER    NOT NULL,
        branch_id           UNIQUEIDENTIFIER    NOT NULL,
        credit_note_no      VARCHAR(30)         NOT NULL,
        invoice_id          UNIQUEIDENTIFIER    NOT NULL,   -- ref billing.invoice
        invoice_no          VARCHAR(30)         NOT NULL,
        source              VARCHAR(10)         NOT NULL,   -- what the invoice billed: TOS, TRUCKING, FLEET
        status              VARCHAR(10)         NOT NULL CONSTRAINT df_credit_note__status DEFAULT 'ISSUED',
        reason              NVARCHAR(500)       NOT NULL,
        payer_party_code    VARCHAR(30)         NULL,
        payer_name          NVARCHAR(300)       NULL,
        currency_code       VARCHAR(3)          NOT NULL,
        subtotal_amount     DECIMAL(18,2)       NOT NULL,
        tax_amount          DECIMAL(18,2)       NOT NULL,
        total_amount        DECIMAL(18,2)       NOT NULL,
        remarks             NVARCHAR(500)       NULL,
        issued_at           DATETIMEOFFSET(7)   NOT NULL,
        issued_by           UNIQUEIDENTIFIER    NOT NULL,
        cancelled_at        DATETIMEOFFSET(7)   NULL,
        cancelled_by        UNIQUEIDENTIFIER    NULL,
        cancel_reason       NVARCHAR(500)       NULL,
        created_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_credit_note__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by          UNIQUEIDENTIFIER    NULL,
        updated_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_credit_note__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by          UNIQUEIDENTIFIER    NULL,
        row_version         ROWVERSION          NOT NULL,
        CONSTRAINT pk_credit_note PRIMARY KEY CLUSTERED (credit_note_id),
        CONSTRAINT ck_credit_note__source CHECK (source IN ('TOS','TRUCKING','FLEET')),
        CONSTRAINT ck_credit_note__status CHECK (status IN ('ISSUED','CANCELLED')),
        CONSTRAINT ck_credit_note__cancelled CHECK (status <> 'CANCELLED' OR (cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL)),
        CONSTRAINT ck_credit_note__money CHECK (subtotal_amount > 0 AND tax_amount >= 0 AND total_amount = subtotal_amount + tax_amount)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_credit_note__no ON billing.credit_note (tenant_id, credit_note_no);
    CREATE NONCLUSTERED INDEX ix_credit_note__invoice ON billing.credit_note (tenant_id, invoice_id);
    CREATE NONCLUSTERED INDEX ix_credit_note__payer ON billing.credit_note (tenant_id, branch_id, payer_party_code, issued_at);
    PRINT '>> billing.credit_note created.';
END
GO

-- A person cancels a credit note: every change kept (27 / 60's pattern).
IF (SELECT temporal_type FROM sys.tables WHERE object_id = OBJECT_ID('billing.credit_note')) = 0
BEGIN
    ALTER TABLE billing.credit_note ADD
        sys_valid_from DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL
            CONSTRAINT df_billing_credit_note__sys_valid_from DEFAULT SYSUTCDATETIME(),
        sys_valid_to   DATETIME2(7) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL
            CONSTRAINT df_billing_credit_note__sys_valid_to DEFAULT CONVERT(DATETIME2(7), '9999-12-31 23:59:59.9999999'),
        PERIOD FOR SYSTEM_TIME (sys_valid_from, sys_valid_to);
    ALTER TABLE billing.credit_note SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = history.billing_credit_note, DATA_CONSISTENCY_CHECK = ON));
    PRINT '>> billing.credit_note is system-versioned.';
END
GO

-- ============================================================
-- 2. billing.credit_note_line
-- ============================================================

-- @table   billing.credit_note_line
-- @purpose The amount credited on one invoice line (net of tax) and its tax, copied from the line.
-- @vector  Invoice.CreditNoteDetail
-- @owner   S12 Billing & E-invoice
-- @flags   A
-- @phase   Fleet P12e
IF OBJECT_ID('billing.credit_note_line') IS NULL
BEGIN
    CREATE TABLE billing.credit_note_line (
        credit_note_line_id UNIQUEIDENTIFIER    NOT NULL,
        tenant_id           UNIQUEIDENTIFIER    NOT NULL,
        credit_note_id      UNIQUEIDENTIFIER    NOT NULL,   -- ref billing.credit_note
        line_no             SMALLINT            NOT NULL,
        invoice_line_id     UNIQUEIDENTIFIER    NOT NULL,   -- ref billing.invoice_line
        charge_id           UNIQUEIDENTIFIER    NOT NULL,   -- the invoice line's charge (charge / trucking_charge / fleet_charge id)
        order_no            VARCHAR(30)         NULL,       -- booking / job order / work order no, as on the invoice line
        container_no        VARCHAR(15)         NULL,
        charge_code         VARCHAR(15)         NOT NULL,
        charge_name         NVARCHAR(400)       NULL,
        quantity            DECIMAL(18,3)       NOT NULL,   -- informational: the invoice line's quantity
        amount              DECIMAL(18,2)       NOT NULL,   -- credited, net of tax
        tax_code            VARCHAR(20)         NULL,
        tax_rate            DECIMAL(9,4)        NOT NULL CONSTRAINT df_credit_note_line__tax_rate DEFAULT 0,
        tax_amount          DECIMAL(18,2)       NOT NULL CONSTRAINT df_credit_note_line__tax DEFAULT 0,
        created_at          DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_credit_note_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by          UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_credit_note_line PRIMARY KEY CLUSTERED (credit_note_line_id),
        CONSTRAINT ck_credit_note_line__values CHECK (amount > 0 AND tax_rate >= 0 AND tax_amount >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_credit_note_line__no ON billing.credit_note_line (credit_note_id, line_no);
    CREATE UNIQUE NONCLUSTERED INDEX uq_credit_note_line__invoice_line ON billing.credit_note_line (credit_note_id, invoice_line_id);
    CREATE NONCLUSTERED INDEX ix_credit_note_line__invoice_line ON billing.credit_note_line (tenant_id, invoice_line_id) INCLUDE (amount, credit_note_id);
    PRINT '>> billing.credit_note_line created.';
END
GO

DENY UPDATE ON billing.credit_note_line TO gecko_app;
DENY UPDATE ON billing.credit_note_line TO gecko_system;
GO

EXEC dbo.usp_record_script '61_credit_note.sql', N'Fleet P12e: billing.credit_note (temporal, series CREDIT_NOTE, ISSUED/CANCELLED, one invoice) + billing.credit_note_line (A); additive only, no existing table touched';
GO

IF OBJECT_ID('history.billing_credit_note') IS NULL OR OBJECT_ID('billing.credit_note_line') IS NULL
    THROW 50611, '61_credit_note: a table or its history is missing.', 1;
GO
PRINT '>> 61_credit_note.sql completed. Re-run 08_rls_policy.sql next (FLEET_RUN 056).';
GO
