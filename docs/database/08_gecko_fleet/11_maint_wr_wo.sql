-- ============================================================
-- GECKO FLEET — WORK REQUESTS AND WORK ORDERS (P3, workshop MVP)
-- Script: 11_maint_wr_wo.sql
--
--   maint.work_request        a reported fault / requested job (FLT_WR): asset,
--                             reporter, priority, problem, status; approved
--                             requests become work orders (CONVERTED)
--   maint.work_request_task   tasks asked for (service library, PM state)
--   maint.work_order          the job card (FLT_WO): type, repair site, status
--                             machine, hold reason, meters in / out, dates,
--                             workshop flag to Trucking, cost and charge
--                             totals (server-calculated), approval, estimate
--   maint.wo_task             service lines (complaint / cause / correction)
--   maint.wo_part / wo_labor / wo_sublet / wo_sundry
--                             cost lines, each with the RECHARGE BLOCK (who
--                             pays, how, at what price — priced in P5)
--   maint.wo_status_log (A)   every status change: downtime, MTTR, SLA
--   doc.attachment            a stored file (photo, PDF) — Gecko.Data IFileStore
--   maint.wo_attachment       a file on a work order, by stage
-- maint.recharge (the release of billable lines) comes with P5.
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   doc.attachment
-- @purpose A stored file (photo, signature, PDF) and where it is: the store URI, name, type, size; what it belongs to is kept by the linking tables.
-- @vector  WO images on disk
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   3
IF OBJECT_ID('doc.attachment') IS NULL
BEGIN
    CREATE TABLE doc.attachment (
        attachment_id           UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_attachment__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        file_uri                VARCHAR(500)        NOT NULL,   -- IFileStore reference (tenant/folder/yyyy/MM/guid.ext)
        file_name               NVARCHAR(255)       NOT NULL,   -- the uploader's name, for display only
        content_type            VARCHAR(100)        NOT NULL,
        size_bytes              BIGINT              NOT NULL,
        sha256                  CHAR(64)            NULL,
        caption                 NVARCHAR(300)       NULL,
        client_ref              UNIQUEIDENTIFIER    NULL,       -- sync block (phase-2 app)
        device_id               UNIQUEIDENTIFIER    NULL,
        captured_at             DATETIMEOFFSET(7)   NULL,
        received_at             DATETIMEOFFSET(7)   NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_attachment__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_attachment__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_attachment PRIMARY KEY CLUSTERED (attachment_id),
        CONSTRAINT ck_attachment__size CHECK (size_bytes >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_attachment__client_ref ON doc.attachment (tenant_id, client_ref) WHERE client_ref IS NOT NULL;
    EXEC dbo.usp_enable_temporal @schema = 'doc', @table = 'attachment';
END
GO

-- @table   maint.work_request
-- @purpose A reported fault or requested job on an asset (FLT_WR): reporter, priority, problem, meters, status; approved requests become work orders.
-- @vector  Fleet.WorkRequestHeader
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   3
IF OBJECT_ID('maint.work_request') IS NULL
BEGIN
    CREATE TABLE maint.work_request (
        work_request_id         UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_work_request__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_WR
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_work_request__status DEFAULT 'DRAFT',   -- DRAFT, SUBMITTED, APPROVED, REJECTED, CONVERTED, CANCELLED
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        asset_code              VARCHAR(30)         NOT NULL,   -- copy for lists
        reported_by_user_id     UNIQUEIDENTIFIER    NULL,
        driver_id               UNIQUEIDENTIFIER    NULL,       -- ref people.driver
        driver_code             VARCHAR(20)         NULL,
        priority                VARCHAR(20)         NOT NULL CONSTRAINT df_work_request__priority DEFAULT 'NORMAL',   -- LOW, NORMAL, HIGH, URGENT
        source                  VARCHAR(20)         NOT NULL CONSTRAINT df_work_request__source DEFAULT 'MANUAL',     -- DRIVER, INSPECTION, PM, DISPATCH, MANUAL
        problem                 NVARCHAR(2000)      NOT NULL,   -- the screen's description
        meter_km                DECIMAL(12,1)       NULL,
        meter_hours             DECIMAL(10,1)       NULL,
        bill_to_party_id        UNIQUEIDENTIFIER    NULL,       -- who should pay (the screen's billing customer), copied to the WO
        bill_to_party_code      VARCHAR(25)         NULL,
        vendor_party_id         UNIQUEIDENTIFIER    NULL,       -- outside workshop asked for (the screen's vendor), copied to the WO
        vendor_party_code       VARCHAR(25)         NULL,
        accident_id             UNIQUEIDENTIFIER    NULL,       -- ref incident.accident (P7)
        inspection_id           UNIQUEIDENTIFIER    NULL,       -- ref insp.inspection
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order (CONVERTED)
        decided_at              DATETIMEOFFSET(7)   NULL,       -- approved / rejected at
        decided_by              UNIQUEIDENTIFIER    NULL,
        reject_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        client_ref              UNIQUEIDENTIFIER    NULL,       -- sync block (phase-2 app)
        device_id               UNIQUEIDENTIFIER    NULL,
        captured_at             DATETIMEOFFSET(7)   NULL,
        received_at             DATETIMEOFFSET(7)   NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_work_request__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_work_request__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_work_request PRIMARY KEY CLUSTERED (work_request_id),
        CONSTRAINT ck_work_request__status CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CONVERTED','CANCELLED')),
        CONSTRAINT ck_work_request__priority CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
        CONSTRAINT ck_work_request__source CHECK (source IN ('DRIVER','INSPECTION','PM','DISPATCH','MANUAL')),
        CONSTRAINT ck_work_request__converted CHECK (status <> 'CONVERTED' OR work_order_id IS NOT NULL),
        CONSTRAINT ck_work_request__rejected CHECK (status <> 'REJECTED' OR reject_reason IS NOT NULL),
        CONSTRAINT ck_work_request__driver_pair CHECK ((driver_id IS NULL AND driver_code IS NULL) OR (driver_id IS NOT NULL AND driver_code IS NOT NULL)),
        CONSTRAINT ck_work_request__bill_to_pair CHECK ((bill_to_party_id IS NULL AND bill_to_party_code IS NULL) OR (bill_to_party_id IS NOT NULL AND bill_to_party_code IS NOT NULL)),
        CONSTRAINT ck_work_request__vendor_pair CHECK ((vendor_party_id IS NULL AND vendor_party_code IS NULL) OR (vendor_party_id IS NOT NULL AND vendor_party_code IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_work_request__document ON maint.work_request (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_work_request__client_ref ON maint.work_request (tenant_id, client_ref) WHERE client_ref IS NOT NULL;
    CREATE NONCLUSTERED INDEX ix_work_request__branch_status ON maint.work_request (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_work_request__asset ON maint.work_request (tenant_id, asset_profile_id, status) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'work_request';
END
GO

-- @table   maint.work_request_task
-- @purpose A task asked for on a work request (from the service library, optionally a PM task state).
-- @vector  Fleet.WorkRequestService
-- @owner   Fleet Maintenance
-- @flags   -
-- @phase   3
IF OBJECT_ID('maint.work_request_task') IS NULL
BEGIN
    CREATE TABLE maint.work_request_task (
        work_request_task_id    UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_work_request_task__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        work_request_id         UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.work_request
        service_task_id         UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.service_task
        pm_task_state_id        UNIQUEIDENTIFIER    NULL,       -- ref maint.pm_task_state (a PM task that is due)
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_work_request_task__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_work_request_task__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_work_request_task PRIMARY KEY CLUSTERED (work_request_task_id),

    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_work_request_task__task ON maint.work_request_task (tenant_id, work_request_id, service_task_id) WHERE deleted_at IS NULL;
END
GO

-- @table   maint.work_order
-- @purpose The job card (FLT_WO): asset, type, repair site, status, meters in / out, dates, workshop flag, cost and charge totals, approval and estimate.
-- @vector  Fleet.WorkOrderHeader
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   3
IF OBJECT_ID('maint.work_order') IS NULL
BEGIN
    CREATE TABLE maint.work_order (
        work_order_id           UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_work_order__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- workshop branch
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_WO
        document_date           DATE                NOT NULL,
        wo_type                 VARCHAR(20)         NOT NULL CONSTRAINT df_work_order__type DEFAULT 'CORRECTIVE',   -- PM, CORRECTIVE, BREAKDOWN, ACCIDENT, TYRE, INSPECTION, CAMPAIGN
        repair_site             VARCHAR(20)         NOT NULL CONSTRAINT df_work_order__site DEFAULT 'IN_HOUSE',     -- IN_HOUSE, VENDOR, MIXED, ROADSIDE
        priority                VARCHAR(20)         NOT NULL CONSTRAINT df_work_order__priority DEFAULT 'NORMAL',   -- LOW, NORMAL, HIGH, URGENT
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_work_order__status DEFAULT 'DRAFT',      -- DRAFT, OPEN, IN_PROGRESS, ON_HOLD, COMPLETED, CLOSED, CANCELLED
        hold_reason_code        VARCHAR(30)         NULL,       -- WAITING_PARTS, WAITING_VENDOR, WAITING_APPROVAL, WAITING_CUSTOMER, OTHER
        billing_status          VARCHAR(20)         NOT NULL CONSTRAINT df_work_order__billing DEFAULT 'NOT_BILLABLE',   -- NOT_BILLABLE, UNBILLED, BILLED, CREDITED
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        asset_code              VARCHAR(30)         NOT NULL,
        vehicle_id              UNIQUEIDENTIFIER    NULL,       -- ref gecko_trucking:fleet.vehicle (copied for reporting / the workshop flag)
        vehicle_code            VARCHAR(30)         NULL,
        driver_id               UNIQUEIDENTIFIER    NULL,       -- ref people.driver
        driver_code             VARCHAR(20)         NULL,
        work_request_id         UNIQUEIDENTIFIER    NULL,       -- ref maint.work_request
        accident_id             UNIQUEIDENTIFIER    NULL,       -- ref incident.accident (P7)
        insurance_claim_id      UNIQUEIDENTIFIER    NULL,       -- ref incident.insurance_claim (P7)
        default_bill_to_party_id UNIQUEIDENTIFIER   NULL,       -- default bill-to of billable lines (owner of a SUBCON asset / the customer)
        default_bill_to_party_code VARCHAR(25)      NULL,
        vendor_party_id         UNIQUEIDENTIFIER    NULL,       -- outside workshop (repair_site VENDOR / MIXED)
        vendor_party_code       VARCHAR(25)         NULL,
        vendor_invoice_no       VARCHAR(40)         NULL,       -- the outside workshop's invoice number (the screen's field)
        estimate_status         VARCHAR(20)         NOT NULL CONSTRAINT df_work_order__estimate DEFAULT 'NONE',   -- NONE, ISSUED, APPROVED, REJECTED
        estimate_approved_at    DATETIMEOFFSET(7)   NULL,
        estimate_approved_by_name NVARCHAR(150)     NULL,       -- the customer's approver
        meter_in_km             DECIMAL(12,2)       NULL,
        meter_in_hours          DECIMAL(12,2)       NULL,
        meter_out_km            DECIMAL(12,2)       NULL,       -- required to complete when the asset has an odometer
        meter_out_hours         DECIMAL(12,2)       NULL,
        planned_start_at        DATETIMEOFFSET(7)   NULL,
        started_at              DATETIMEOFFSET(7)   NULL,
        promised_at             DATETIMEOFFSET(7)   NULL,
        completed_at            DATETIMEOFFSET(7)   NULL,
        closed_at               DATETIMEOFFSET(7)   NULL,
        takes_asset_oos         BIT                 NOT NULL CONSTRAINT df_work_order__oos DEFAULT 0,   -- the asset cannot be dispatched while the WO is open (Trucking UNDER_REPAIR)
        currency_code           CHAR(3)             NOT NULL CONSTRAINT df_work_order__currency DEFAULT 'THB',
        parts_cost              DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__parts_cost DEFAULT 0,
        labor_cost              DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__labor_cost DEFAULT 0,
        sublet_cost             DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__sublet_cost DEFAULT 0,
        total_cost              DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__total_cost DEFAULT 0,
        parts_price             DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__parts_price DEFAULT 0,
        labor_price             DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__labor_price DEFAULT 0,
        sublet_price            DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__sublet_price DEFAULT 0,
        sundry_price            DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__sundry_price DEFAULT 0,
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__discount DEFAULT 0,
        tax_code                VARCHAR(20)         NULL,
        tax_rate                DECIMAL(6,3)        NOT NULL CONSTRAINT df_work_order__tax_rate DEFAULT 7,   -- VAT % of the charge side (the screen's VAT)
        tax_amount              DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__tax_amount DEFAULT 0,
        total_price             DECIMAL(18,4)       NOT NULL CONSTRAINT df_work_order__total_price DEFAULT 0,
        approval_status         VARCHAR(20)         NOT NULL CONSTRAINT df_work_order__approval DEFAULT 'NOT_REQUIRED',   -- NOT_REQUIRED, PENDING, APPROVED, REJECTED
        approved_at             DATETIMEOFFSET(7)   NULL,
        approved_by             UNIQUEIDENTIFIER    NULL,
        remarks                 NVARCHAR(2000)      NULL,
        legacy_ref              VARCHAR(80)         NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_work_order__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_work_order__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_work_order PRIMARY KEY CLUSTERED (work_order_id),
        CONSTRAINT ck_work_order__type CHECK (wo_type IN ('PM','CORRECTIVE','BREAKDOWN','ACCIDENT','TYRE','INSPECTION','CAMPAIGN')),
        CONSTRAINT ck_work_order__site CHECK (repair_site IN ('IN_HOUSE','VENDOR','MIXED','ROADSIDE')),
        CONSTRAINT ck_work_order__priority CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
        CONSTRAINT ck_work_order__status CHECK (status IN ('DRAFT','OPEN','IN_PROGRESS','ON_HOLD','COMPLETED','CLOSED','CANCELLED')),
        CONSTRAINT ck_work_order__hold CHECK (status <> 'ON_HOLD' OR hold_reason_code IS NOT NULL),
        CONSTRAINT ck_work_order__completed CHECK (status NOT IN ('COMPLETED','CLOSED') OR completed_at IS NOT NULL),
        CONSTRAINT ck_work_order__closed CHECK (status <> 'CLOSED' OR closed_at IS NOT NULL),
        CONSTRAINT ck_work_order__billing CHECK (billing_status IN ('NOT_BILLABLE','UNBILLED','BILLED','CREDITED')),
        CONSTRAINT ck_work_order__estimate CHECK (estimate_status IN ('NONE','ISSUED','APPROVED','REJECTED')),
        CONSTRAINT ck_work_order__approval CHECK (approval_status IN ('NOT_REQUIRED','PENDING','APPROVED','REJECTED')),
        CONSTRAINT ck_work_order__driver_pair CHECK ((driver_id IS NULL AND driver_code IS NULL) OR (driver_id IS NOT NULL AND driver_code IS NOT NULL)),
        CONSTRAINT ck_work_order__vehicle_pair CHECK ((vehicle_id IS NULL AND vehicle_code IS NULL) OR (vehicle_id IS NOT NULL AND vehicle_code IS NOT NULL)),
        CONSTRAINT ck_work_order__bill_to_pair CHECK ((default_bill_to_party_id IS NULL AND default_bill_to_party_code IS NULL) OR (default_bill_to_party_id IS NOT NULL AND default_bill_to_party_code IS NOT NULL)),
        CONSTRAINT ck_work_order__vendor_pair CHECK ((vendor_party_id IS NULL AND vendor_party_code IS NULL) OR (vendor_party_id IS NOT NULL AND vendor_party_code IS NOT NULL)),
        CONSTRAINT ck_work_order__vendor_site CHECK (repair_site NOT IN ('VENDOR') OR vendor_party_id IS NOT NULL),
        CONSTRAINT ck_work_order__meters CHECK ((meter_in_km IS NULL OR meter_out_km IS NULL OR meter_out_km >= meter_in_km)
            AND (meter_in_hours IS NULL OR meter_out_hours IS NULL OR meter_out_hours >= meter_in_hours))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_work_order__document ON maint.work_order (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_work_order__asset_status ON maint.work_order (tenant_id, asset_profile_id, status) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_work_order__branch_status_date ON maint.work_order (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'work_order';
END
GO

-- @table   maint.wo_task
-- @purpose A service line of a work order: the task, complaint / cause / correction, status, and the line subtotals.
-- @vector  Fleet.WorkOrderService
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   3
IF OBJECT_ID('maint.wo_task') IS NULL
BEGIN
    CREATE TABLE maint.wo_task (
        wo_task_id              UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_wo_task__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        work_order_id           UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.work_order
        seq_no                  SMALLINT            NOT NULL,
        service_task_id         UNIQUEIDENTIFIER    NULL,       -- ref maint.service_task (NULL = free text)
        pm_task_state_id        UNIQUEIDENTIFIER    NULL,       -- ref maint.pm_task_state: completing the WO resets this PM task
        description             NVARCHAR(300)       NOT NULL,
        complaint               NVARCHAR(1000)      NULL,
        cause                   NVARCHAR(1000)      NULL,
        correction              NVARCHAR(1000)      NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_wo_task__status DEFAULT 'OPEN',   -- OPEN, DONE, DEFERRED
        parts_cost              DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_task__parts_cost DEFAULT 0,
        labor_cost              DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_task__labor_cost DEFAULT 0,
        sublet_cost             DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_task__sublet_cost DEFAULT 0,
        parts_price             DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_task__parts_price DEFAULT 0,
        labor_price             DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_task__labor_price DEFAULT 0,
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_task__discount DEFAULT 0,
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_task__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_task__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_wo_task PRIMARY KEY CLUSTERED (wo_task_id),
        CONSTRAINT ck_wo_task__status CHECK (status IN ('OPEN','DONE','DEFERRED')),
        CONSTRAINT ck_wo_task__seq CHECK (seq_no > 0)
    );
    CREATE NONCLUSTERED INDEX ix_wo_task__work_order ON maint.wo_task (tenant_id, work_order_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'wo_task';
END
GO

-- @table   maint.wo_part
-- @purpose A part used on a work order: item, quantity, where it came from, cost, and the recharge block.
-- @vector  Fleet.WorkOrderItem
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   3
IF OBJECT_ID('maint.wo_part') IS NULL
BEGIN
    CREATE TABLE maint.wo_part (
        wo_part_id              UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_wo_part__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        work_order_id           UNIQUEIDENTIFIER    NOT NULL,
        wo_task_id              UNIQUEIDENTIFIER    NULL,       -- ref maint.wo_task
        item_id                 UNIQUEIDENTIFIER    NULL,       -- ref inv.item (NULL = a part bought for this job, described in text)
        item_code               VARCHAR(40)         NULL,
        description             NVARCHAR(300)       NOT NULL,
        qty                     DECIMAL(18,4)       NOT NULL,
        uom_code                VARCHAR(10)         NOT NULL,
        source                  VARCHAR(20)         NOT NULL CONSTRAINT df_wo_part__source DEFAULT 'STOCK',   -- STOCK, DIRECT_PO, CUSTOMER_SUPPLIED
        unit_cost               DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_part__unit_cost DEFAULT 0,
        cost_amount             DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_part__cost DEFAULT 0,
        stock_issue_line_id     UNIQUEIDENTIFIER    NULL,       -- ref inv stock issue (P4)
        purchase_order_line_id  UNIQUEIDENTIFIER    NULL,       -- ref purch.purchase_order_line (P4)
        is_billable             BIT                 NOT NULL CONSTRAINT df_wo_part__billable DEFAULT 0,   -- recharge block: charged to a customer / subcontractor
        bill_to_party_id        UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:party.party
        bill_to_party_code      VARCHAR(25)         NULL,
        recharge_mode           VARCHAR(20)         NULL,       -- INVOICE (Revenue AR invoice), DEDUCTION (subcontractor statement)
        charge_code             VARCHAR(30)         NULL,       -- gecko_master charge code of the charge line
        unit_price              DECIMAL(18,4)       NULL,
        price_amount            DECIMAL(18,4)       NULL,       -- charge before discount
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_part__discount DEFAULT 0,
        tax_code                VARCHAR(20)         NULL,
        wht_code                VARCHAR(20)         NULL,
        rate_card_ref           VARCHAR(80)         NULL,       -- Revenue rate card / line used (P5)
        priced_at               DATETIMEOFFSET(7)   NULL,       -- prices fixed at release
        recharge_id             UNIQUEIDENTIFIER    NULL,       -- ref maint.recharge (P5)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_part__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_part__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_wo_part PRIMARY KEY CLUSTERED (wo_part_id),
        CONSTRAINT ck_wo_part__source CHECK (source IN ('STOCK','DIRECT_PO','CUSTOMER_SUPPLIED')),
        CONSTRAINT ck_wo_part__qty CHECK (qty > 0 AND unit_cost >= 0 AND cost_amount >= 0),
        CONSTRAINT ck_wo_part__bill_to_pair CHECK ((bill_to_party_id IS NULL AND bill_to_party_code IS NULL) OR (bill_to_party_id IS NOT NULL AND bill_to_party_code IS NOT NULL)),
        CONSTRAINT ck_wo_part__billable CHECK (is_billable = 0 OR (bill_to_party_id IS NOT NULL AND recharge_mode IN ('INVOICE','DEDUCTION'))),
        CONSTRAINT ck_wo_part__price CHECK ((unit_price IS NULL OR unit_price >= 0) AND (price_amount IS NULL OR price_amount >= 0) AND discount_amount >= 0)
    );
    CREATE NONCLUSTERED INDEX ix_wo_part__work_order ON maint.wo_part (tenant_id, work_order_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'wo_part';
END
GO

-- @table   maint.wo_labor
-- @purpose Labour on a work order: technician, trade, time band, start / end, hours, cost rate and cost, and the recharge block.
-- @vector  Fleet.WorkOrderLabor
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   3
IF OBJECT_ID('maint.wo_labor') IS NULL
BEGIN
    CREATE TABLE maint.wo_labor (
        wo_labor_id             UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_wo_labor__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        work_order_id           UNIQUEIDENTIFIER    NOT NULL,
        wo_task_id              UNIQUEIDENTIFIER    NULL,
        technician_id           UNIQUEIDENTIFIER    NULL,       -- ref people.technician
        technician_code         VARCHAR(20)         NULL,
        trade_code              VARCHAR(40)         NOT NULL,   -- FLEET_TRADE
        description             NVARCHAR(300)       NULL,
        time_band               VARCHAR(10)         NOT NULL CONSTRAINT df_wo_labor__band DEFAULT 'NORMAL',   -- NORMAL, OT, HOLIDAY
        start_at                DATETIMEOFFSET(7)   NULL,
        end_at                  DATETIMEOFFSET(7)   NULL,
        hours                   DECIMAL(8,2)        NOT NULL,   -- actual hours
        std_hours               DECIMAL(8,2)        NULL,       -- standard (flat-rate) hours
        cost_rate               DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_labor__rate DEFAULT 0,
        cost_rate_source        VARCHAR(20)         NULL,       -- TECHNICIAN, BRANCH_TRADE, TENANT_TRADE (Application/LaborCost); NULL = no rate
        cost_amount             DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_labor__cost DEFAULT 0,
        is_billable             BIT                 NOT NULL CONSTRAINT df_wo_labor__billable DEFAULT 0,   -- recharge block: charged to a customer / subcontractor
        bill_to_party_id        UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:party.party
        bill_to_party_code      VARCHAR(25)         NULL,
        recharge_mode           VARCHAR(20)         NULL,       -- INVOICE (Revenue AR invoice), DEDUCTION (subcontractor statement)
        charge_code             VARCHAR(30)         NULL,       -- gecko_master charge code of the charge line
        unit_price              DECIMAL(18,4)       NULL,
        price_amount            DECIMAL(18,4)       NULL,       -- charge before discount
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_labor__discount DEFAULT 0,
        tax_code                VARCHAR(20)         NULL,
        wht_code                VARCHAR(20)         NULL,
        rate_card_ref           VARCHAR(80)         NULL,       -- Revenue rate card / line used (P5)
        priced_at               DATETIMEOFFSET(7)   NULL,       -- prices fixed at release
        recharge_id             UNIQUEIDENTIFIER    NULL,       -- ref maint.recharge (P5)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_labor__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_labor__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_wo_labor PRIMARY KEY CLUSTERED (wo_labor_id),
        CONSTRAINT ck_wo_labor__band CHECK (time_band IN ('NORMAL','OT','HOLIDAY')),
        CONSTRAINT ck_wo_labor__hours CHECK (hours >= 0 AND (std_hours IS NULL OR std_hours >= 0) AND cost_rate >= 0 AND cost_amount >= 0),
        CONSTRAINT ck_wo_labor__times CHECK (start_at IS NULL OR end_at IS NULL OR end_at >= start_at),
        CONSTRAINT ck_wo_labor__tech_pair CHECK ((technician_id IS NULL AND technician_code IS NULL) OR (technician_id IS NOT NULL AND technician_code IS NOT NULL)),
        CONSTRAINT ck_wo_labor__bill_to_pair CHECK ((bill_to_party_id IS NULL AND bill_to_party_code IS NULL) OR (bill_to_party_id IS NOT NULL AND bill_to_party_code IS NOT NULL)),
        CONSTRAINT ck_wo_labor__billable CHECK (is_billable = 0 OR (bill_to_party_id IS NOT NULL AND recharge_mode IN ('INVOICE','DEDUCTION'))),
        CONSTRAINT ck_wo_labor__price CHECK ((unit_price IS NULL OR unit_price >= 0) AND (price_amount IS NULL OR price_amount >= 0) AND discount_amount >= 0)
    );
    CREATE NONCLUSTERED INDEX ix_wo_labor__work_order ON maint.wo_labor (tenant_id, work_order_id) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_wo_labor__technician ON maint.wo_labor (tenant_id, technician_id, start_at) WHERE technician_id IS NOT NULL AND deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'wo_labor';
END
GO

-- @table   maint.wo_sublet
-- @purpose Work done by an outside vendor on a work order: vendor, description, estimated / actual cost, invoice reference, and the recharge block.
-- @vector  WO.VendorCode / VendorInvoiceNo
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   3
IF OBJECT_ID('maint.wo_sublet') IS NULL
BEGIN
    CREATE TABLE maint.wo_sublet (
        wo_sublet_id            UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_wo_sublet__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        work_order_id           UNIQUEIDENTIFIER    NOT NULL,
        wo_task_id              UNIQUEIDENTIFIER    NULL,
        vendor_party_id         UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_master:party.party (SUPPLIER)
        vendor_party_code       VARCHAR(25)         NOT NULL,
        description             NVARCHAR(300)       NOT NULL,
        est_cost                DECIMAL(18,4)       NULL,
        actual_cost             DECIMAL(18,4)       NULL,
        vendor_invoice_no       VARCHAR(40)         NULL,
        purchase_order_line_id  UNIQUEIDENTIFIER    NULL,       -- P4
        vendor_invoice_line_id  UNIQUEIDENTIFIER    NULL,       -- P8
        is_billable             BIT                 NOT NULL CONSTRAINT df_wo_sublet__billable DEFAULT 0,   -- recharge block: charged to a customer / subcontractor
        bill_to_party_id        UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:party.party
        bill_to_party_code      VARCHAR(25)         NULL,
        recharge_mode           VARCHAR(20)         NULL,       -- INVOICE (Revenue AR invoice), DEDUCTION (subcontractor statement)
        charge_code             VARCHAR(30)         NULL,       -- gecko_master charge code of the charge line
        unit_price              DECIMAL(18,4)       NULL,
        price_amount            DECIMAL(18,4)       NULL,       -- charge before discount
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_sublet__discount DEFAULT 0,
        tax_code                VARCHAR(20)         NULL,
        wht_code                VARCHAR(20)         NULL,
        rate_card_ref           VARCHAR(80)         NULL,       -- Revenue rate card / line used (P5)
        priced_at               DATETIMEOFFSET(7)   NULL,       -- prices fixed at release
        recharge_id             UNIQUEIDENTIFIER    NULL,       -- ref maint.recharge (P5)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_sublet__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_sublet__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_wo_sublet PRIMARY KEY CLUSTERED (wo_sublet_id),
        CONSTRAINT ck_wo_sublet__cost CHECK ((est_cost IS NULL OR est_cost >= 0) AND (actual_cost IS NULL OR actual_cost >= 0)),
        CONSTRAINT ck_wo_sublet__bill_to_pair CHECK ((bill_to_party_id IS NULL AND bill_to_party_code IS NULL) OR (bill_to_party_id IS NOT NULL AND bill_to_party_code IS NOT NULL)),
        CONSTRAINT ck_wo_sublet__billable CHECK (is_billable = 0 OR (bill_to_party_id IS NOT NULL AND recharge_mode IN ('INVOICE','DEDUCTION'))),
        CONSTRAINT ck_wo_sublet__price CHECK ((unit_price IS NULL OR unit_price >= 0) AND (price_amount IS NULL OR price_amount >= 0) AND discount_amount >= 0)
    );
    CREATE NONCLUSTERED INDEX ix_wo_sublet__work_order ON maint.wo_sublet (tenant_id, work_order_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'wo_sublet';
END
GO

-- @table   maint.wo_sundry
-- @purpose A charge-only line (shop supplies, call-out, towing, minimum-charge top-up) with the recharge block.
-- @vector  (new)
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   3
IF OBJECT_ID('maint.wo_sundry') IS NULL
BEGIN
    CREATE TABLE maint.wo_sundry (
        wo_sundry_id            UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_wo_sundry__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        work_order_id           UNIQUEIDENTIFIER    NOT NULL,
        description             NVARCHAR(300)       NOT NULL,
        qty                     DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_sundry__qty DEFAULT 1,
        is_billable             BIT                 NOT NULL CONSTRAINT df_wo_sundry__billable DEFAULT 0,   -- recharge block: charged to a customer / subcontractor
        bill_to_party_id        UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:party.party
        bill_to_party_code      VARCHAR(25)         NULL,
        recharge_mode           VARCHAR(20)         NULL,       -- INVOICE (Revenue AR invoice), DEDUCTION (subcontractor statement)
        charge_code             VARCHAR(30)         NULL,       -- gecko_master charge code of the charge line
        unit_price              DECIMAL(18,4)       NULL,
        price_amount            DECIMAL(18,4)       NULL,       -- charge before discount
        discount_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_wo_sundry__discount DEFAULT 0,
        tax_code                VARCHAR(20)         NULL,
        wht_code                VARCHAR(20)         NULL,
        rate_card_ref           VARCHAR(80)         NULL,       -- Revenue rate card / line used (P5)
        priced_at               DATETIMEOFFSET(7)   NULL,       -- prices fixed at release
        recharge_id             UNIQUEIDENTIFIER    NULL,       -- ref maint.recharge (P5)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_sundry__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_sundry__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_wo_sundry PRIMARY KEY CLUSTERED (wo_sundry_id),
        CONSTRAINT ck_wo_sundry__qty CHECK (qty > 0),
        CONSTRAINT ck_wo_sundry__bill_to_pair CHECK ((bill_to_party_id IS NULL AND bill_to_party_code IS NULL) OR (bill_to_party_id IS NOT NULL AND bill_to_party_code IS NOT NULL)),
        CONSTRAINT ck_wo_sundry__billable CHECK (is_billable = 0 OR (bill_to_party_id IS NOT NULL AND recharge_mode IN ('INVOICE','DEDUCTION'))),
        CONSTRAINT ck_wo_sundry__price CHECK ((unit_price IS NULL OR unit_price >= 0) AND (price_amount IS NULL OR price_amount >= 0) AND discount_amount >= 0)
    );
    CREATE NONCLUSTERED INDEX ix_wo_sundry__work_order ON maint.wo_sundry (tenant_id, work_order_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'wo_sundry';
END
GO

-- @table   maint.wo_status_log
-- @purpose Every status change of a work order (from, to, reason, at, by): downtime, MTTR and SLA come from it.
-- @vector  (new)
-- @owner   Fleet Maintenance
-- @flags   A
-- @phase   3
IF OBJECT_ID('maint.wo_status_log') IS NULL
BEGIN
    CREATE TABLE maint.wo_status_log (
        wo_status_log_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_wo_status_log__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        work_order_id           UNIQUEIDENTIFIER    NOT NULL,
        from_status             VARCHAR(20)         NULL,
        to_status               VARCHAR(20)         NOT NULL,
        reason_code             VARCHAR(30)         NULL,
        reason_text             NVARCHAR(500)       NULL,
        changed_at              DATETIMEOFFSET(7)   NOT NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_status_log__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_wo_status_log PRIMARY KEY CLUSTERED (wo_status_log_id),

    );
    CREATE NONCLUSTERED INDEX ix_wo_status_log__work_order ON maint.wo_status_log (tenant_id, work_order_id, changed_at);
    EXEC dbo.usp_make_append_only @schema = 'maint', @table = 'wo_status_log';
END
GO

-- @table   maint.wo_attachment
-- @purpose A file on a work order, by stage (before, during, after, invoice).
-- @vector  WO images on disk
-- @owner   Fleet Maintenance
-- @flags   -
-- @phase   3
IF OBJECT_ID('maint.wo_attachment') IS NULL
BEGIN
    CREATE TABLE maint.wo_attachment (
        wo_attachment_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_wo_attachment__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        work_order_id           UNIQUEIDENTIFIER    NOT NULL,
        attachment_id           UNIQUEIDENTIFIER    NOT NULL,   -- ref doc.attachment
        stage                   VARCHAR(20)         NOT NULL CONSTRAINT df_wo_attachment__stage DEFAULT 'DURING',   -- BEFORE, DURING, AFTER, INVOICE
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_attachment__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_wo_attachment__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_wo_attachment PRIMARY KEY CLUSTERED (wo_attachment_id),
        CONSTRAINT ck_wo_attachment__stage CHECK (stage IN ('BEFORE','DURING','AFTER','INVOICE'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_wo_attachment__pair ON maint.wo_attachment (tenant_id, work_order_id, attachment_id) WHERE deleted_at IS NULL;
END
GO

IF OBJECT_ID('history.doc_attachment') IS NULL OR OBJECT_ID('history.maint_work_request') IS NULL OR OBJECT_ID('maint.work_request_task') IS NULL
   OR OBJECT_ID('history.maint_work_order') IS NULL OR OBJECT_ID('history.maint_wo_task') IS NULL OR OBJECT_ID('history.maint_wo_part') IS NULL
   OR OBJECT_ID('history.maint_wo_labor') IS NULL OR OBJECT_ID('history.maint_wo_sublet') IS NULL OR OBJECT_ID('history.maint_wo_sundry') IS NULL
   OR OBJECT_ID('maint.wo_status_log') IS NULL OR OBJECT_ID('maint.wo_attachment') IS NULL
    THROW 50000, '11_maint_wr_wo: a table or its history is missing.', 1;
GO
PRINT '11_maint_wr_wo.sql completed.';
GO
