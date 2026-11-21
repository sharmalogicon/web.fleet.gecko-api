-- ============================================================
-- GECKO FLEET — INSPECTIONS AND DEFECTS (P1 tables; screens P3, mobile phase 2)
-- Script: 09_insp.sql
--
-- Decision Q11 (2026-11-19): the driver / technician app comes in phase 2, but
-- the tables it writes are created now, so nothing changes shape later.
--   insp.inspection_template       checklist (pre-trip, post-trip, periodic, tyre,
--                                  handover), optionally for one asset class
--   insp.inspection_template_item  one check line: section, text, response type,
--                                  photo-on-fail, default defect severity
--   insp.inspection                one filled-in checklist (INS number series)
--   insp.inspection_result         the answer to one line
--   insp.defect                    a fault found (by an inspection or reported
--                                  directly): severity, status, the work request
--                                  raised for it, repair verification
-- SYNC BLOCK on every table a phone writes (inspection, inspection_result, defect):
--   client_ref  UNIQUEIDENTIFIER made on the device — unique per tenant, so a
--               record sent twice is recognised, not duplicated
--   device_id   ref people.device
--   captured_at device time; received_at server time
-- Templates and defects are temporal; inspections and results are write-once
-- records (a correction is a new inspection). Run 91_rls_policy.sql AFTER.
-- Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   insp.inspection_template
-- @purpose A checklist drivers / inspectors fill in (pre-trip, post-trip, periodic, tyre, handover), optionally for one asset class.
-- @vector  none — new
-- @owner   Fleet Inspections
-- @flags   T
-- @phase   1
IF OBJECT_ID('insp.inspection_template') IS NULL
BEGIN
    CREATE TABLE insp.inspection_template (
        inspection_template_id  UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_inspection_template__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        template_code           VARCHAR(30)         NOT NULL,
        name_en                 NVARCHAR(200)       NOT NULL,
        name_local              NVARCHAR(200)       NULL,
        inspection_kind         VARCHAR(20)         NOT NULL,   -- PRE_TRIP, POST_TRIP, PERIODIC, TYRE, HANDOVER
        asset_class             VARCHAR(30)         NULL,       -- Fleet asset class it is for (PRIME_MOVER, TRAILER_CHASSIS ...); NULL = any
        is_active               BIT                 NOT NULL CONSTRAINT df_inspection_template__is_active DEFAULT 1,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_inspection_template__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_inspection_template__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_inspection_template PRIMARY KEY CLUSTERED (inspection_template_id),
        CONSTRAINT ck_inspection_template__code CHECK (template_code = UPPER(template_code) COLLATE Latin1_General_100_CS_AS AND template_code NOT LIKE '%[^A-Z0-9._-]%' AND LEN(template_code) > 0),
        CONSTRAINT ck_inspection_template__kind CHECK (inspection_kind IN ('PRE_TRIP','POST_TRIP','PERIODIC','TYRE','HANDOVER'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_inspection_template__code
        ON insp.inspection_template (tenant_id, template_code) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'insp', @table = 'inspection_template';
END
GO

-- @table   insp.inspection_template_item
-- @purpose One line of a checklist: section, check text, how it is answered, photo on fail, default severity of a failure.
-- @vector  none — new
-- @owner   Fleet Inspections
-- @flags   T
-- @phase   1
IF OBJECT_ID('insp.inspection_template_item') IS NULL
BEGIN
    CREATE TABLE insp.inspection_template_item (
        inspection_template_item_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_inspection_template_item__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        inspection_template_id  UNIQUEIDENTIFIER    NOT NULL,   -- ref insp.inspection_template
        seq_no                  SMALLINT            NOT NULL,   -- order on the checklist
        section_en              NVARCHAR(100)       NULL,       -- e.g. Lights, Brakes, Tyres
        section_local           NVARCHAR(100)       NULL,
        item_text_en            NVARCHAR(300)       NOT NULL,
        item_text_local         NVARCHAR(300)       NULL,
        response_type           VARCHAR(20)         NOT NULL CONSTRAINT df_inspection_template_item__response DEFAULT 'PASS_FAIL',   -- PASS_FAIL, NUMBER, TEXT, PHOTO
        unit_label              VARCHAR(20)         NULL,       -- NUMBER answers: mm, psi, %
        min_value               DECIMAL(18,4)       NULL,       -- NUMBER answers outside min..max count as a fail
        max_value               DECIMAL(18,4)       NULL,
        photo_required_on_fail  BIT                 NOT NULL CONSTRAINT df_inspection_template_item__photo DEFAULT 0,
        default_severity        VARCHAR(20)         NOT NULL CONSTRAINT df_inspection_template_item__severity DEFAULT 'MINOR',   -- MINOR, MAJOR, OUT_OF_SERVICE
        is_active               BIT                 NOT NULL CONSTRAINT df_inspection_template_item__is_active DEFAULT 1,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_inspection_template_item__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_inspection_template_item__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_inspection_template_item PRIMARY KEY CLUSTERED (inspection_template_item_id),
        CONSTRAINT ck_inspection_template_item__response CHECK (response_type IN ('PASS_FAIL','NUMBER','TEXT','PHOTO')),
        CONSTRAINT ck_inspection_template_item__severity CHECK (default_severity IN ('MINOR','MAJOR','OUT_OF_SERVICE')),
        CONSTRAINT ck_inspection_template_item__range CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value),
        CONSTRAINT ck_inspection_template_item__seq CHECK (seq_no > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_inspection_template_item__seq
        ON insp.inspection_template_item (tenant_id, inspection_template_id, seq_no) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'insp', @table = 'inspection_template_item';
END
GO

-- @table   insp.inspection
-- @purpose One filled-in checklist for one asset (INS number), by a driver or inspector, from the web or the phone.
-- @vector  none — new (DVIR)
-- @owner   Fleet Inspections
-- @flags   -
-- @phase   1
IF OBJECT_ID('insp.inspection') IS NULL
BEGIN
    CREATE TABLE insp.inspection (
        inspection_id           UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_inspection__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        document_no             VARCHAR(30)         NOT NULL,   -- INS number series
        document_date           DATE                NOT NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_inspection__status DEFAULT 'IN_PROGRESS',   -- IN_PROGRESS, SUBMITTED, CANCELLED
        inspection_template_id  UNIQUEIDENTIFIER    NOT NULL,   -- ref insp.inspection_template
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        driver_id               UNIQUEIDENTIFIER    NULL,       -- ref people.driver: who did it (a driver)
        driver_code             VARCHAR(20)         NULL,       -- code of the above
        inspector_user_id       UNIQUEIDENTIFIER    NULL,       -- ref gecko_identity:iam.user: who did it (any login)
        meter_km                DECIMAL(12,1)       NULL,       -- odometer read at the inspection
        meter_hours             DECIMAL(10,1)       NULL,       -- hour meter read at the inspection
        latitude                DECIMAL(9,6)        NULL,
        longitude               DECIMAL(9,6)        NULL,
        started_at              DATETIMEOFFSET(7)   NULL,
        submitted_at            DATETIMEOFFSET(7)   NULL,
        result                  VARCHAR(10)         NULL,       -- PASS, FAIL (set on submit)
        signature_attachment_id UNIQUEIDENTIFIER    NULL,       -- ref doc.attachment: signature image
        remarks                 NVARCHAR(1000)      NULL,
        client_ref              UNIQUEIDENTIFIER    NULL,       -- sync block: id made on the device (duplicate guard)
        device_id               UNIQUEIDENTIFIER    NULL,       -- sync block: ref people.device
        captured_at             DATETIMEOFFSET(7)   NULL,       -- sync block: device time
        received_at             DATETIMEOFFSET(7)   NULL,       -- sync block: server time
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_inspection__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_inspection__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_inspection PRIMARY KEY CLUSTERED (inspection_id),
        CONSTRAINT ck_inspection__status CHECK (status IN ('IN_PROGRESS','SUBMITTED','CANCELLED')),
        CONSTRAINT ck_inspection__result CHECK (result IS NULL OR result IN ('PASS','FAIL')),
        CONSTRAINT ck_inspection__submitted CHECK (status <> 'SUBMITTED' OR (submitted_at IS NOT NULL AND result IS NOT NULL)),
        CONSTRAINT ck_inspection__driver_pair CHECK ((driver_id IS NULL AND driver_code IS NULL) OR (driver_id IS NOT NULL AND driver_code IS NOT NULL)),
        CONSTRAINT ck_inspection__position CHECK ((latitude IS NULL AND longitude IS NULL)
            OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)),
        CONSTRAINT ck_inspection__meters CHECK ((meter_km IS NULL OR meter_km >= 0) AND (meter_hours IS NULL OR meter_hours >= 0))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_inspection__document
        ON insp.inspection (tenant_id, document_no) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_inspection__client_ref
        ON insp.inspection (tenant_id, client_ref) WHERE client_ref IS NOT NULL;
    CREATE NONCLUSTERED INDEX ix_inspection__asset_date
        ON insp.inspection (tenant_id, asset_profile_id, document_date) INCLUDE (status, result) WHERE deleted_at IS NULL;
END
GO

-- @table   insp.inspection_result
-- @purpose The answer to one checklist line: pass / fail / n.a., a number or text, a comment and a photo.
-- @vector  none — new
-- @owner   Fleet Inspections
-- @flags   -
-- @phase   1
IF OBJECT_ID('insp.inspection_result') IS NULL
BEGIN
    CREATE TABLE insp.inspection_result (
        inspection_result_id    UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_inspection_result__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        inspection_id           UNIQUEIDENTIFIER    NOT NULL,   -- ref insp.inspection
        inspection_template_item_id UNIQUEIDENTIFIER NOT NULL,  -- ref insp.inspection_template_item
        seq_no                  SMALLINT            NOT NULL,
        response                VARCHAR(10)         NULL,       -- PASS, FAIL, NA (PASS_FAIL lines; others derive PASS / FAIL)
        value_number            DECIMAL(18,4)       NULL,
        value_text              NVARCHAR(500)       NULL,
        comment                 NVARCHAR(1000)      NULL,
        attachment_id           UNIQUEIDENTIFIER    NULL,       -- ref doc.attachment: photo
        client_ref              UNIQUEIDENTIFIER    NULL,       -- sync block
        device_id               UNIQUEIDENTIFIER    NULL,
        captured_at             DATETIMEOFFSET(7)   NULL,
        received_at             DATETIMEOFFSET(7)   NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_inspection_result__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_inspection_result__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_inspection_result PRIMARY KEY CLUSTERED (inspection_result_id),
        CONSTRAINT ck_inspection_result__response CHECK (response IS NULL OR response IN ('PASS','FAIL','NA'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_inspection_result__line
        ON insp.inspection_result (tenant_id, inspection_id, inspection_template_item_id) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_inspection_result__client_ref
        ON insp.inspection_result (tenant_id, client_ref) WHERE client_ref IS NOT NULL;
END
GO

-- @table   insp.defect
-- @purpose A fault found on an asset (by an inspection or reported directly): severity, status, the work request raised, repair verification.
-- @vector  none — new
-- @owner   Fleet Inspections
-- @flags   T
-- @phase   1
IF OBJECT_ID('insp.defect') IS NULL
BEGIN
    CREATE TABLE insp.defect (
        defect_id               UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_defect__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        inspection_id           UNIQUEIDENTIFIER    NULL,       -- ref insp.inspection (NULL = reported directly)
        inspection_result_id    UNIQUEIDENTIFIER    NULL,       -- ref insp.inspection_result
        description             NVARCHAR(1000)      NOT NULL,
        severity                VARCHAR(20)         NOT NULL,   -- MINOR, MAJOR, OUT_OF_SERVICE (OOS takes the asset off the road)
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_defect__status DEFAULT 'OPEN',   -- OPEN, WR_RAISED, RESOLVED, DEFERRED
        work_request_id         UNIQUEIDENTIFIER    NULL,       -- ref maint.work_request (P3)
        deferred_until          DATE                NULL,       -- DEFERRED: look again by this date
        deferred_reason         NVARCHAR(500)       NULL,
        repair_verified_at      DATETIMEOFFSET(7)   NULL,
        repair_verified_by      UNIQUEIDENTIFIER    NULL,       -- ref gecko_identity:iam.user
        reported_by_user_id     UNIQUEIDENTIFIER    NULL,
        attachment_id           UNIQUEIDENTIFIER    NULL,       -- ref doc.attachment: photo of the fault
        client_ref              UNIQUEIDENTIFIER    NULL,       -- sync block
        device_id               UNIQUEIDENTIFIER    NULL,
        captured_at             DATETIMEOFFSET(7)   NULL,
        received_at             DATETIMEOFFSET(7)   NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_defect__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_defect__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_defect PRIMARY KEY CLUSTERED (defect_id),
        CONSTRAINT ck_defect__severity CHECK (severity IN ('MINOR','MAJOR','OUT_OF_SERVICE')),
        CONSTRAINT ck_defect__status CHECK (status IN ('OPEN','WR_RAISED','RESOLVED','DEFERRED')),
        CONSTRAINT ck_defect__wr CHECK (status <> 'WR_RAISED' OR work_request_id IS NOT NULL),
        CONSTRAINT ck_defect__deferred CHECK (status <> 'DEFERRED' OR deferred_until IS NOT NULL)
    );
    CREATE NONCLUSTERED INDEX ix_defect__asset_status
        ON insp.defect (tenant_id, asset_profile_id, status) INCLUDE (severity) WHERE deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_defect__client_ref
        ON insp.defect (tenant_id, client_ref) WHERE client_ref IS NOT NULL;
    EXEC dbo.usp_enable_temporal @schema = 'insp', @table = 'defect';
END
GO

IF OBJECT_ID('history.insp_inspection_template') IS NULL OR OBJECT_ID('history.insp_inspection_template_item') IS NULL
   OR OBJECT_ID('insp.inspection') IS NULL OR OBJECT_ID('insp.inspection_result') IS NULL OR OBJECT_ID('history.insp_defect') IS NULL
    THROW 50000, '09_insp: a table or its history is missing.', 1;
GO
PRINT '09_insp.sql completed.';
GO
