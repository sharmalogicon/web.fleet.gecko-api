-- ============================================================
-- GECKO FLEET — TYRE LIFECYCLE (P6)
-- Script: 15_tyre.sql
--
--   tyre.tyre            one casing by serial no: make, size, type NEW / RECAP,
--                        recap count, tread, pressure, purchase, warranty, status
--                        (IN_STOCK, FITTED, AWAITING_REPAIR, AT_RECAP, SCRAPPED),
--                        where it is now (store, or asset + position), lifetime
--                        km / hours / cost. One FITTED tyre per asset + position.
--   tyre.tyre_document   a tyre change (FLT_TCH) or tyre maintenance (FLT_TMN:
--                        inspection, repair, retread at a vendor) — the header the
--                        existing screens show; its lines ARE its events
--   tyre.tyre_event (A,P) every thing that happens to a tyre: INSTALL, REMOVE,
--                        ROTATE, INSPECT, REPAIR, SEND_RECAP, RECEIVE_RECAP, SCRAP,
--                        ADJUST; never updated — a correction is a reversal row
--   tyre.tyre_fitment    one install → remove period (asset, position, km in / out):
--                        the axle map, km run and cost per km (CPK)
-- Positions follow the axle layout (03_asset): 1L, 1R, 2LO, 2LI, 2RI, 2RO, SP1 ...
-- tyre_import_batch (doc 02) is not built: tyres are registered one by one or from
-- goods receipts; opening balances come with P11.
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   tyre.tyre
-- @purpose One tyre casing by serial number: specification, tread, pressure, purchase, warranty, status, where it is, lifetime km / cost.
-- @vector  Master.TyreProfile
-- @owner   Fleet Tyres
-- @flags   T
-- @phase   6
IF OBJECT_ID('tyre.tyre') IS NULL
BEGIN
    CREATE TABLE tyre.tyre (
        tyre_id                 UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_tyre__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        serial_no               VARCHAR(40)         NOT NULL,   -- branded / DOT serial, unique per tenant
        item_id                 UNIQUEIDENTIFIER    NULL,       -- ref inv.item (the stock item it was bought as)
        brand_code              VARCHAR(40)         NULL,       -- MICHELIN, BRIDGESTONE ...
        model_name              VARCHAR(60)         NULL,       -- pattern / model, e.g. X MULTI D
        size_code               VARCHAR(30)         NULL,       -- 295/80R22.5
        ply_rating              VARCHAR(10)         NULL,
        tyre_type               VARCHAR(10)         NOT NULL CONSTRAINT df_tyre__type DEFAULT 'NEW',   -- NEW, RECAP
        recap_count             TINYINT             NOT NULL CONSTRAINT df_tyre__recaps DEFAULT 0,
        original_tread_mm       DECIMAL(5,1)        NULL,
        current_tread_mm        DECIMAL(5,1)        NULL,       -- last measured
        last_pressure_psi       DECIMAL(6,1)        NULL,       -- last measured
        target_psi              DECIMAL(6,1)        NULL,
        condition               VARCHAR(10)         NULL,       -- GOOD, FAIR, POOR (the screen's condition)
        expected_km             INT                 NULL,       -- anticipated mileage of one life
        expected_hours          INT                 NULL,
        purchased_date          DATE                NULL,
        purchase_cost           DECIMAL(18,4)       NOT NULL CONSTRAINT df_tyre__purchase DEFAULT 0,   -- base currency
        supplier_party_id       UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:party.party
        supplier_party_code     VARCHAR(25)         NULL,
        vendor_invoice_no       VARCHAR(40)         NULL,
        purchase_order_no       VARCHAR(30)         NULL,
        goods_receipt_line_id   UNIQUEIDENTIFIER    NULL,       -- ref purch.goods_receipt_line
        warranty_km             INT                 NULL,
        warranty_until          DATE                NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_tyre__status DEFAULT 'IN_STOCK',   -- IN_STOCK, FITTED, AWAITING_REPAIR, AT_RECAP, SCRAPPED
        warehouse_id            UNIQUEIDENTIFIER    NULL,       -- ref inv.warehouse (IN_STOCK / AWAITING_REPAIR)
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- where it is: the store's or the asset's branch
        current_asset_profile_id UNIQUEIDENTIFIER    NULL,       -- ref asset.asset_profile (FITTED)
        current_position_code   VARCHAR(6)          NULL,       -- 1L, 2RO, SP1 ... (FITTED)
        installed_at            DATETIMEOFFSET(7)   NULL,
        lifetime_km             DECIMAL(12,1)       NOT NULL CONSTRAINT df_tyre__km DEFAULT 0,   -- closed fitments, all lives
        lifetime_hours          DECIMAL(10,1)       NOT NULL CONSTRAINT df_tyre__hours DEFAULT 0,
        recap_cost_total        DECIMAL(18,4)       NOT NULL CONSTRAINT df_tyre__recap_cost DEFAULT 0,
        repair_cost_total       DECIMAL(18,4)       NOT NULL CONSTRAINT df_tyre__repair_cost DEFAULT 0,
        inspection_cost_total   DECIMAL(18,4)       NOT NULL CONSTRAINT df_tyre__inspection_cost DEFAULT 0,
        scrapped_at             DATETIMEOFFSET(7)   NULL,
        scrap_reason            VARCHAR(30)         NULL,
        is_active               BIT                 NOT NULL CONSTRAINT df_tyre__is_active DEFAULT 1,
        remarks                 NVARCHAR(1000)      NULL,
        legacy_ref              VARCHAR(80)         NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_tyre__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_tyre__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_tyre PRIMARY KEY CLUSTERED (tyre_id),
        CONSTRAINT ck_tyre__status CHECK (status IN ('IN_STOCK','FITTED','AWAITING_REPAIR','AT_RECAP','SCRAPPED')),
        CONSTRAINT ck_tyre__type CHECK (tyre_type IN ('NEW','RECAP')),
        CONSTRAINT ck_tyre__condition CHECK (condition IS NULL OR condition IN ('GOOD','FAIR','POOR')),
        CONSTRAINT ck_tyre__serial CHECK (serial_no = UPPER(serial_no) COLLATE Latin1_General_100_CS_AS AND LEN(serial_no) > 0),
        CONSTRAINT ck_tyre__fitted CHECK ((status = 'FITTED' AND current_asset_profile_id IS NOT NULL AND current_position_code IS NOT NULL) OR (status <> 'FITTED' AND current_asset_profile_id IS NULL AND current_position_code IS NULL)),
        CONSTRAINT ck_tyre__scrapped CHECK (status <> 'SCRAPPED' OR scrapped_at IS NOT NULL),
        CONSTRAINT ck_tyre__supplier_pair CHECK ((supplier_party_id IS NULL AND supplier_party_code IS NULL) OR (supplier_party_id IS NOT NULL AND supplier_party_code IS NOT NULL)),
        CONSTRAINT ck_tyre__values CHECK (purchase_cost >= 0 AND lifetime_km >= 0 AND lifetime_hours >= 0 AND (current_tread_mm IS NULL OR current_tread_mm >= 0))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_tyre__serial ON tyre.tyre (tenant_id, serial_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_tyre__position ON tyre.tyre (tenant_id, current_asset_profile_id, current_position_code) WHERE status = 'FITTED' AND deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_tyre__status ON tyre.tyre (tenant_id, branch_id, status) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'tyre', @table = 'tyre';
END
GO

-- @table   tyre.tyre_document
-- @purpose A tyre change (FLT_TCH) or tyre maintenance (FLT_TMN: inspection, repair, retread) — the header; its lines are tyre events.
-- @vector  Fleet.TireChangeHeader, Fleet.TireMaintenanceHeader
-- @owner   Fleet Tyres
-- @flags   T
-- @phase   6
IF OBJECT_ID('tyre.tyre_document') IS NULL
BEGIN
    CREATE TABLE tyre.tyre_document (
        tyre_document_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_tyre_document__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_TCH / FLT_TMN
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_tyre_document__status DEFAULT 'DRAFT',   -- DRAFT, POSTED, CANCELLED
        document_kind           VARCHAR(20)         NOT NULL,   -- CHANGE, MAINTENANCE
        asset_profile_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.asset_profile (CHANGE: required)
        asset_code              VARCHAR(30)         NULL,
        driver_id               UNIQUEIDENTIFIER    NULL,       -- ref people.driver
        driver_code             VARCHAR(20)         NULL,
        work_order_id           UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order
        work_order_no           VARCHAR(30)         NULL,
        meter_km                DECIMAL(12,1)       NULL,       -- dial value keyed
        meter_hours             DECIMAL(10,1)       NULL,
        category                VARCHAR(30)         NULL,       -- the change screen's category (open list)
        performed_by_name       NVARCHAR(150)       NULL,       -- change by / inspector
        supplier_party_id       UNIQUEIDENTIFIER    NULL,       -- MAINTENANCE: the tyre shop
        supplier_party_code     VARCHAR(25)         NULL,
        inspection_date         DATE                NULL,
        required_date           DATE                NULL,
        bill_to_party_id        UNIQUEIDENTIFIER    NULL,       -- the screen's billing customer
        bill_to_party_code      VARCHAR(25)         NULL,
        subtotal_amount         DECIMAL(18,4)       NOT NULL CONSTRAINT df_tyre_document__subtotal DEFAULT 0,
        tax_rate                DECIMAL(9,4)        NOT NULL CONSTRAINT df_tyre_document__tax_rate DEFAULT 0,
        tax_amount              DECIMAL(18,4)       NOT NULL CONSTRAINT df_tyre_document__tax DEFAULT 0,
        total_amount            DECIMAL(18,4)       NOT NULL CONSTRAINT df_tyre_document__total DEFAULT 0,
        posted_at               DATETIMEOFFSET(7)   NULL,       -- written to the stock ledger at
        posted_by               UNIQUEIDENTIFIER    NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancelled_by            UNIQUEIDENTIFIER    NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_tyre_document__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_tyre_document__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_tyre_document PRIMARY KEY CLUSTERED (tyre_document_id),
        CONSTRAINT ck_tyre_document__status CHECK (status IN ('DRAFT','POSTED','CANCELLED')),
        CONSTRAINT ck_tyre_document__kind CHECK (document_kind IN ('CHANGE','MAINTENANCE')),
        CONSTRAINT ck_tyre_document__change_asset CHECK (document_kind <> 'CHANGE' OR asset_profile_id IS NOT NULL),
        CONSTRAINT ck_tyre_document__posted CHECK (status <> 'POSTED' OR posted_at IS NOT NULL),
        CONSTRAINT ck_tyre_document__supplier_pair CHECK ((supplier_party_id IS NULL AND supplier_party_code IS NULL) OR (supplier_party_id IS NOT NULL AND supplier_party_code IS NOT NULL)),
        CONSTRAINT ck_tyre_document__bill_to_pair CHECK ((bill_to_party_id IS NULL AND bill_to_party_code IS NULL) OR (bill_to_party_id IS NOT NULL AND bill_to_party_code IS NOT NULL)),
        CONSTRAINT ck_tyre_document__driver_pair CHECK ((driver_id IS NULL AND driver_code IS NULL) OR (driver_id IS NOT NULL AND driver_code IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_tyre_document__document ON tyre.tyre_document (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_tyre_document__branch_status ON tyre.tyre_document (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_tyre_document__asset ON tyre.tyre_document (tenant_id, asset_profile_id, document_date) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'tyre', @table = 'tyre_document';
END
GO

-- @table   tyre.tyre_event
-- @purpose Everything that happens to a tyre (fit, remove, rotate, inspect, repair, recap, scrap), with meter, tread, pressure, cost; never updated.
-- @vector  Fleet.TireHistory (mutable in legacy)
-- @owner   Fleet Tyres
-- @flags   A, P
-- @phase   6
IF OBJECT_ID('tyre.tyre_event') IS NULL
BEGIN
    CREATE TABLE tyre.tyre_event (
        tyre_event_id           UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_tyre_event__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        tyre_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref tyre.tyre
        serial_no               VARCHAR(40)         NOT NULL,   -- copy for lists
        event_type              VARCHAR(20)         NOT NULL,   -- INSTALL, REMOVE, ROTATE, INSPECT, REPAIR, SEND_RECAP, RECEIVE_RECAP, SCRAP, ADJUST
        asset_profile_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.asset_profile
        from_position           VARCHAR(6)          NULL,
        to_position             VARCHAR(6)          NULL,
        meter_km                DECIMAL(14,2)       NULL,       -- lifetime km of the asset at the event
        meter_hours             DECIMAL(12,2)       NULL,
        tread_mm                DECIMAL(5,1)        NULL,       -- measured (after the work for REPAIR / RECEIVE_RECAP)
        tread_before_mm         DECIMAL(5,1)        NULL,
        pressure_psi            DECIMAL(6,1)        NULL,
        cost                    DECIMAL(18,4)       NOT NULL CONSTRAINT df_tyre_event__cost DEFAULT 0,
        reason_code             VARCHAR(30)         NULL,       -- WORN_OUT, PUNCTURE, SIDEWALL, IRREGULAR_WEAR, SEPARATION, ROTATION, RECAP, OTHER
        destination             VARCHAR(20)         NULL,       -- REMOVE: STOCK, RECAP, REPAIR, SCRAP
        condition               VARCHAR(10)         NULL,       -- GOOD, FAIR, POOR
        tyre_document_id        UNIQUEIDENTIFIER    NULL,       -- ref tyre.tyre_document
        line_no                 SMALLINT            NULL,       -- position on the document
        work_order_id           UNIQUEIDENTIFIER    NULL,
        attachment_id           UNIQUEIDENTIFIER    NULL,       -- ref doc.attachment (photo)
        remarks                 NVARCHAR(500)       NULL,
        reverses_tyre_event_id  UNIQUEIDENTIFIER    NULL,       -- ref tyre.tyre_event (a reversal)
        event_at                DATETIMEOFFSET(7)   NOT NULL,
        client_ref              UNIQUEIDENTIFIER    NULL,       -- sync block (phase-2 app)
        device_id               UNIQUEIDENTIFIER    NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_tyre_event__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_tyre_event PRIMARY KEY NONCLUSTERED (tyre_event_id) ON [PRIMARY],
        CONSTRAINT ck_tyre_event__type CHECK (event_type IN ('INSTALL','REMOVE','ROTATE','INSPECT','REPAIR','SEND_RECAP','RECEIVE_RECAP','SCRAP','ADJUST')),
        CONSTRAINT ck_tyre_event__destination CHECK (destination IS NULL OR destination IN ('STOCK','RECAP','REPAIR','SCRAP')),
        CONSTRAINT ck_tyre_event__reason CHECK (reason_code IS NULL OR (reason_code = UPPER(reason_code) COLLATE Latin1_General_100_CS_AS AND reason_code NOT LIKE '%[^A-Z0-9_]%')),
        CONSTRAINT ck_tyre_event__cost CHECK (cost >= 0)
    ) ON ps_month (event_at);
    CREATE CLUSTERED INDEX cx_tyre_event ON tyre.tyre_event (event_at, tyre_event_id) ON ps_month (event_at);
    CREATE NONCLUSTERED INDEX ix_tyre_event__tyre ON tyre.tyre_event (tenant_id, tyre_id, event_at) ON [PRIMARY];
    CREATE NONCLUSTERED INDEX ix_tyre_event__asset ON tyre.tyre_event (tenant_id, asset_profile_id, event_at) WHERE asset_profile_id IS NOT NULL ON [PRIMARY];
    CREATE NONCLUSTERED INDEX ix_tyre_event__document ON tyre.tyre_event (tenant_id, tyre_document_id) WHERE tyre_document_id IS NOT NULL ON [PRIMARY];
    CREATE UNIQUE NONCLUSTERED INDEX uq_tyre_event__client_ref ON tyre.tyre_event (tenant_id, client_ref) WHERE client_ref IS NOT NULL ON [PRIMARY];
    EXEC dbo.usp_make_append_only @schema = 'tyre', @table = 'tyre_event';
END
GO

-- @table   tyre.tyre_fitment
-- @purpose One install → remove period of a tyre on an asset position: km / hours in and out, km run — the axle map and cost per km.
-- @vector  (derived)
-- @owner   Fleet Tyres
-- @flags   -
-- @phase   6
IF OBJECT_ID('tyre.tyre_fitment') IS NULL
BEGIN
    CREATE TABLE tyre.tyre_fitment (
        tyre_fitment_id         UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_tyre_fitment__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        tyre_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref tyre.tyre
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        position_code           VARCHAR(6)          NOT NULL,
        installed_at            DATETIMEOFFSET(7)   NOT NULL,
        removed_at              DATETIMEOFFSET(7)   NULL,       -- NULL = on the asset now
        km_in                   DECIMAL(14,2)       NULL,       -- asset lifetime km
        km_out                  DECIMAL(14,2)       NULL,
        km_run                  DECIMAL(12,1)       NULL,       -- km_out − km_in
        hours_in                DECIMAL(12,2)       NULL,
        hours_out               DECIMAL(12,2)       NULL,
        tread_in_mm             DECIMAL(5,1)        NULL,
        tread_out_mm            DECIMAL(5,1)        NULL,
        install_event_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref tyre.tyre_event
        remove_event_id         UNIQUEIDENTIFIER    NULL,       -- ref tyre.tyre_event
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_tyre_fitment__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_tyre_fitment__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_tyre_fitment PRIMARY KEY CLUSTERED (tyre_fitment_id),
        CONSTRAINT ck_tyre_fitment__period CHECK (removed_at IS NULL OR removed_at >= installed_at),
        CONSTRAINT ck_tyre_fitment__km CHECK (km_run IS NULL OR km_run >= 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_tyre_fitment__open_tyre ON tyre.tyre_fitment (tenant_id, tyre_id) WHERE removed_at IS NULL AND deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_tyre_fitment__open_position ON tyre.tyre_fitment (tenant_id, asset_profile_id, position_code) WHERE removed_at IS NULL AND deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_tyre_fitment__asset ON tyre.tyre_fitment (tenant_id, asset_profile_id, installed_at);
END
GO

EXEC dbo.usp_record_script '15_tyre.sql', N'tyre: tyre (T), tyre_document (T, FLT_TCH / FLT_TMN), tyre_event (A, P), tyre_fitment';
GO

IF OBJECT_ID('history.tyre_tyre') IS NULL OR OBJECT_ID('history.tyre_tyre_document') IS NULL
   OR OBJECT_ID('tyre.tyre_event') IS NULL OR OBJECT_ID('tyre.tyre_fitment') IS NULL
    THROW 50000, '15_tyre: a table or its history is missing.', 1;
GO
PRINT '15_tyre.sql completed.';
GO
