-- ============================================================
-- GECKO FLEET — PEOPLE (P1): drivers, technicians, mobile devices
-- Script: 04_people.sql
--
-- people.driver — Fleet's own driver register (decision Q3/Q7, 2026-11-19),
--   the same pattern as asset.asset_profile:
--   * TRUCKING — linked to gecko_trucking fleet.driver; the row is a READ-ONLY
--     copy written only by the Trucking sync.
--   * FLEET    — owned here (yard operators, forklift drivers Trucking does not
--     hold).
--   PERSONAL DATA STAYS IN TRUCKING. Trucking holds licence number, national
--   id, mobile, address and bank account encrypted (AES-GCM + HMAC, PDPA). Fleet
--   copies only what a workshop and an incident need: code, name, nickname,
--   licence class and expiry, employment, employer, dates, status. No PII column
--   exists here, so gecko_fleet needs no key, no consent and no erasure job;
--   a driver anonymised in Trucking is anonymised here by the next sync.
--
-- people.technician (+ technician_skill) — workshop staff. In the legacy DMS
--   technicians were rows of Master.Driver (WorkOrderHeader.Technician1-4);
--   here they are their own master, with trades from the gecko_master
--   FLEET_TRADE code list and an optional own cost rate (else the trade rate,
--   config.labor_cost_rate).
--
-- people.device — a phone running the phase-2 driver / technician app
--   (decision Q11: tables now, app later). No endpoints in P1.
--
-- driver_source uses a FORMAT check (the list may grow), like asset_source.
-- Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   people.driver
-- @purpose One driver or equipment operator: a read-only copy of a Trucking driver (non-personal fields only) or a Fleet-owned one; what work orders, inspections, fuel and incidents name.
-- @vector  Master.Driver (drivers only; technicians are people.technician)
-- @owner   Fleet People
-- @flags   T
-- @phase   1
IF OBJECT_ID('people.driver') IS NULL
BEGIN
    CREATE TABLE people.driver (
        driver_id               UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_driver__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NULL,       -- home branch; NULL = pool driver for every branch (as in Trucking)
        driver_source           VARCHAR(20)         NOT NULL,   -- where the record lives: TRUCKING, FLEET (list in the Fleet module)
        trucking_driver_id      UNIQUEIDENTIFIER    NULL,       -- ref gecko_trucking:fleet.driver: the linked Trucking driver
        trucking_driver_code    VARCHAR(20)         NULL,       -- code of the above
        driver_code             VARCHAR(20)         NOT NULL,   -- staff / driver number shown everywhere
        full_name               NVARCHAR(200)       NOT NULL,   -- name (Trucking's placeholder once anonymised there)
        nickname                NVARCHAR(100)       NULL,       -- name used on the radio / in the yard
        user_id                 UNIQUEIDENTIFIER    NULL,       -- ref gecko_identity:iam.user: app login (phase 2 driver app)
        licence_class           VARCHAR(20)         NULL,       -- licence category, e.g. TH type 4
        licence_expiry_date     DATE                NULL,       -- current licence expiry (number and history stay in Trucking)
        employment_type         VARCHAR(20)         NOT NULL CONSTRAINT df_driver__employment DEFAULT 'EMPLOYEE',   -- EMPLOYEE, CONTRACT, SUBCON
        employer_party_id       UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:party.party: subcontractor that employs the driver
        employer_party_code     VARCHAR(25)         NULL,       -- code of the above
        hired_on                DATE                NULL,
        left_on                 DATE                NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_driver__status DEFAULT 'ACTIVE',   -- ACTIVE, LEAVE, INACTIVE
        source_status           VARCHAR(20)         NULL,       -- Trucking's status of a linked driver (AVAILABLE, LEAVE, INACTIVE; REMOVED = gone there)
        source_synced_at        DATETIMEOFFSET(7)   NULL,       -- when the Trucking copy was last refreshed
        source_version          BINARY(8)           NULL,       -- Trucking row_version of that copy
        remarks                 NVARCHAR(1000)      NULL,       -- Fleet's own notes
        legacy_ref              VARCHAR(80)         NULL,       -- legacy key, e.g. Driver:240:D0123
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_driver__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_driver__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_driver PRIMARY KEY CLUSTERED (driver_id),
        CONSTRAINT ck_driver__source CHECK (driver_source = UPPER(driver_source) COLLATE Latin1_General_100_CS_AS AND driver_source NOT LIKE '%[^A-Z0-9_]%'),
        CONSTRAINT ck_driver__link CHECK ((driver_source = 'TRUCKING' AND trucking_driver_id IS NOT NULL) OR (driver_source <> 'TRUCKING' AND trucking_driver_id IS NULL)),
        CONSTRAINT ck_driver__trucking_pair CHECK ((trucking_driver_id IS NULL AND trucking_driver_code IS NULL) OR (trucking_driver_id IS NOT NULL AND trucking_driver_code IS NOT NULL)),
        CONSTRAINT ck_driver__employer_pair CHECK ((employer_party_id IS NULL AND employer_party_code IS NULL) OR (employer_party_id IS NOT NULL AND employer_party_code IS NOT NULL)),
        CONSTRAINT ck_driver__code CHECK (driver_code = UPPER(driver_code) COLLATE Latin1_General_100_CS_AS AND LEN(driver_code) > 0),
        CONSTRAINT ck_driver__employment CHECK (employment_type IN ('EMPLOYEE','CONTRACT','SUBCON')),
        CONSTRAINT ck_driver__status CHECK (status IN ('ACTIVE','LEAVE','INACTIVE')),
        CONSTRAINT ck_driver__dates CHECK (left_on IS NULL OR hired_on IS NULL OR left_on >= hired_on)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_driver__trucking
        ON people.driver (tenant_id, trucking_driver_id) WHERE trucking_driver_id IS NOT NULL AND deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_driver__code
        ON people.driver (tenant_id, driver_source, driver_code) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_driver__branch_status
        ON people.driver (tenant_id, branch_id, status) INCLUDE (driver_code, full_name, driver_source) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'people', @table = 'driver';
END
GO

-- @table   people.technician
-- @purpose One workshop technician (own staff or a contractor's): home workshop, main trade, optional own cost rate, optional app login.
-- @vector  Master.Driver rows used as WorkOrderHeader.Technician1-4
-- @owner   Fleet People
-- @flags   T
-- @phase   1
IF OBJECT_ID('people.technician') IS NULL
BEGIN
    CREATE TABLE people.technician (
        technician_id           UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_technician__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- home workshop branch
        technician_code         VARCHAR(20)         NOT NULL,   -- staff number shown on work orders
        full_name               NVARCHAR(200)       NOT NULL,
        nickname                NVARCHAR(100)       NULL,
        user_id                 UNIQUEIDENTIFIER    NULL,       -- ref gecko_identity:iam.user: login for the phase-2 technician app / clocking
        employment_type         VARCHAR(20)         NOT NULL CONSTRAINT df_technician__employment DEFAULT 'EMPLOYEE',   -- EMPLOYEE, CONTRACTOR
        vendor_party_id         UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:party.party: the contractor's company (CONTRACTOR)
        vendor_party_code       VARCHAR(25)         NULL,       -- code of the above
        primary_trade_code      VARCHAR(40)         NOT NULL,   -- FLEET_TRADE code-list value (gecko_master), e.g. MECHANIC
        cost_per_hour           DECIMAL(18,4)       NULL,       -- own internal cost of an hour; NULL = the trade rate (config.labor_cost_rate)
        ot_cost_per_hour        DECIMAL(18,4)       NULL,       -- own overtime cost; NULL = the trade rate
        currency_code           CHAR(3)             NULL,       -- currency of the own rates (set with them)
        hired_on                DATE                NULL,
        left_on                 DATE                NULL,
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_technician__status DEFAULT 'ACTIVE',   -- ACTIVE, INACTIVE
        remarks                 NVARCHAR(1000)      NULL,
        legacy_ref              VARCHAR(80)         NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_technician__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_technician__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_technician PRIMARY KEY CLUSTERED (technician_id),
        CONSTRAINT ck_technician__code CHECK (technician_code = UPPER(technician_code) COLLATE Latin1_General_100_CS_AS AND LEN(technician_code) > 0),
        CONSTRAINT ck_technician__employment CHECK (employment_type IN ('EMPLOYEE','CONTRACTOR')),
        CONSTRAINT ck_technician__vendor_pair CHECK ((vendor_party_id IS NULL AND vendor_party_code IS NULL) OR (vendor_party_id IS NOT NULL AND vendor_party_code IS NOT NULL)),
        CONSTRAINT ck_technician__vendor CHECK (employment_type = 'CONTRACTOR' OR vendor_party_id IS NULL),
        CONSTRAINT ck_technician__trade CHECK (primary_trade_code = UPPER(primary_trade_code) COLLATE Latin1_General_100_CS_AS),
        CONSTRAINT ck_technician__rates CHECK ((cost_per_hour IS NULL OR cost_per_hour >= 0) AND (ot_cost_per_hour IS NULL OR ot_cost_per_hour >= 0)),
        CONSTRAINT ck_technician__currency CHECK ((cost_per_hour IS NULL AND ot_cost_per_hour IS NULL AND currency_code IS NULL)
            OR (currency_code IS NOT NULL AND currency_code LIKE '[A-Z][A-Z][A-Z]')),
        CONSTRAINT ck_technician__status CHECK (status IN ('ACTIVE','INACTIVE')),
        CONSTRAINT ck_technician__dates CHECK (left_on IS NULL OR hired_on IS NULL OR left_on >= hired_on)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_technician__code
        ON people.technician (tenant_id, technician_code) WHERE deleted_at IS NULL;
    -- One technician record per login.
    CREATE UNIQUE NONCLUSTERED INDEX uq_technician__user
        ON people.technician (tenant_id, user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_technician__branch_status
        ON people.technician (tenant_id, branch_id, status) INCLUDE (technician_code, full_name, primary_trade_code) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'people', @table = 'technician';
END
GO

-- @table   people.technician_skill
-- @purpose One trade a technician can work in (beyond or including the main one), with a level and an optional certificate end date; work orders match tasks to it.
-- @vector  none — new
-- @owner   Fleet People
-- @flags   T
-- @phase   1
IF OBJECT_ID('people.technician_skill') IS NULL
BEGIN
    CREATE TABLE people.technician_skill (
        technician_skill_id     UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_technician_skill__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        technician_id           UNIQUEIDENTIFIER    NOT NULL,   -- ref people.technician: whose skill
        trade_code              VARCHAR(40)         NOT NULL,   -- FLEET_TRADE code-list value (gecko_master)
        skill_level             VARCHAR(20)         NOT NULL CONSTRAINT df_technician_skill__level DEFAULT 'SKILLED',   -- TRAINEE, SKILLED, SENIOR, MASTER
        certified_until         DATE                NULL,       -- end of a certificate for this trade (e.g. A/C refrigerant handling)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_technician_skill__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_technician_skill__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_technician_skill PRIMARY KEY CLUSTERED (technician_skill_id),
        CONSTRAINT ck_technician_skill__trade CHECK (trade_code = UPPER(trade_code) COLLATE Latin1_General_100_CS_AS),
        CONSTRAINT ck_technician_skill__level CHECK (skill_level IN ('TRAINEE','SKILLED','SENIOR','MASTER'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_technician_skill__trade
        ON people.technician_skill (tenant_id, technician_id, trade_code) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'people', @table = 'technician_skill';
END
GO

-- @table   people.device
-- @purpose One phone or tablet registered to a user for the phase-2 driver / technician app: platform, app version, last contact, push target, blocked or not. Offline records from it carry its device_uid.
-- @vector  none — new
-- @owner   Fleet People
-- @flags   T
-- @phase   1
IF OBJECT_ID('people.device') IS NULL
BEGIN
    CREATE TABLE people.device (
        device_id               UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_device__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        user_id                 UNIQUEIDENTIFIER    NOT NULL,   -- ref gecko_identity:iam.user: who uses the device
        device_uid              VARCHAR(100)        NOT NULL,   -- installation id generated by the app; the device_id of every offline record it sends
        platform                VARCHAR(10)         NOT NULL,   -- ANDROID, IOS, WEB
        device_model            NVARCHAR(100)       NULL,       -- e.g. Samsung Galaxy XCover 6 Pro
        app_version             VARCHAR(20)         NULL,       -- app build last seen
        push_target             VARCHAR(400)        NULL,       -- push notification token / endpoint (rotated by the app)
        registered_at           DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_device__registered_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        last_seen_at            DATETIMEOFFSET(7)   NULL,       -- last sync from the device
        is_blocked              BIT                 NOT NULL CONSTRAINT df_device__blocked DEFAULT 0,   -- 1 = lost or stolen: its syncs are refused
        blocked_reason          NVARCHAR(200)       NULL,
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_device__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_device__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_device PRIMARY KEY CLUSTERED (device_id),
        CONSTRAINT ck_device__platform CHECK (platform IN ('ANDROID','IOS','WEB')),
        CONSTRAINT ck_device__blocked CHECK (is_blocked = 0 OR blocked_reason IS NOT NULL)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_device__uid
        ON people.device (tenant_id, device_uid) WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_device__user
        ON people.device (tenant_id, user_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'people', @table = 'device';
END
GO

EXEC dbo.usp_record_script '04_people.sql', N'people: driver (Trucking-linked copy, no PII, or Fleet-owned), technician, technician_skill, device — all temporal';
GO

PRINT '>> 04_people.sql completed.';
GO
