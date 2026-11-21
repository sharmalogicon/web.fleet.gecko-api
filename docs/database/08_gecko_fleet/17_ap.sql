-- ============================================================
-- GECKO FLEET — VENDOR BILLING, AP-LITE (P8)
-- Script: 17_ap.sql
--
--   ap.vendor_invoice              a supplier's invoice keyed against what Fleet received (FLT_VIN =
--                                  internal reference; vendor_invoice_no = the supplier's number,
--                                  unique per supplier). Three-way match per line against the GRN line
--                                  (PO price when there is one, qty less returns), the WO sublet's
--                                  actual cost or the tyre-shop event cost; inside the tolerance
--                                  (settings INVOICE_MATCH_TOLERANCE_PCT / _AMOUNT) = MATCHED.
--                                  DRAFT → PENDING_APPROVAL (EXCEPTION only) → APPROVED → EXPORTED →
--                                  PAID; CANCELLED (not once exported).
--   ap.vendor_invoice_line         one invoiced line; source GRN_LINE / WO_SUBLET / TYRE_EVENT / MANUAL.
--                                  A source line sits on one live invoice only (is_released = 0).
--   ap.vendor_credit_note          a supplier's credit note (FLT_VCN), against an invoice and / or a
--                                  vendor return. DRAFT → APPROVED → EXPORTED; CANCELLED.
--   ap.vendor_credit_note_line     source RTV_LINE / INVOICE_LINE / MANUAL.
--   ap.export_batch                one export of approved documents to the ERP: CSV now, SAP Business
--                                  One in P10 (target SAP_B1, per-document DocEntry on the documents).
--   ap.payment                     payments recorded against an invoice (MANUAL now, ERP in P10);
--                                  append-only — a wrong payment is offset by a negative one.
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   ap.export_batch
-- @purpose One export of approved vendor invoices / credit notes to the ERP (CSV file now, SAP B1 Service Layer in P10).
-- @vector  (new)
-- @owner   Fleet Finance
-- @flags   -
-- @phase   8
IF OBJECT_ID('ap.export_batch') IS NULL
BEGIN
    CREATE TABLE ap.export_batch (
        export_batch_id         UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_export_batch__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        batch_no                VARCHAR(30)         NOT NULL,   -- EXP-yyyyMMdd-HHmmss (UTC)
        target                  VARCHAR(10)         NOT NULL CONSTRAINT df_export_batch__target DEFAULT 'CSV',   -- CSV, SAP_B1
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_export_batch__status DEFAULT 'CREATED',   -- CREATED, SENT, PARTLY_FAILED, FAILED
        invoice_count           INT                 NOT NULL CONSTRAINT df_export_batch__invoices DEFAULT 0,
        credit_note_count       INT                 NOT NULL CONSTRAINT df_export_batch__credits DEFAULT 0,
        invoice_total           DECIMAL(18,4)       NOT NULL CONSTRAINT df_export_batch__invoice_total DEFAULT 0,   -- base currency, net payable
        credit_total            DECIMAL(18,4)       NOT NULL CONSTRAINT df_export_batch__credit_total DEFAULT 0,
        attachment_id           UNIQUEIDENTIFIER    NULL,       -- ref doc.attachment (the CSV file)
        exported_at             DATETIMEOFFSET(7)   NOT NULL,
        exported_by             UNIQUEIDENTIFIER    NULL,
        error_text              NVARCHAR(2000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_export_batch__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_export_batch__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_export_batch PRIMARY KEY CLUSTERED (export_batch_id),
        CONSTRAINT ck_export_batch__target CHECK (target IN ('CSV','SAP_B1')),
        CONSTRAINT ck_export_batch__status CHECK (status IN ('CREATED','SENT','PARTLY_FAILED','FAILED')),
        CONSTRAINT ck_export_batch__counts CHECK (invoice_count >= 0 AND credit_note_count >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_export_batch__no ON ap.export_batch (tenant_id, batch_no) WHERE deleted_at IS NULL;
END
GO

-- @table   ap.vendor_invoice
-- @purpose A supplier's invoice: supplier, their number and dates, money block with discount, VAT and WHT, three-way match result, status.
-- @vector  Fleet.InvoiceHeader (type 526)
-- @owner   Fleet Finance
-- @flags   T
-- @phase   8
IF OBJECT_ID('ap.vendor_invoice') IS NULL
BEGIN
    CREATE TABLE ap.vendor_invoice (
        vendor_invoice_id       UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_vendor_invoice__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_VIN (internal reference)
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_vendor_invoice__status DEFAULT 'DRAFT',   -- DRAFT, PENDING_APPROVAL, APPROVED, EXPORTED, PAID, CANCELLED
        supplier_party_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:party.party (role SUPPLIER)
        supplier_party_code     VARCHAR(25)         NOT NULL,
        supplier_name           NVARCHAR(200)       NULL,
        supplier_address        NVARCHAR(500)       NULL,       -- copy for print (the screen's Address)
        vendor_invoice_no       VARCHAR(40)         NOT NULL,   -- the supplier's own number
        invoice_date            DATE                NOT NULL,
        due_date                DATE                NULL,
        payment_term_code       VARCHAR(20)         NULL,       -- the screen's Credit Term
        currency_code           CHAR(3)             NOT NULL,
        exchange_rate           DECIMAL(18,8)       NOT NULL CONSTRAINT df_vendor_invoice__rate DEFAULT 1,
        subtotal_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__subtotal DEFAULT 0,   -- sum of line amounts
        discount_type           VARCHAR(10)         NULL,       -- PERCENT, AMOUNT (header discount as keyed)
        discount_value          DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__discount_value DEFAULT 0,
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__discount DEFAULT 0,
        tax_code                VARCHAR(20)         NULL,
        tax_rate                DECIMAL(9,4)        NOT NULL CONSTRAINT df_vendor_invoice__tax_rate DEFAULT 0,
        tax_amount              DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__tax DEFAULT 0,
        total_amount            DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__total DEFAULT 0,   -- subtotal − discount + tax
        wht_code                VARCHAR(20)         NULL,
        wht_rate                DECIMAL(9,4)        NOT NULL CONSTRAINT df_vendor_invoice__wht_rate DEFAULT 0,   -- 0 = no withholding
        wht_base_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__wht_base DEFAULT 0,   -- service lines after their share of the discount
        wht_amount              DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__wht DEFAULT 0,
        net_payable             DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__net DEFAULT 0,   -- total − WHT
        match_status            VARCHAR(20)         NOT NULL CONSTRAINT df_vendor_invoice__match DEFAULT 'UNMATCHED',   -- UNMATCHED, MATCHED, EXCEPTION
        expected_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__expected DEFAULT 0,   -- matched lines: what Fleet expected
        variance_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__variance DEFAULT 0,   -- matched lines: invoiced − expected
        paid_amount             DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_invoice__paid DEFAULT 0,
        last_paid_at            DATE                NULL,
        submitted_at            DATETIMEOFFSET(7)   NULL,
        approved_at             DATETIMEOFFSET(7)   NULL,
        approved_by             UNIQUEIDENTIFIER    NULL,
        approval_note           NVARCHAR(500)       NULL,       -- why an exception was accepted / rejected
        export_batch_id         UNIQUEIDENTIFIER    NULL,       -- ref ap.export_batch
        exported_at             DATETIMEOFFSET(7)   NULL,
        erp_doc_entry           VARCHAR(30)         NULL,       -- SAP B1 DocEntry (P10)
        erp_doc_num             VARCHAR(30)         NULL,
        erp_error               NVARCHAR(1000)      NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_invoice__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_invoice__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_vendor_invoice PRIMARY KEY CLUSTERED (vendor_invoice_id),
        CONSTRAINT ck_vendor_invoice__status CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','EXPORTED','PAID','CANCELLED')),
        CONSTRAINT ck_vendor_invoice__match CHECK (match_status IN ('UNMATCHED','MATCHED','EXCEPTION')),
        CONSTRAINT ck_vendor_invoice__discount_type CHECK (discount_type IS NULL OR discount_type IN ('PERCENT','AMOUNT')),
        CONSTRAINT ck_vendor_invoice__money CHECK (exchange_rate > 0 AND tax_rate >= 0 AND tax_rate <= 100 AND wht_rate >= 0 AND wht_rate <= 100
                                                   AND discount_value >= 0 AND discount_amount >= 0 AND paid_amount >= 0),
        CONSTRAINT ck_vendor_invoice__currency CHECK (currency_code LIKE '[A-Z][A-Z][A-Z]'),
        CONSTRAINT ck_vendor_invoice__cancelled CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL),
        CONSTRAINT ck_vendor_invoice__exported CHECK (status NOT IN ('EXPORTED','PAID') OR exported_at IS NOT NULL OR paid_amount > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_invoice__document ON ap.vendor_invoice (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_invoice__supplier_no ON ap.vendor_invoice (tenant_id, supplier_party_id, vendor_invoice_no)
        WHERE deleted_at IS NULL AND cancelled_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_vendor_invoice__status ON ap.vendor_invoice (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_vendor_invoice__batch ON ap.vendor_invoice (tenant_id, export_batch_id) WHERE export_batch_id IS NOT NULL;
    EXEC dbo.usp_enable_temporal @schema = 'ap', @table = 'vendor_invoice';
END
GO

-- @table   ap.vendor_invoice_line
-- @purpose One invoiced line: what it bills (GRN line, WO sublet, tyre-shop event, free text), invoiced vs expected, variance.
-- @vector  Fleet.InvoiceDetail
-- @owner   Fleet Finance
-- @flags   T
-- @phase   8
IF OBJECT_ID('ap.vendor_invoice_line') IS NULL
BEGIN
    CREATE TABLE ap.vendor_invoice_line (
        vendor_invoice_line_id  UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_vendor_invoice_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        vendor_invoice_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref ap.vendor_invoice
        line_no                 SMALLINT            NOT NULL,
        source                  VARCHAR(20)         NOT NULL,   -- GRN_LINE, WO_SUBLET, TYRE_EVENT, MANUAL
        source_line_id          UNIQUEIDENTIFIER    NULL,       -- ref purch.goods_receipt_line / maint.wo_sublet / tyre.tyre_event
        source_doc_id           UNIQUEIDENTIFIER    NULL,       -- ref purch.goods_receipt / maint.work_order / tyre.tyre_document
        source_doc_no           VARCHAR(30)         NULL,       -- GRN / WO / tyre maintenance number
        purchase_order_no       VARCHAR(30)         NULL,       -- copy for the screen
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order (cost lands on the WO)
        asset_profile_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.asset_profile
        asset_code              VARCHAR(30)         NULL,
        item_id                 UNIQUEIDENTIFIER    NULL,       -- ref inv.item
        item_code               VARCHAR(40)         NULL,
        description             NVARCHAR(300)       NOT NULL,
        uom_code                VARCHAR(10)         NULL,
        qty                     DECIMAL(18,4)       NOT NULL,
        unit_price              DECIMAL(18,4)       NOT NULL,   -- invoiced, document currency
        line_amount             DECIMAL(18,4)       NOT NULL,   -- qty × unit_price
        expected_qty            DECIMAL(18,4)       NULL,       -- what can still be billed for the source (NULL for MANUAL)
        expected_unit_price     DECIMAL(18,4)       NULL,
        expected_amount         DECIMAL(18,4)       NULL,       -- qty × expected_unit_price
        variance_amount         DECIMAL(18,4)       NULL,       -- line_amount − expected_amount
        match_status            VARCHAR(20)         NOT NULL CONSTRAINT df_vendor_invoice_line__match DEFAULT 'UNMATCHED',   -- UNMATCHED (manual), MATCHED, EXCEPTION
        is_service              BIT                 NOT NULL CONSTRAINT df_vendor_invoice_line__service DEFAULT 0,   -- in the WHT base
        is_released             BIT                 NOT NULL CONSTRAINT df_vendor_invoice_line__released DEFAULT 0,   -- 1 = the invoice was cancelled: the source is billable again
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_invoice_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_invoice_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_vendor_invoice_line PRIMARY KEY CLUSTERED (vendor_invoice_line_id),
        CONSTRAINT ck_vendor_invoice_line__source CHECK (source IN ('GRN_LINE','WO_SUBLET','TYRE_EVENT','MANUAL')),
        CONSTRAINT ck_vendor_invoice_line__source_ref CHECK ((source = 'MANUAL' AND source_line_id IS NULL) OR (source <> 'MANUAL' AND source_line_id IS NOT NULL)),
        CONSTRAINT ck_vendor_invoice_line__match CHECK (match_status IN ('UNMATCHED','MATCHED','EXCEPTION')),
        CONSTRAINT ck_vendor_invoice_line__values CHECK (qty > 0 AND unit_price >= 0 AND (expected_qty IS NULL OR expected_qty >= 0)),
        CONSTRAINT ck_vendor_invoice_line__item_pair CHECK ((item_id IS NULL AND item_code IS NULL) OR (item_id IS NOT NULL AND item_code IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_invoice_line__line ON ap.vendor_invoice_line (tenant_id, vendor_invoice_id, line_no) WHERE deleted_at IS NULL;
    -- GRN lines may be billed in parts (several invoices); sublets and tyre events once.
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_invoice_line__source ON ap.vendor_invoice_line (tenant_id, source, source_line_id)
        WHERE deleted_at IS NULL AND is_released = 0 AND source IN ('WO_SUBLET','TYRE_EVENT');
    CREATE NONCLUSTERED INDEX ix_vendor_invoice_line__source ON ap.vendor_invoice_line (tenant_id, source_line_id)
        INCLUDE (qty, is_released) WHERE source_line_id IS NOT NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'ap', @table = 'vendor_invoice_line';
END
GO

-- @table   ap.vendor_credit_note
-- @purpose A supplier's credit note (FLT_VCN) against an invoice and / or a vendor return; money block; export.
-- @vector  Fleet.InvoiceHeader (type 528)
-- @owner   Fleet Finance
-- @flags   T
-- @phase   8
IF OBJECT_ID('ap.vendor_credit_note') IS NULL
BEGIN
    CREATE TABLE ap.vendor_credit_note (
        vendor_credit_note_id   UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_vendor_credit_note__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_VCN
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_vendor_credit_note__status DEFAULT 'DRAFT',   -- DRAFT, APPROVED, EXPORTED, CANCELLED
        supplier_party_id       UNIQUEIDENTIFIER    NOT NULL,
        supplier_party_code     VARCHAR(25)         NOT NULL,
        supplier_name           NVARCHAR(200)       NULL,
        supplier_address        NVARCHAR(500)       NULL,
        vendor_credit_note_no   VARCHAR(40)         NULL,       -- the supplier's own number
        credit_note_date        DATE                NOT NULL,
        payment_term_code       VARCHAR(20)         NULL,
        vendor_invoice_id       UNIQUEIDENTIFIER    NULL,       -- ref ap.vendor_invoice
        vendor_invoice_no       VARCHAR(40)         NULL,
        vendor_return_id        UNIQUEIDENTIFIER    NULL,       -- ref purch.vendor_return
        vendor_return_no        VARCHAR(30)         NULL,
        reason_code             VARCHAR(30)         NULL,       -- RETURN, PRICE, DAMAGE, OTHER (open list)
        currency_code           CHAR(3)             NOT NULL,
        exchange_rate           DECIMAL(18,8)       NOT NULL CONSTRAINT df_vendor_credit_note__rate DEFAULT 1,
        subtotal_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_credit_note__subtotal DEFAULT 0,
        discount_type           VARCHAR(10)         NULL,
        discount_value          DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_credit_note__discount_value DEFAULT 0,
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_credit_note__discount DEFAULT 0,
        tax_code                VARCHAR(20)         NULL,
        tax_rate                DECIMAL(9,4)        NOT NULL CONSTRAINT df_vendor_credit_note__tax_rate DEFAULT 0,
        tax_amount              DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_credit_note__tax DEFAULT 0,
        total_amount            DECIMAL(18,4)       NOT NULL CONSTRAINT df_vendor_credit_note__total DEFAULT 0,
        approved_at             DATETIMEOFFSET(7)   NULL,
        approved_by             UNIQUEIDENTIFIER    NULL,
        export_batch_id         UNIQUEIDENTIFIER    NULL,       -- ref ap.export_batch
        exported_at             DATETIMEOFFSET(7)   NULL,
        erp_doc_entry           VARCHAR(30)         NULL,
        erp_doc_num             VARCHAR(30)         NULL,
        erp_error               NVARCHAR(1000)      NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_credit_note__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_credit_note__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_vendor_credit_note PRIMARY KEY CLUSTERED (vendor_credit_note_id),
        CONSTRAINT ck_vendor_credit_note__status CHECK (status IN ('DRAFT','APPROVED','EXPORTED','CANCELLED')),
        CONSTRAINT ck_vendor_credit_note__discount_type CHECK (discount_type IS NULL OR discount_type IN ('PERCENT','AMOUNT')),
        CONSTRAINT ck_vendor_credit_note__money CHECK (exchange_rate > 0 AND tax_rate >= 0 AND tax_rate <= 100 AND discount_value >= 0 AND discount_amount >= 0),
        CONSTRAINT ck_vendor_credit_note__currency CHECK (currency_code LIKE '[A-Z][A-Z][A-Z]'),
        CONSTRAINT ck_vendor_credit_note__cancelled CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_credit_note__document ON ap.vendor_credit_note (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_credit_note__supplier_no ON ap.vendor_credit_note (tenant_id, supplier_party_id, vendor_credit_note_no)
        WHERE deleted_at IS NULL AND cancelled_at IS NULL AND vendor_credit_note_no IS NOT NULL;
    CREATE NONCLUSTERED INDEX ix_vendor_credit_note__status ON ap.vendor_credit_note (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_vendor_credit_note__invoice ON ap.vendor_credit_note (tenant_id, vendor_invoice_id) WHERE vendor_invoice_id IS NOT NULL;
    EXEC dbo.usp_enable_temporal @schema = 'ap', @table = 'vendor_credit_note';
END
GO

-- @table   ap.vendor_credit_note_line
-- @purpose One credited line: a returned GRN line (vendor return line), an invoice line (price correction) or free text.
-- @vector  Fleet.InvoiceDetail (type 528)
-- @owner   Fleet Finance
-- @flags   T
-- @phase   8
IF OBJECT_ID('ap.vendor_credit_note_line') IS NULL
BEGIN
    CREATE TABLE ap.vendor_credit_note_line (
        vendor_credit_note_line_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_vendor_credit_note_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        vendor_credit_note_id   UNIQUEIDENTIFIER    NOT NULL,   -- ref ap.vendor_credit_note
        line_no                 SMALLINT            NOT NULL,
        source                  VARCHAR(20)         NOT NULL,   -- RTV_LINE, INVOICE_LINE, MANUAL
        source_line_id          UNIQUEIDENTIFIER    NULL,       -- ref purch.vendor_return_line / ap.vendor_invoice_line
        source_doc_no           VARCHAR(40)         NULL,       -- the screen's Transaction No
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order
        asset_profile_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.asset_profile
        asset_code              VARCHAR(30)         NULL,       -- the screen's Equipment
        item_id                 UNIQUEIDENTIFIER    NULL,       -- ref inv.item
        item_code               VARCHAR(40)         NULL,       -- the screen's Code
        gl_code                 VARCHAR(30)         NULL,       -- the screen's GL code (free text until P10 maps accounts)
        description             NVARCHAR(300)       NOT NULL,
        qty                     DECIMAL(18,4)       NOT NULL,
        unit_price              DECIMAL(18,4)       NOT NULL,
        line_amount             DECIMAL(18,4)       NOT NULL,
        is_released             BIT                 NOT NULL CONSTRAINT df_vendor_credit_note_line__released DEFAULT 0,   -- 1 = the credit note was cancelled
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_credit_note_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_vendor_credit_note_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_vendor_credit_note_line PRIMARY KEY CLUSTERED (vendor_credit_note_line_id),
        CONSTRAINT ck_vendor_credit_note_line__source CHECK (source IN ('RTV_LINE','INVOICE_LINE','MANUAL')),
        CONSTRAINT ck_vendor_credit_note_line__source_ref CHECK ((source = 'MANUAL' AND source_line_id IS NULL) OR (source <> 'MANUAL' AND source_line_id IS NOT NULL)),
        CONSTRAINT ck_vendor_credit_note_line__values CHECK (qty > 0 AND unit_price >= 0),
        CONSTRAINT ck_vendor_credit_note_line__item_pair CHECK ((item_id IS NULL AND item_code IS NULL) OR (item_id IS NOT NULL AND item_code IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_credit_note_line__line ON ap.vendor_credit_note_line (tenant_id, vendor_credit_note_id, line_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_vendor_credit_note_line__rtv ON ap.vendor_credit_note_line (tenant_id, source_line_id)
        WHERE deleted_at IS NULL AND is_released = 0 AND source = 'RTV_LINE';
    EXEC dbo.usp_enable_temporal @schema = 'ap', @table = 'vendor_credit_note_line';
END
GO

-- @table   ap.payment
-- @purpose A payment made on a vendor invoice (keyed now, imported from SAP B1 in P10); never updated — a correction is a negative row.
-- @vector  billing/vendor-payment-detail
-- @owner   Fleet Finance
-- @flags   A
-- @phase   8
IF OBJECT_ID('ap.payment') IS NULL
BEGIN
    CREATE TABLE ap.payment (
        payment_id              UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_payment__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        vendor_invoice_id       UNIQUEIDENTIFIER    NOT NULL,   -- ref ap.vendor_invoice
        supplier_party_code     VARCHAR(25)         NOT NULL,
        paid_at                 DATE                NOT NULL,
        amount                  DECIMAL(18,4)       NOT NULL,   -- document currency; negative = reversal of an earlier row
        payment_ref             VARCHAR(60)         NULL,       -- cheque / transfer / SAP payment number
        source                  VARCHAR(10)         NOT NULL CONSTRAINT df_payment__source DEFAULT 'MANUAL',   -- MANUAL, ERP
        reverses_payment_id     UNIQUEIDENTIFIER    NULL,       -- ref ap.payment
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_payment__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_payment PRIMARY KEY CLUSTERED (payment_id),
        CONSTRAINT ck_payment__source CHECK (source IN ('MANUAL','ERP')),
        CONSTRAINT ck_payment__amount CHECK (amount <> 0)
    );
    CREATE NONCLUSTERED INDEX ix_payment__invoice ON ap.payment (tenant_id, vendor_invoice_id, paid_at);
    CREATE NONCLUSTERED INDEX ix_payment__date ON ap.payment (tenant_id, branch_id, paid_at);
    EXEC dbo.usp_make_append_only @schema = 'ap', @table = 'payment';
END
GO

EXEC dbo.usp_record_script '17_ap.sql', N'P8: ap.export_batch, ap.vendor_invoice (+ line), ap.vendor_credit_note (+ line), ap.payment (append-only); temporal';
GO

IF OBJECT_ID('history.ap_vendor_invoice') IS NULL OR OBJECT_ID('history.ap_vendor_invoice_line') IS NULL
   OR OBJECT_ID('history.ap_vendor_credit_note') IS NULL OR OBJECT_ID('history.ap_vendor_credit_note_line') IS NULL
   OR OBJECT_ID('ap.export_batch') IS NULL OR OBJECT_ID('ap.payment') IS NULL
    THROW 50000, '17_ap: a table or its history is missing.', 1;
GO
PRINT '17_ap.sql completed.';
GO
