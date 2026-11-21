-- ============================================================
-- GECKO FLEET — METERS AND PREVENTIVE MAINTENANCE (P2)
-- Script: 10_meter_pm.sql
--
-- METERS (decision D6: ledgers are append-only; a correction is a new row)
--   asset.meter_segment        a meter's life: INITIAL, REPLACEMENT (new
--                              dial), ROLLOVER (dial wrapped). offset_value
--                              turns a dial reading into a lifetime value
--                              that never goes backwards.
--   asset.meter_reading  (A,P) every odometer / hour-meter reading: dial
--                              value, lifetime value, source, validity
--                              (VALID / SUSPECT as recorded; REVERSED rows
--                              cancel the reading they point at). Partitioned
--                              monthly on ps_month.
--   asset.meter_reading_review (A) the decision on a SUSPECT reading
--                              (ACCEPTED / REJECTED): the reading row itself
--                              is never updated.
-- PREVENTIVE MAINTENANCE (the PM Scheduler screen)
--   maint.pm_program            a schedule: code, name, category, start date,
--                              default km interval
--   maint.pm_program_task       a service task in it, every interval_km /
--                              interval_hours / interval_days (whichever first)
--   maint.pm_program_part       standard parts of a task (item, qty)
--   maint.pm_program_labor      standard labour of a task (trade, hours)
--   maint.pm_assignment         schedule <-> asset, from / to
--   maint.pm_task_state         per assignment and task: last done, next due,
--                              due status (recalculated by the application on
--                              every reading, completion and assignment change)
-- Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   asset.meter_segment
-- @purpose One stretch of a meter's life (installed, replaced, rolled over) with the offset that makes readings lifetime values.
-- @vector  none — new
-- @owner   Fleet Assets
-- @flags   A
-- @phase   2
IF OBJECT_ID('asset.meter_segment') IS NULL
BEGIN
    CREATE TABLE asset.meter_segment (
        meter_segment_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_meter_segment__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        meter_kind              VARCHAR(10)         NOT NULL,   -- KM, HOUR
        segment_no              SMALLINT            NOT NULL,   -- 1, 2, 3 ... per asset and kind
        reason                  VARCHAR(20)         NOT NULL,   -- INITIAL, REPLACEMENT, ROLLOVER
        started_at              DATETIMEOFFSET(7)   NOT NULL,
        start_reading           DECIMAL(12,2)       NOT NULL,   -- dial value when the segment started
        offset_value            DECIMAL(14,2)       NOT NULL,   -- lifetime = dial + offset
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_meter_segment__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_meter_segment PRIMARY KEY CLUSTERED (meter_segment_id),
        CONSTRAINT ck_meter_segment__kind CHECK (meter_kind IN ('KM','HOUR')),
        CONSTRAINT ck_meter_segment__reason CHECK (reason IN ('INITIAL','REPLACEMENT','ROLLOVER')),
        CONSTRAINT ck_meter_segment__values CHECK (start_reading >= 0 AND segment_no > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_meter_segment__no
        ON asset.meter_segment (tenant_id, asset_profile_id, meter_kind, segment_no);
    EXEC dbo.usp_make_append_only @schema = 'asset', @table = 'meter_segment';
END
GO

-- @table   asset.meter_reading
-- @purpose Every odometer / hour-meter reading of an asset: dial and lifetime value, source document, validity.
-- @vector  Fleet.MeterLog, Fleet.MeterHrLog, Equipment.LastMeterReading
-- @owner   Fleet Assets
-- @flags   A, P
-- @phase   2
IF OBJECT_ID('asset.meter_reading') IS NULL
BEGIN
    CREATE TABLE asset.meter_reading (
        meter_reading_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_meter_reading__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- the asset's branch when read
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        meter_kind              VARCHAR(10)         NOT NULL,   -- KM, HOUR
        reading_value           DECIMAL(12,2)       NOT NULL,   -- raw value on the dial
        meter_segment_id        UNIQUEIDENTIFIER    NULL,       -- ref asset.meter_segment (NULL = before any segment: offset 0)
        lifetime_value          DECIMAL(14,2)       NOT NULL,   -- reading + segment offset
        reading_at              DATETIMEOFFSET(7)   NOT NULL,
        source                  VARCHAR(20)         NOT NULL,   -- MANUAL, JOB_ORDER, TRIP_EVENT, TELEMATICS, FUEL, WORK_ORDER, TYRE, INSPECTION, MIGRATION
        source_ref_id           UNIQUEIDENTIFIER    NULL,       -- the originating document (soft ref; may be another database)
        source_ref_no           VARCHAR(40)         NULL,
        driver_id               UNIQUEIDENTIFIER    NULL,       -- ref people.driver
        driver_code             VARCHAR(20)         NULL,
        validity                VARCHAR(20)         NOT NULL,   -- VALID, SUSPECT (as recorded), REVERSED (this row cancels reverses_meter_reading_id)
        suspect_reason          NVARCHAR(200)       NULL,       -- why the checks flagged it
        reverses_meter_reading_id UNIQUEIDENTIFIER  NULL,       -- ref asset.meter_reading (a reversal row)
        remarks                 NVARCHAR(500)       NULL,
        client_ref              UNIQUEIDENTIFIER    NULL,       -- sync block (phase-2 app)
        device_id               UNIQUEIDENTIFIER    NULL,
        captured_at             DATETIMEOFFSET(7)   NULL,
        received_at             DATETIMEOFFSET(7)   NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_meter_reading__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_meter_reading PRIMARY KEY NONCLUSTERED (meter_reading_id) ON [PRIMARY],
        CONSTRAINT ck_meter_reading__kind CHECK (meter_kind IN ('KM','HOUR')),
        CONSTRAINT ck_meter_reading__source CHECK (source = UPPER(source) COLLATE Latin1_General_100_CS_AS AND source NOT LIKE '%[^A-Z_]%'),
        CONSTRAINT ck_meter_reading__validity CHECK (validity IN ('VALID','SUSPECT','REVERSED')),
        CONSTRAINT ck_meter_reading__reversal CHECK ((validity = 'REVERSED' AND reverses_meter_reading_id IS NOT NULL)
            OR (validity <> 'REVERSED' AND reverses_meter_reading_id IS NULL)),
        CONSTRAINT ck_meter_reading__values CHECK (reading_value >= 0 AND lifetime_value >= 0),
        CONSTRAINT ck_meter_reading__driver_pair CHECK ((driver_id IS NULL AND driver_code IS NULL) OR (driver_id IS NOT NULL AND driver_code IS NOT NULL))
    ) ON ps_month (reading_at);
    CREATE CLUSTERED INDEX cx_meter_reading ON asset.meter_reading (reading_at, meter_reading_id) ON ps_month (reading_at);
    CREATE NONCLUSTERED INDEX ix_meter_reading__asset
        ON asset.meter_reading (tenant_id, asset_profile_id, meter_kind, reading_at) INCLUDE (lifetime_value, validity, reverses_meter_reading_id) ON [PRIMARY];
    CREATE UNIQUE NONCLUSTERED INDEX uq_meter_reading__reverses
        ON asset.meter_reading (tenant_id, reverses_meter_reading_id) WHERE reverses_meter_reading_id IS NOT NULL ON [PRIMARY];
    CREATE UNIQUE NONCLUSTERED INDEX uq_meter_reading__client_ref
        ON asset.meter_reading (tenant_id, client_ref) WHERE client_ref IS NOT NULL ON [PRIMARY];
    EXEC dbo.usp_make_append_only @schema = 'asset', @table = 'meter_reading';
END
GO

-- @table   asset.meter_reading_review
-- @purpose The decision on a SUSPECT reading (ACCEPTED counts it, REJECTED ignores it), with who, when and why.
-- @vector  none — new
-- @owner   Fleet Assets
-- @flags   A
-- @phase   2
IF OBJECT_ID('asset.meter_reading_review') IS NULL
BEGIN
    CREATE TABLE asset.meter_reading_review (
        meter_reading_review_id UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_meter_reading_review__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        meter_reading_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.meter_reading
        decision                VARCHAR(10)         NOT NULL,   -- ACCEPTED, REJECTED
        reason                  NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_meter_reading_review__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        CONSTRAINT pk_meter_reading_review PRIMARY KEY CLUSTERED (meter_reading_review_id),
        CONSTRAINT ck_meter_reading_review__decision CHECK (decision IN ('ACCEPTED','REJECTED'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_meter_reading_review__reading
        ON asset.meter_reading_review (tenant_id, meter_reading_id);
    EXEC dbo.usp_make_append_only @schema = 'asset', @table = 'meter_reading_review';
END
GO

-- @table   maint.pm_program
-- @purpose A preventive-maintenance schedule (the PM Scheduler screen's header): code, name, category, start date, default km interval.
-- @vector  Master.PMSchedule
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   2
IF OBJECT_ID('maint.pm_program') IS NULL
BEGIN
    CREATE TABLE maint.pm_program (
        pm_program_id           UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_pm_program__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        program_code            VARCHAR(30)         NOT NULL,   -- the screen's schedule no
        name_en                 NVARCHAR(200)       NOT NULL,
        name_local              NVARCHAR(200)       NULL,
        category_code           VARCHAR(40)         NULL,       -- FLEET_SERVICE_CATEGORY (the screen's service type)
        effective_date          DATE                NULL,       -- the screen's schedule date
        default_interval_km     INT                 NULL,       -- the screen's meter km: default for tasks without their own interval
        asset_class             VARCHAR(30)         NULL,       -- asset class it is meant for; NULL = any
        is_active               BIT                 NOT NULL CONSTRAINT df_pm_program__is_active DEFAULT 1,
        remarks                 NVARCHAR(1000)      NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_program__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_program__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_pm_program PRIMARY KEY CLUSTERED (pm_program_id),
        CONSTRAINT ck_pm_program__code CHECK (program_code = UPPER(program_code) COLLATE Latin1_General_100_CS_AS AND LEN(program_code) > 0),
        CONSTRAINT ck_pm_program__interval CHECK (default_interval_km IS NULL OR default_interval_km > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_pm_program__code
        ON maint.pm_program (tenant_id, program_code) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'pm_program';
END
GO

-- @table   maint.pm_program_task
-- @purpose A service task in a PM schedule, due every interval_km / interval_hours / interval_days (whichever comes first).
-- @vector  Master.PMScheduleItem
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   2
IF OBJECT_ID('maint.pm_program_task') IS NULL
BEGIN
    CREATE TABLE maint.pm_program_task (
        pm_program_task_id      UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_pm_program_task__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        pm_program_id           UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.pm_program
        service_task_id         UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.service_task
        seq_no                  SMALLINT            NOT NULL,
        interval_km             INT                 NULL,       -- the screen's meter interval
        interval_hours          INT                 NULL,
        interval_days           INT                 NULL,
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_program_task__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_program_task__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_pm_program_task PRIMARY KEY CLUSTERED (pm_program_task_id),
        CONSTRAINT ck_pm_program_task__intervals CHECK ((interval_km IS NULL OR interval_km > 0) AND (interval_hours IS NULL OR interval_hours > 0)
            AND (interval_days IS NULL OR interval_days > 0)),
        CONSTRAINT ck_pm_program_task__seq CHECK (seq_no > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_pm_program_task__task
        ON maint.pm_program_task (tenant_id, pm_program_id, service_task_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'pm_program_task';
END
GO

-- @table   maint.pm_program_part
-- @purpose A standard part of a PM task (item and quantity), for estimates and parts picking.
-- @vector  Master.PMScheduleParts
-- @owner   Fleet Maintenance
-- @flags   -
-- @phase   2
IF OBJECT_ID('maint.pm_program_part') IS NULL
BEGIN
    CREATE TABLE maint.pm_program_part (
        pm_program_part_id      UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_pm_program_part__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        pm_program_task_id      UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.pm_program_task
        item_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref inv.item
        qty                     DECIMAL(18,4)       NOT NULL,
        uom_code                VARCHAR(10)         NOT NULL,   -- ref gecko_master:lookup.uom (the item's base UoM)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_program_part__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_program_part__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_pm_program_part PRIMARY KEY CLUSTERED (pm_program_part_id),
        CONSTRAINT ck_pm_program_part__qty CHECK (qty > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_pm_program_part__item
        ON maint.pm_program_part (tenant_id, pm_program_task_id, item_id) WHERE deleted_at IS NULL;
END
GO

-- @table   maint.pm_program_labor
-- @purpose Standard labour of a PM task: trade and hours.
-- @vector  Master.PMScheduleLabor
-- @owner   Fleet Maintenance
-- @flags   -
-- @phase   2
IF OBJECT_ID('maint.pm_program_labor') IS NULL
BEGIN
    CREATE TABLE maint.pm_program_labor (
        pm_program_labor_id     UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_pm_program_labor__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        pm_program_task_id      UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.pm_program_task
        trade_code              VARCHAR(40)         NOT NULL,   -- FLEET_TRADE
        std_hours               DECIMAL(6,2)        NOT NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_program_labor__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_program_labor__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_pm_program_labor PRIMARY KEY CLUSTERED (pm_program_labor_id),
        CONSTRAINT ck_pm_program_labor__hours CHECK (std_hours > 0)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_pm_program_labor__trade
        ON maint.pm_program_labor (tenant_id, pm_program_task_id, trade_code) WHERE deleted_at IS NULL;
END
GO

-- @table   maint.pm_assignment
-- @purpose A PM schedule applied to one asset, from / to.
-- @vector  Master.PMEquipment, Equipment.ScheduleNo
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   2
IF OBJECT_ID('maint.pm_assignment') IS NULL
BEGIN
    CREATE TABLE maint.pm_assignment (
        pm_assignment_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_pm_assignment__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        pm_program_id           UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.pm_program
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile
        active_from             DATE                NOT NULL,
        active_to               DATE                NULL,
        remarks                 NVARCHAR(500)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_assignment__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_assignment__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_pm_assignment PRIMARY KEY CLUSTERED (pm_assignment_id),
        CONSTRAINT ck_pm_assignment__dates CHECK (active_to IS NULL OR active_to >= active_from)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_pm_assignment__open
        ON maint.pm_assignment (tenant_id, pm_program_id, asset_profile_id) WHERE active_to IS NULL AND deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_pm_assignment__asset
        ON maint.pm_assignment (tenant_id, asset_profile_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'pm_assignment';
END
GO

-- @table   maint.pm_task_state
-- @purpose Per assignment and task: when / at what meter it was last done, when it is next due, and the due status.
-- @vector  none — new (legacy used an exact-match trigger)
-- @owner   Fleet Maintenance
-- @flags   -
-- @phase   2
IF OBJECT_ID('maint.pm_task_state') IS NULL
BEGIN
    CREATE TABLE maint.pm_task_state (
        pm_task_state_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_pm_task_state__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        pm_assignment_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.pm_assignment
        pm_program_task_id      UNIQUEIDENTIFIER    NOT NULL,   -- ref maint.pm_program_task
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile (copied for the due list)
        last_done_at            DATE                NULL,       -- baseline or last completion
        last_done_km            DECIMAL(14,2)       NULL,       -- lifetime km at that time
        last_done_hours         DECIMAL(14,2)       NULL,
        last_work_order_id      UNIQUEIDENTIFIER    NULL,       -- ref maint.work_order (P3)
        last_done_source        VARCHAR(20)         NULL,       -- BASELINE, WORK_ORDER, ASSIGNMENT
        next_due_at             DATE                NULL,
        next_due_km             DECIMAL(14,2)       NULL,
        next_due_hours          DECIMAL(14,2)       NULL,
        current_km              DECIMAL(14,2)       NULL,       -- lifetime km when last recalculated
        current_hours           DECIMAL(14,2)       NULL,
        due_status              VARCHAR(20)         NOT NULL CONSTRAINT df_pm_task_state__status DEFAULT 'OK',   -- OK, DUE_SOON, DUE, OVERDUE
        recalculated_at         DATETIMEOFFSET(7)   NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_task_state__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_pm_task_state__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_pm_task_state PRIMARY KEY CLUSTERED (pm_task_state_id),
        CONSTRAINT ck_pm_task_state__status CHECK (due_status IN ('OK','DUE_SOON','DUE','OVERDUE')),
        CONSTRAINT ck_pm_task_state__source CHECK (last_done_source IS NULL OR last_done_source IN ('BASELINE','WORK_ORDER','ASSIGNMENT'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_pm_task_state__pair
        ON maint.pm_task_state (tenant_id, pm_assignment_id, pm_program_task_id) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_pm_task_state__due
        ON maint.pm_task_state (tenant_id, due_status, next_due_at) INCLUDE (asset_profile_id, next_due_km) WHERE deleted_at IS NULL;
END
GO

IF OBJECT_ID('asset.meter_reading') IS NULL OR OBJECT_ID('asset.meter_reading_review') IS NULL OR OBJECT_ID('asset.meter_segment') IS NULL
   OR OBJECT_ID('history.maint_pm_program') IS NULL OR OBJECT_ID('history.maint_pm_program_task') IS NULL OR OBJECT_ID('maint.pm_program_part') IS NULL
   OR OBJECT_ID('maint.pm_program_labor') IS NULL OR OBJECT_ID('history.maint_pm_assignment') IS NULL OR OBJECT_ID('maint.pm_task_state') IS NULL
    THROW 50000, '10_meter_pm: a table or its history is missing.', 1;
GO
PRINT '10_meter_pm.sql completed.';
GO
