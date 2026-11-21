-- ============================================================
-- GECKO FLEET — SERVICE TASK LIBRARY (P1)
-- Script: 07_maint_service_task.sql
--
-- maint.service_task — the library of jobs a workshop does (oil change, brake
-- relining, tyre rotation, annual inspection ...). Work requests, work orders
-- and PM programmes (P2/P3) name tasks from here. Tenant-wide (one library for
-- every workshop). Fields follow the existing Service Types screen:
--   code, description, category (FLEET_SERVICE_CATEGORY code list, gecko_master),
--   estimated duration (std_hours), advance notice in days and km, active.
-- Plus what costing and recharge need later: the usual trade, the expense GL
-- code, and the charge code a recharge line uses (gecko_master commercial).
-- Temporal. Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   maint.service_task
-- @purpose One job in the workshop's service library (oil change, brake reline ...): category, standard hours, advance notice, usual trade, GL and charge code.
-- @vector  Master.ServiceType
-- @owner   Fleet Maintenance
-- @flags   T
-- @phase   1
IF OBJECT_ID('maint.service_task') IS NULL
BEGIN
    CREATE TABLE maint.service_task (
        service_task_id         UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_service_task__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        task_code               VARCHAR(30)         NOT NULL,   -- short code shown on work orders, e.g. OIL-CHG
        description_en          NVARCHAR(200)       NOT NULL,
        description_local       NVARCHAR(200)       NULL,       -- Thai
        category_code           VARCHAR(40)         NOT NULL,   -- FLEET_SERVICE_CATEGORY code-list value (gecko_master)
        std_hours               DECIMAL(6,2)        NULL,       -- estimated duration (labour hours) — the screen's "estimation duration"
        notify_days             SMALLINT            NULL,       -- warn this many days before a PM task is due
        notify_km               INT                 NULL,       -- warn this many km before a PM task is due
        trade_code              VARCHAR(40)         NULL,       -- usual FLEET_TRADE (labour costing default)
        expense_gl_code         VARCHAR(30)         NULL,       -- GL account the cost posts to (SAP B1 export)
        charge_code_id          UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:commercial.charge_code: recharge line charge
        charge_code             VARCHAR(30)         NULL,       -- code of the above
        is_active               BIT                 NOT NULL CONSTRAINT df_service_task__is_active DEFAULT 1,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_service_task__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_service_task__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_service_task PRIMARY KEY CLUSTERED (service_task_id),
        CONSTRAINT ck_service_task__code CHECK (task_code = UPPER(task_code) COLLATE Latin1_General_100_CS_AS AND task_code NOT LIKE '%[^A-Z0-9._/-]%' AND LEN(task_code) > 0),
        CONSTRAINT ck_service_task__category CHECK (category_code = UPPER(category_code) COLLATE Latin1_General_100_CS_AS),
        CONSTRAINT ck_service_task__numbers CHECK ((std_hours IS NULL OR std_hours >= 0) AND (notify_days IS NULL OR notify_days >= 0) AND (notify_km IS NULL OR notify_km >= 0)),
        CONSTRAINT ck_service_task__charge_pair CHECK ((charge_code_id IS NULL AND charge_code IS NULL) OR (charge_code_id IS NOT NULL AND charge_code IS NOT NULL))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_service_task__code
        ON maint.service_task (tenant_id, task_code) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_service_task__category
        ON maint.service_task (tenant_id, category_code, is_active) INCLUDE (task_code, description_en) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'maint', @table = 'service_task';
END
GO

IF OBJECT_ID('history.maint_service_task') IS NULL
    THROW 50000, '07_maint_service_task: maint.service_task or its history missing.', 1;
GO
PRINT '07_maint_service_task.sql completed.';
GO
