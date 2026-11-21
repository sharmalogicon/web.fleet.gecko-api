-- ============================================================
-- GECKO FLEET — VENDOR PAYMENT APPROVAL (P12a)
-- Script: 20_ap_payment_approval.sql
--
--   ap.payment            + requires_approval (additive column; the table stays append-only): 1 = keyed while the
--                           setting VENDOR_PAYMENT_APPROVAL was on, so it counts on the invoice only once approved.
--                           Payments pulled from SAP (source ERP) never need it.
--   ap.payment_approval   the decision on such a payment (APPROVED / REJECTED), by someone other than who keyed it;
--                           append-only, one decision per payment.
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('ap.payment', 'requires_approval') IS NULL
    ALTER TABLE ap.payment ADD requires_approval BIT NOT NULL CONSTRAINT df_payment__requires_approval DEFAULT 0;
GO

-- @table   ap.payment_approval
-- @purpose The approve / reject decision on a vendor payment that needed approval (the Vendor Payments screen's Approve).
-- @vector  billing/vendor-payment (IsApproved, ApprovedBy, ApprovedOn)
-- @owner   Fleet Finance
-- @flags   A
-- @phase   12
IF OBJECT_ID('ap.payment_approval') IS NULL
BEGIN
    CREATE TABLE ap.payment_approval (
        payment_approval_id     UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_payment_approval__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        payment_id              UNIQUEIDENTIFIER    NOT NULL,   -- ref ap.payment
        decision                VARCHAR(10)         NOT NULL,   -- APPROVED, REJECTED
        reason                  NVARCHAR(500)       NULL,
        decided_at              DATETIMEOFFSET(7)   NOT NULL,
        decided_by              UNIQUEIDENTIFIER    NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_payment_approval__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_payment_approval PRIMARY KEY CLUSTERED (payment_approval_id),
        CONSTRAINT ck_payment_approval__decision CHECK (decision IN ('APPROVED','REJECTED')),
        CONSTRAINT ck_payment_approval__reason CHECK (decision = 'APPROVED' OR reason IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_payment_approval__payment ON ap.payment_approval (tenant_id, payment_id);
    EXEC dbo.usp_make_append_only @schema = 'ap', @table = 'payment_approval';
END
GO

EXEC dbo.usp_record_script '20_ap_payment_approval.sql', N'P12a: ap.payment.requires_approval, ap.payment_approval (append-only)';
GO

IF COL_LENGTH('ap.payment', 'requires_approval') IS NULL OR OBJECT_ID('ap.payment_approval') IS NULL
    THROW 50000, '20_ap_payment_approval: a column or table is missing.', 1;
GO
PRINT '20_ap_payment_approval.sql completed.';
GO
