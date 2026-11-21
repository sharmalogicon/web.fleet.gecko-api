-- ============================================================
-- GECKO FLEET — INCIDENTS AND FUEL (P7)
-- Script: 16_incident_fuel.sql
--
--   asset.fuel_log                 a refuel of a Fleet-owned asset (FLT_FUEL). OWN_TANK = a stock
--                                  issue of a fuel item from a Fleet store at the weighted average
--                                  (inv.stock_ledger, posted on approval); VENDOR = a station fill.
--                                  A LINKED asset's fuel is Trucking's (owner 2026-11-20, Q3): the
--                                  API refuses it here and shows Trucking's fuel read-only.
--                                  DRAFT → PENDING_APPROVAL → APPROVED / REJECTED; CANCELLED.
--   incident.accident              accident report (FLT_ACC). OPEN → UNDER_REPAIR (a work request
--                                  was raised) → CLOSED; CANCELLED.
--   incident.accident_party        third parties of an accident (owner Q5: tracked).
--   incident.accident_attachment   photos / files (→ doc.attachment, like maint.wo_attachment).
--   incident.insurance_claim       claim to an insurer (FLT_CLM). DRAFT → SUBMITTED → APPROVED /
--                                  REJECTED → SETTLED; CANCELLED; REVISED (a revision copied it).
--   incident.insurance_claim_line  claimed lines; WO cost lines are copied in once (unique source).
--   incident.traffic_violation     a traffic ticket (FLT_TVN). OPEN → PAID → DEDUCTED; DISPUTED;
--                                  CANCELLED. Owner Q6: a fine the company paid is deducted from the
--                                  driver — PAYROLL (own drivers, payroll export) or SUBCON (the
--                                  subcontractor's Trucking statement, P5 deduction request).
-- Code lists (accident type, responsibility, violation type) are FIXED lists served by the API
-- (owner Q4), checked here as a format only so the list can grow without changing a CHECK.
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   asset.fuel_log
-- @purpose A refuel of a Fleet-owned asset: litres, source (own tank = stock issue / vendor station), cost, meter, efficiency.
-- @vector  Fleet.FuelLog
-- @owner   Fleet Operations
-- @flags   T
-- @phase   7
IF OBJECT_ID('asset.fuel_log') IS NULL
BEGIN
    CREATE TABLE asset.fuel_log (
        fuel_log_id             UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_fuel_log__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the asset's branch
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_FUEL
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_fuel_log__status DEFAULT 'DRAFT',   -- DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        asset_code              VARCHAR(30)         NOT NULL,
        driver_id               UNIQUEIDENTIFIER    NULL,       -- ref people.driver
        driver_code             VARCHAR(30)         NULL,
        fuel_card_no            VARCHAR(40)         NULL,
        fuelled_at              DATETIMEOFFSET(7)   NOT NULL,
        fuel_source             VARCHAR(10)         NOT NULL,   -- OWN_TANK, VENDOR
        warehouse_id            UNIQUEIDENTIFIER    NULL,       -- OWN_TANK: ref inv.warehouse (the fuel store)
        item_id                 UNIQUEIDENTIFIER    NULL,       -- OWN_TANK: ref inv.item (the fuel item, base unit litre)
        stock_ledger_id         UNIQUEIDENTIFIER    NULL,       -- OWN_TANK: the ISSUE row posted on approval
        supplier_party_id       UNIQUEIDENTIFIER    NULL,       -- VENDOR: ref gecko_master party
        supplier_party_code     VARCHAR(25)         NULL,
        supplier_name           NVARCHAR(200)       NULL,
        voucher_no              VARCHAR(40)         NULL,       -- the station's receipt / voucher number
        liters                  DECIMAL(12,3)       NOT NULL,
        unit_price              DECIMAL(18,4)       NULL,       -- VENDOR keyed; OWN_TANK the average at posting
        amount                  DECIMAL(18,2)       NULL,
        currency_code           CHAR(3)             NOT NULL,
        meter_km                DECIMAL(12,1)       NULL,
        meter_hours             DECIMAL(12,1)       NULL,
        meter_reading_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.meter_reading (source FUEL)
        distance_km             DECIMAL(12,1)       NULL,       -- since the previous approved log of the asset
        hours                   DECIMAL(12,1)       NULL,
        km_per_liter            DECIMAL(12,3)       NULL,
        cost_per_km             DECIMAL(18,4)       NULL,
        cost_per_hour           DECIMAL(18,4)       NULL,
        decided_at              DATETIMEOFFSET(7)   NULL,
        decided_by              UNIQUEIDENTIFIER    NULL,
        reject_reason           NVARCHAR(500)       NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        client_ref              VARCHAR(60)         NULL,       -- mobile idempotency (phase 2)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_fuel_log__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_fuel_log__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_fuel_log PRIMARY KEY CLUSTERED (fuel_log_id),
        CONSTRAINT ck_fuel_log__status CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','CANCELLED')),
        CONSTRAINT ck_fuel_log__source CHECK (fuel_source IN ('OWN_TANK','VENDOR')),
        CONSTRAINT ck_fuel_log__own_tank CHECK (fuel_source <> 'OWN_TANK' OR (warehouse_id IS NOT NULL AND item_id IS NOT NULL)),
        CONSTRAINT ck_fuel_log__posted CHECK (fuel_source <> 'OWN_TANK' OR status <> 'APPROVED' OR stock_ledger_id IS NOT NULL),
        CONSTRAINT ck_fuel_log__values CHECK (liters > 0 AND (unit_price IS NULL OR unit_price >= 0) AND (amount IS NULL OR amount >= 0)),
        CONSTRAINT ck_fuel_log__cancelled CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_fuel_log__no ON asset.fuel_log (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_fuel_log__client_ref ON asset.fuel_log (tenant_id, client_ref) WHERE deleted_at IS NULL AND client_ref IS NOT NULL;
    CREATE NONCLUSTERED INDEX ix_fuel_log__asset ON asset.fuel_log (tenant_id, asset_profile_id, fuelled_at) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_fuel_log__status ON asset.fuel_log (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'asset', @table = 'fuel_log';
END
GO

-- @table   incident.accident
-- @purpose An accident report: when, where, asset, driver, type, responsibility, police and insurance references, damage, status.
-- @vector  Fleet.AccidentReport
-- @owner   Fleet Operations
-- @flags   T
-- @phase   7
IF OBJECT_ID('incident.accident') IS NULL
BEGIN
    CREATE TABLE incident.accident (
        accident_id             UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_accident__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the asset's branch
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_ACC
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_accident__status DEFAULT 'OPEN',   -- OPEN, UNDER_REPAIR, CLOSED, CANCELLED
        occurred_at             DATETIMEOFFSET(7)   NOT NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        asset_code              VARCHAR(30)         NOT NULL,
        driver_id               UNIQUEIDENTIFIER    NULL,       -- ref people.driver
        driver_code             VARCHAR(30)         NULL,
        driver_name             NVARCHAR(200)       NULL,       -- free text when the driver is not in the register
        accident_type           VARCHAR(20)         NOT NULL,   -- fixed list from the API (COLLISION, ROLLOVER, FIRE, THEFT, OTHER, ...)
        responsibility          VARCHAR(20)         NOT NULL CONSTRAINT df_accident__responsibility DEFAULT 'UNKNOWN',   -- DRIVER, THIRD_PARTY, SHARED, UNKNOWN
        location_text           NVARCHAR(300)       NULL,
        address                 NVARCHAR(500)       NULL,
        city                    NVARCHAR(100)       NULL,
        country_code            CHAR(2)             NULL,
        latitude                DECIMAL(9,6)        NULL,
        longitude               DECIMAL(9,6)        NULL,
        police_station          NVARCHAR(200)       NULL,
        police_report_no        VARCHAR(60)         NULL,
        has_injuries            BIT                 NOT NULL CONSTRAINT df_accident__injuries DEFAULT 0,
        description             NVARCHAR(4000)      NULL,
        damage_details          NVARCHAR(4000)      NULL,
        insurance_policy_no     VARCHAR(60)         NULL,
        is_claimable            BIT                 NOT NULL CONSTRAINT df_accident__claimable DEFAULT 0,
        estimated_cost          DECIMAL(18,2)       NULL,
        currency_code           CHAR(3)             NULL,
        work_request_id         UNIQUEIDENTIFIER    NULL,       -- the repair request raised from it (ref maint.work_request)
        closed_at               DATETIMEOFFSET(7)   NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_accident__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_accident__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_accident PRIMARY KEY CLUSTERED (accident_id),
        CONSTRAINT ck_accident__status CHECK (status IN ('OPEN','UNDER_REPAIR','CLOSED','CANCELLED')),
        CONSTRAINT ck_accident__type CHECK (accident_type LIKE '[A-Z]%' AND accident_type NOT LIKE '%[^A-Z0-9_]%'),
        CONSTRAINT ck_accident__responsibility CHECK (responsibility LIKE '[A-Z]%' AND responsibility NOT LIKE '%[^A-Z0-9_]%'),
        CONSTRAINT ck_accident__closed CHECK (status <> 'CLOSED' OR closed_at IS NOT NULL),
        CONSTRAINT ck_accident__cancelled CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL),
        CONSTRAINT ck_accident__geo CHECK ((latitude IS NULL OR latitude BETWEEN -90 AND 90) AND (longitude IS NULL OR longitude BETWEEN -180 AND 180))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_accident__no ON incident.accident (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_accident__asset ON incident.accident (tenant_id, asset_profile_id, occurred_at) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_accident__driver ON incident.accident (tenant_id, driver_id, occurred_at) WHERE deleted_at IS NULL AND driver_id IS NOT NULL;
    CREATE NONCLUSTERED INDEX ix_accident__status ON incident.accident (tenant_id, branch_id, status, occurred_at) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'incident', @table = 'accident';
END
GO

-- @table   incident.accident_party
-- @purpose A third party of an accident: party or free name, vehicle plate, insurer, contact, statement.
-- @vector  (new)
-- @owner   Fleet Operations
-- @flags   -
-- @phase   7
IF OBJECT_ID('incident.accident_party') IS NULL
BEGIN
    CREATE TABLE incident.accident_party (
        accident_party_id       UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_accident_party__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        accident_id             UNIQUEIDENTIFIER    NOT NULL,   -- ref incident.accident
        line_no                 SMALLINT            NOT NULL,
        party_id                UNIQUEIDENTIFIER    NULL,       -- ref gecko_master party (when known)
        party_code              VARCHAR(25)         NULL,
        party_name              NVARCHAR(200)       NOT NULL,
        vehicle_plate           NVARCHAR(30)        NULL,
        vehicle_description     NVARCHAR(200)       NULL,
        insurer_name            NVARCHAR(200)       NULL,
        insurer_policy_no       VARCHAR(60)         NULL,
        contact_name            NVARCHAR(200)       NULL,
        contact_phone           VARCHAR(40)         NULL,
        statement               NVARCHAR(2000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_accident_party__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_accident_party__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_accident_party PRIMARY KEY CLUSTERED (accident_party_id),
        CONSTRAINT ck_accident_party__line CHECK (line_no > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_accident_party__line ON incident.accident_party (tenant_id, accident_id, line_no) WHERE deleted_at IS NULL;
END
GO

-- @table   incident.accident_attachment
-- @purpose A photo or file on an accident report (scene, damage, police report, repair).
-- @vector  accident images
-- @owner   Fleet Operations
-- @flags   -
-- @phase   7
IF OBJECT_ID('incident.accident_attachment') IS NULL
BEGIN
    CREATE TABLE incident.accident_attachment (
        accident_attachment_id  UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_accident_attachment__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        accident_id             UNIQUEIDENTIFIER    NOT NULL,
        attachment_id           UNIQUEIDENTIFIER    NOT NULL,   -- ref doc.attachment
        stage                   VARCHAR(20)         NOT NULL CONSTRAINT df_accident_attachment__stage DEFAULT 'SCENE',   -- SCENE, DAMAGE, POLICE, REPAIR, OTHER
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_accident_attachment__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_accident_attachment__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_accident_attachment PRIMARY KEY CLUSTERED (accident_attachment_id),
        CONSTRAINT ck_accident_attachment__stage CHECK (stage IN ('SCENE','DAMAGE','POLICE','REPAIR','OTHER'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_accident_attachment__pair ON incident.accident_attachment (tenant_id, accident_id, attachment_id) WHERE deleted_at IS NULL;
END
GO

-- @table   incident.insurance_claim
-- @purpose A claim to an insurer for an accident: insurer, references, amounts claimed / approved / settled, status, revisions.
-- @vector  Fleet.ClaimHeader
-- @owner   Fleet Operations
-- @flags   T
-- @phase   7
IF OBJECT_ID('incident.insurance_claim') IS NULL
BEGIN
    CREATE TABLE incident.insurance_claim (
        insurance_claim_id      UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_insurance_claim__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the accident's branch
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_CLM
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_insurance_claim__status DEFAULT 'DRAFT',   -- DRAFT, SUBMITTED, APPROVED, REJECTED, SETTLED, CANCELLED, REVISED
        accident_id             UNIQUEIDENTIFIER    NOT NULL,   -- ref incident.accident
        accident_no             VARCHAR(30)         NOT NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,
        asset_code              VARCHAR(30)         NOT NULL,
        insurer_party_id        UNIQUEIDENTIFIER    NULL,       -- ref gecko_master party
        insurer_party_code      VARCHAR(25)         NULL,
        insurer_name            NVARCHAR(200)       NULL,
        policy_no               VARCHAR(60)         NULL,
        insurer_claim_no        VARCHAR(60)         NULL,       -- the insurer's own reference
        contact_person          NVARCHAR(200)       NULL,
        claimed_by_name         NVARCHAR(200)       NULL,
        revised_from_claim_id   UNIQUEIDENTIFIER    NULL,       -- ref incident.insurance_claim
        currency_code           CHAR(3)             NOT NULL,
        subtotal_amount         DECIMAL(18,2)       NOT NULL CONSTRAINT df_insurance_claim__subtotal DEFAULT 0,
        discount_amount         DECIMAL(18,2)       NOT NULL CONSTRAINT df_insurance_claim__discount DEFAULT 0,
        tax_rate                DECIMAL(5,2)        NOT NULL CONSTRAINT df_insurance_claim__tax_rate DEFAULT 0,
        tax_amount              DECIMAL(18,2)       NOT NULL CONSTRAINT df_insurance_claim__tax DEFAULT 0,
        total_amount            DECIMAL(18,2)       NOT NULL CONSTRAINT df_insurance_claim__total DEFAULT 0,   -- claimed
        approved_amount         DECIMAL(18,2)       NULL,
        deductible_amount       DECIMAL(18,2)       NULL,       -- excess borne by the company
        settled_amount          DECIMAL(18,2)       NULL,
        submitted_at            DATETIMEOFFSET(7)   NULL,
        decided_at              DATETIMEOFFSET(7)   NULL,
        decided_by              UNIQUEIDENTIFIER    NULL,
        decision_reason         NVARCHAR(500)       NULL,
        settled_at              DATETIMEOFFSET(7)   NULL,
        settlement_ref          VARCHAR(60)         NULL,       -- payment / cheque reference
        erp_ref                 VARCHAR(60)         NULL,       -- SAP B1 (P10)
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_insurance_claim__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_insurance_claim__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_insurance_claim PRIMARY KEY CLUSTERED (insurance_claim_id),
        CONSTRAINT ck_insurance_claim__status CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','SETTLED','CANCELLED','REVISED')),
        CONSTRAINT ck_insurance_claim__amounts CHECK (subtotal_amount >= 0 AND discount_amount >= 0 AND tax_rate >= 0 AND tax_amount >= 0 AND total_amount >= 0
            AND (approved_amount IS NULL OR approved_amount >= 0) AND (deductible_amount IS NULL OR deductible_amount >= 0) AND (settled_amount IS NULL OR settled_amount >= 0)),
        CONSTRAINT ck_insurance_claim__settled CHECK (status <> 'SETTLED' OR (settled_at IS NOT NULL AND settled_amount IS NOT NULL)),
        CONSTRAINT ck_insurance_claim__cancelled CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_insurance_claim__no ON incident.insurance_claim (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_insurance_claim__accident ON incident.insurance_claim (tenant_id, accident_id) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_insurance_claim__status ON incident.insurance_claim (tenant_id, branch_id, status, document_date) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'incident', @table = 'insurance_claim';
END
GO

-- @table   incident.insurance_claim_line
-- @purpose A claimed line: labour, part, sublet or other, copied once from a work order cost line or keyed.
-- @vector  Fleet.ClaimDetail
-- @owner   Fleet Operations
-- @flags   T
-- @phase   7
IF OBJECT_ID('incident.insurance_claim_line') IS NULL
BEGIN
    CREATE TABLE incident.insurance_claim_line (
        insurance_claim_line_id UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_insurance_claim_line__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        insurance_claim_id      UNIQUEIDENTIFIER    NOT NULL,   -- ref incident.insurance_claim
        line_no                 SMALLINT            NOT NULL,
        line_kind               VARCHAR(10)         NOT NULL,   -- LABOR, PART, SUBLET, OTHER
        source                  VARCHAR(10)         NOT NULL CONSTRAINT df_insurance_claim_line__source DEFAULT 'MANUAL',   -- WO_PART, WO_LABOR, WO_SUBLET, MANUAL
        source_line_id          UNIQUEIDENTIFIER    NULL,       -- ref maint.wo_part / wo_labor / wo_sublet
        work_order_id           UNIQUEIDENTIFIER    NULL,
        work_order_no           VARCHAR(30)         NULL,
        item_id                 UNIQUEIDENTIFIER    NULL,       -- ref inv.item
        item_code               VARCHAR(40)         NULL,
        description             NVARCHAR(500)       NOT NULL,
        qty                     DECIMAL(18,4)       NOT NULL CONSTRAINT df_insurance_claim_line__qty DEFAULT 1,
        unit_price              DECIMAL(18,4)       NOT NULL CONSTRAINT df_insurance_claim_line__price DEFAULT 0,
        amount                  DECIMAL(18,2)       NOT NULL CONSTRAINT df_insurance_claim_line__amount DEFAULT 0,
        approved_amount         DECIMAL(18,2)       NULL,
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_insurance_claim_line__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_insurance_claim_line__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_insurance_claim_line PRIMARY KEY CLUSTERED (insurance_claim_line_id),
        CONSTRAINT ck_insurance_claim_line__kind CHECK (line_kind IN ('LABOR','PART','SUBLET','OTHER')),
        CONSTRAINT ck_insurance_claim_line__source CHECK (source IN ('WO_PART','WO_LABOR','WO_SUBLET','MANUAL')),
        CONSTRAINT ck_insurance_claim_line__sourced CHECK (source = 'MANUAL' OR source_line_id IS NOT NULL),
        CONSTRAINT ck_insurance_claim_line__values CHECK (line_no > 0 AND qty > 0 AND unit_price >= 0 AND amount >= 0 AND (approved_amount IS NULL OR approved_amount >= 0))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_insurance_claim_line__line ON incident.insurance_claim_line (tenant_id, insurance_claim_id, line_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_insurance_claim_line__source ON incident.insurance_claim_line (tenant_id, insurance_claim_id, source_line_id) WHERE deleted_at IS NULL AND source_line_id IS NOT NULL;
    EXEC dbo.usp_enable_temporal @schema = 'incident', @table = 'insurance_claim_line';
END
GO

-- @table   incident.traffic_violation
-- @purpose A traffic ticket on an asset / driver: fine, due date, who paid, and the deduction from the driver.
-- @vector  Fleet.TrafficViolation
-- @owner   Fleet Operations
-- @flags   T
-- @phase   7
IF OBJECT_ID('incident.traffic_violation') IS NULL
BEGIN
    CREATE TABLE incident.traffic_violation (
        traffic_violation_id    UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_traffic_violation__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the asset's branch
        document_no             VARCHAR(30)         NOT NULL,   -- FLT_TVN
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_traffic_violation__status DEFAULT 'OPEN',   -- OPEN, PAID, DEDUCTED, DISPUTED, CANCELLED
        ticket_no               VARCHAR(60)         NOT NULL,   -- the police ticket number
        issuing_authority       NVARCHAR(200)       NULL,
        occurred_at             DATETIMEOFFSET(7)   NOT NULL,
        location_text           NVARCHAR(300)       NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        asset_code              VARCHAR(30)         NOT NULL,
        driver_id               UNIQUEIDENTIFIER    NULL,       -- ref people.driver
        driver_code             VARCHAR(30)         NULL,
        violation_type          VARCHAR(20)         NOT NULL,   -- fixed list from the API (SPEEDING, PARKING, RED_LIGHT, ...)
        description             NVARCHAR(1000)      NULL,
        fine_amount             DECIMAL(18,2)       NOT NULL,
        currency_code           CHAR(3)             NOT NULL,
        points                  SMALLINT            NULL,
        due_date                DATE                NULL,
        paid_by                 VARCHAR(10)         NULL,       -- COMPANY, DRIVER
        paid_at                 DATE                NULL,
        payment_ref             VARCHAR(60)         NULL,
        deduction_mode          VARCHAR(10)         NULL,       -- PAYROLL (own driver), SUBCON (the subcontractor's Trucking statement)
        deduction_amount        DECIMAL(18,2)       NULL,
        deducted_at             DATETIMEOFFSET(7)   NULL,
        deduction_party_code    VARCHAR(25)         NULL,       -- SUBCON: the haulier the statement belongs to
        deduction_ref           VARCHAR(60)         NULL,       -- statement no / payroll batch
        payroll_exported_at     DATETIMEOFFSET(7)   NULL,
        dispute_reason          NVARCHAR(500)       NULL,
        cancelled_at            DATETIMEOFFSET(7)   NULL,
        cancel_reason           NVARCHAR(500)       NULL,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_traffic_violation__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_traffic_violation__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_traffic_violation PRIMARY KEY CLUSTERED (traffic_violation_id),
        CONSTRAINT ck_traffic_violation__status CHECK (status IN ('OPEN','PAID','DEDUCTED','DISPUTED','CANCELLED')),
        CONSTRAINT ck_traffic_violation__type CHECK (violation_type LIKE '[A-Z]%' AND violation_type NOT LIKE '%[^A-Z0-9_]%'),
        CONSTRAINT ck_traffic_violation__paid_by CHECK (paid_by IS NULL OR paid_by IN ('COMPANY','DRIVER')),
        CONSTRAINT ck_traffic_violation__paid CHECK (status NOT IN ('PAID','DEDUCTED') OR (paid_by IS NOT NULL AND paid_at IS NOT NULL)),
        CONSTRAINT ck_traffic_violation__mode CHECK (deduction_mode IS NULL OR deduction_mode IN ('PAYROLL','SUBCON')),
        CONSTRAINT ck_traffic_violation__deducted CHECK (status <> 'DEDUCTED' OR (deduction_mode IS NOT NULL AND deducted_at IS NOT NULL AND deduction_amount IS NOT NULL)),
        CONSTRAINT ck_traffic_violation__values CHECK (fine_amount >= 0 AND (deduction_amount IS NULL OR deduction_amount > 0) AND (points IS NULL OR points >= 0)),
        CONSTRAINT ck_traffic_violation__cancelled CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_traffic_violation__no ON incident.traffic_violation (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_traffic_violation__ticket ON incident.traffic_violation (tenant_id, ticket_no) WHERE deleted_at IS NULL AND status <> 'CANCELLED';
    CREATE NONCLUSTERED INDEX ix_traffic_violation__driver ON incident.traffic_violation (tenant_id, driver_id, occurred_at) WHERE deleted_at IS NULL AND driver_id IS NOT NULL;
    CREATE NONCLUSTERED INDEX ix_traffic_violation__status ON incident.traffic_violation (tenant_id, branch_id, status, occurred_at) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'incident', @table = 'traffic_violation';
END
GO

EXEC dbo.usp_record_script '16_incident_fuel.sql', N'P7: asset.fuel_log, incident.accident (+ party, attachment), incident.insurance_claim (+ line), incident.traffic_violation; temporal';
GO

IF OBJECT_ID('history.asset_fuel_log') IS NULL OR OBJECT_ID('history.incident_accident') IS NULL OR OBJECT_ID('history.incident_insurance_claim') IS NULL
   OR OBJECT_ID('history.incident_insurance_claim_line') IS NULL OR OBJECT_ID('history.incident_traffic_violation') IS NULL
   OR OBJECT_ID('incident.accident_party') IS NULL OR OBJECT_ID('incident.accident_attachment') IS NULL
    THROW 50000, '16_incident_fuel: a table or its history is missing.', 1;
GO
PRINT '16_incident_fuel.sql completed.';
GO
