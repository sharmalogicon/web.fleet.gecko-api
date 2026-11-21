-- ============================================================
-- GECKO FLEET — ASSET REGISTER (P1)
-- Script: 03_asset.sql
--
-- Fleet's own register of every maintainable asset (decision Q3/Q7, 2026-11-19:
-- Fleet is sold as its own module, so it keeps its own register):
--   * TRUCKING_VEHICLE / TRUCKING_CHASSIS — linked to gecko_trucking
--     fleet.vehicle / fleet.chassis. The identity columns (code, registration,
--     make, model, VIN, branch, ownership) are a READ-ONLY COPY written only by
--     the Trucking sync; Fleet owns the maintenance columns (class, meter type,
--     axle layout, workshop, cost centre, TCO, warranty).
--   * FLEET — owned here end to end (equipment Trucking does not hold:
--     reach stackers, gensets, workshop tools ...). SCT's forklifts are already
--     Trucking YARD vehicles, so they arrive linked.
--
-- Plus the axle layouts the tyre map is drawn from (P5 fits tyres to them).
-- A layout stores AXLES (kind, single/dual, tyre size) and a spare count; tyre
-- position codes are DERIVED by the convention <axle><side>[O|I] / SPn
-- (1L, 1R, 2LO, 2LI, 2RI, 2RO, SP1) — the same convention the UI's axle map
-- uses. Storing the positions as rows as well would let the two disagree.
-- (Design doc 02 listed asset.axle_layout_position; replaced by axle_layout_axle.)
--
-- Meters (meter_reading, meter_segment, asset_meter_current) come with P2.
--
-- WHY asset_source AND asset_class USE A FORMAT CHECK
-- Both lists grow (a TOS equipment source; new equipment classes) and a CHECK
-- may never change once deployed (additive-only rule). The Fleet module holds
-- the lists (FleetAssetCatalogue); the database checks the shape only.
--
-- Codes: asset_code is unique per SOURCE, not per tenant. In SCT's data three
-- truck codes equal a chassis number (gecko_trucking, 2026-11-19), so a
-- tenant-wide unique code would refuse real assets. A FLEET-owned code may not
-- reuse any linked code — the Fleet module checks that.
--
-- Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   asset.axle_layout
-- @purpose A wheel arrangement assets are drawn and fitted with (e.g. 6x4 tractor, tri-axle trailer): body style, spare count; its axles are in asset.axle_layout_axle.
-- @vector  Fleet.TireChangeHeader.Axles (implicit: a number on each tyre change, no layout master)
-- @owner   Fleet Assets
-- @flags   T
-- @phase   1
IF OBJECT_ID('asset.axle_layout') IS NULL
BEGIN
    CREATE TABLE asset.axle_layout (
        axle_layout_id          UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_axle_layout__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        layout_code             VARCHAR(30)         NOT NULL,   -- short code, e.g. TRACTOR_6X4, TRAILER_3AXLE
        name_en                 NVARCHAR(100)       NOT NULL,   -- shown in English
        name_local              NVARCHAR(100)       NULL,       -- shown in the local language (Thai)
        body_style              VARCHAR(20)         NOT NULL,   -- how the map draws it: RIGID, TRACTOR, TRAILER, EQUIPMENT
        spare_count             TINYINT             NOT NULL CONSTRAINT df_axle_layout__spares DEFAULT 0,   -- spare wheels carried: positions SP1..SPn
        is_active               BIT                 NOT NULL CONSTRAINT df_axle_layout__is_active DEFAULT 1,   -- 0 = no longer offered for new assets
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_axle_layout__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_axle_layout__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_axle_layout PRIMARY KEY CLUSTERED (axle_layout_id),
        CONSTRAINT ck_axle_layout__code CHECK (layout_code = UPPER(layout_code) COLLATE Latin1_General_100_CS_AS AND layout_code NOT LIKE '%[^A-Z0-9_]%'),
        CONSTRAINT ck_axle_layout__body CHECK (body_style IN ('RIGID','TRACTOR','TRAILER','EQUIPMENT')),
        CONSTRAINT ck_axle_layout__spares CHECK (spare_count BETWEEN 0 AND 4)
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_axle_layout__code
        ON asset.axle_layout (tenant_id, layout_code) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'asset', @table = 'axle_layout';
END
GO

-- @table   asset.axle_layout_axle
-- @purpose One axle of an axle layout, front to back: steer / drive / trailer / lift, single or dual tyres, and the tyre size fitted there.
-- @vector  none — new
-- @owner   Fleet Assets
-- @flags   T
-- @phase   1
IF OBJECT_ID('asset.axle_layout_axle') IS NULL
BEGIN
    CREATE TABLE asset.axle_layout_axle (
        axle_layout_axle_id     UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_axle_layout_axle__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        axle_layout_id          UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.axle_layout: the layout this axle belongs to
        axle_no                 TINYINT             NOT NULL,   -- 1 = front axle; positions on it are <axle_no>L / R (single) or LO, LI, RI, RO (dual)
        axle_kind               VARCHAR(10)         NOT NULL,   -- STEER, DRIVE, TRAILER, LIFT
        is_dual                 BIT                 NOT NULL,   -- 1 = two tyres per side
        tyre_size_code          VARCHAR(30)         NULL,       -- tyre size normally fitted, e.g. 295/80R22.5 (TYRE_SIZE code list from P5)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_axle_layout_axle__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_axle_layout_axle__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_axle_layout_axle PRIMARY KEY CLUSTERED (axle_layout_axle_id),
        CONSTRAINT ck_axle_layout_axle__no CHECK (axle_no BETWEEN 1 AND 9),
        CONSTRAINT ck_axle_layout_axle__kind CHECK (axle_kind IN ('STEER','DRIVE','TRAILER','LIFT'))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_axle_layout_axle__no
        ON asset.axle_layout_axle (tenant_id, axle_layout_id, axle_no) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'asset', @table = 'axle_layout_axle';
END
GO

-- @table   asset.asset_profile
-- @purpose One maintainable asset (truck, chassis, forklift, reach stacker, genset, van, tool): its identity (owned here, or a read-only copy of Trucking's vehicle / chassis) and what maintenance needs (class, meter, axle layout, workshop, cost centre, TCO, warranty).
-- @vector  Master.Equipment + EquipmentDetail + EquipmentSpecification
-- @owner   Fleet Assets
-- @flags   T
-- @phase   1
IF OBJECT_ID('asset.asset_profile') IS NULL
BEGIN
    CREATE TABLE asset.asset_profile (
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_asset_profile__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        branch_id               UNIQUEIDENTIFIER    NOT NULL,   -- home branch (a copy of Trucking's for linked assets)
        asset_source            VARCHAR(20)         NOT NULL,   -- where the identity lives: TRUCKING_VEHICLE, TRUCKING_CHASSIS, FLEET (list in the Fleet module)
        vehicle_id              UNIQUEIDENTIFIER    NULL,       -- ref gecko_trucking:fleet.vehicle: the linked truck
        vehicle_code            VARCHAR(20)         NULL,       -- code of the above
        chassis_id              UNIQUEIDENTIFIER    NULL,       -- ref gecko_trucking:fleet.chassis: the linked chassis
        chassis_code            VARCHAR(20)         NULL,       -- code (chassis no) of the above
        asset_code              VARCHAR(30)         NOT NULL,   -- fleet number shown everywhere: Trucking's code for linked assets, own code for FLEET
        asset_name              NVARCHAR(200)       NULL,       -- free description, e.g. Kalmar DRF450 reach stacker
        asset_class             VARCHAR(30)         NOT NULL,   -- maintenance class: PRIME_MOVER, RIGID_TRUCK, TRAILER_CHASSIS, FORKLIFT ... (list in the Fleet module)
        asset_category_code     VARCHAR(40)         NULL,       -- FLEET_ASSET_CATEGORY code-list value (gecko_master), the tenant's own grouping
        registration_no         NVARCHAR(80)        NULL,       -- licence plate (Thai letters allowed)
        make_code               VARCHAR(40)         NULL,       -- manufacturer, e.g. VOLVO, SCANIA, KALMAR
        model_name              NVARCHAR(100)       NULL,       -- model, e.g. FH 440
        year_built              SMALLINT            NULL,       -- year of manufacture
        vin                     VARCHAR(40)         NULL,       -- VIN for vehicles, manufacturer serial number for equipment
        engine_no               VARCHAR(40)         NULL,       -- engine number
        source_type_code        VARCHAR(40)         NULL,       -- Trucking's vehicle type code, or chassis type + size (e.g. SKELETAL-40)
        fuel_type               VARCHAR(20)         NULL,       -- DIESEL, CNG, LNG, ELECTRIC, HYBRID, PETROL, LPG, NONE
        ownership_type          VARCHAR(20)         NOT NULL CONSTRAINT df_asset_profile__ownership DEFAULT 'OWN',   -- OWN, LEASED, SUBCON, CUSTOMER
        owner_party_id          UNIQUEIDENTIFIER    NULL,       -- ref gecko_master:party.party: lessor, subcontractor or customer that owns it (default recharge bill-to)
        owner_party_code        VARCHAR(25)         NULL,       -- code of the above
        source_status           VARCHAR(20)         NULL,       -- Trucking's status of a linked asset (AVAILABLE, UNDER_REPAIR, OOS, INACTIVE ...), read-only
        source_synced_at        DATETIMEOFFSET(7)   NULL,       -- when the Trucking copy was last refreshed
        source_version          BINARY(8)           NULL,       -- Trucking row_version of that copy: an older event never overwrites a newer copy
        meter_type              VARCHAR(10)         NOT NULL,   -- what the asset is measured by: KM, HOUR, KM_HOUR, NONE
        axle_layout_id          UNIQUEIDENTIFIER    NULL,       -- ref asset.axle_layout: wheel arrangement for the tyre map
        default_workshop_branch_id UNIQUEIDENTIFIER NULL,       -- ref gecko_identity:tenant.branch: where it is normally serviced
        cost_center_code        VARCHAR(30)         NULL,       -- cost centre for the GL / SAP B1 export
        erp_asset_code          VARCHAR(50)         NULL,       -- SAP B1 fixed-asset code (P10)
        in_service_date         DATE                NULL,       -- first day in service
        acquisition_cost        DECIMAL(18,4)       NULL,       -- purchase price, for TCO
        currency_code           CHAR(3)             NULL,       -- currency of acquisition_cost and residual_value
        residual_value          DECIMAL(18,4)       NULL,       -- expected value at end of life, for TCO
        expected_life_km        DECIMAL(12,2)       NULL,       -- planned life in km
        expected_life_months    SMALLINT            NULL,       -- planned life in months
        warranty_until_date     DATE                NULL,       -- vehicle warranty end date
        warranty_until_km       DECIMAL(12,2)       NULL,       -- vehicle warranty end km
        status                  VARCHAR(20)         NOT NULL CONSTRAINT df_asset_profile__status DEFAULT 'ACTIVE',   -- ACTIVE, INACTIVE (retired in Trucking or switched off), DISPOSED (sold / scrapped)
        disposed_date           DATE                NULL,       -- the day it left the fleet (DISPOSED)
        remarks                 NVARCHAR(1000)      NULL,       -- free notes
        legacy_ref              VARCHAR(80)         NULL,       -- legacy key, e.g. Equipment:240:SCT064
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_asset_profile__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_asset_profile__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_asset_profile PRIMARY KEY CLUSTERED (asset_profile_id),
        -- Format only (see header): upper case, letters, digits and underscore.
        CONSTRAINT ck_asset_profile__source CHECK (asset_source = UPPER(asset_source) COLLATE Latin1_General_100_CS_AS AND asset_source NOT LIKE '%[^A-Z0-9_]%'),
        CONSTRAINT ck_asset_profile__class CHECK (asset_class = UPPER(asset_class) COLLATE Latin1_General_100_CS_AS AND asset_class NOT LIKE '%[^A-Z0-9_]%'),
        -- A linked truck carries exactly its vehicle pair, a linked chassis exactly its chassis pair, anything else neither.
        CONSTRAINT ck_asset_profile__link CHECK (
               (asset_source = 'TRUCKING_VEHICLE' AND vehicle_id IS NOT NULL AND chassis_id IS NULL)
            OR (asset_source = 'TRUCKING_CHASSIS' AND chassis_id IS NOT NULL AND vehicle_id IS NULL)
            OR (asset_source NOT IN ('TRUCKING_VEHICLE','TRUCKING_CHASSIS') AND vehicle_id IS NULL AND chassis_id IS NULL)),
        CONSTRAINT ck_asset_profile__vehicle_pair CHECK ((vehicle_id IS NULL AND vehicle_code IS NULL) OR (vehicle_id IS NOT NULL AND vehicle_code IS NOT NULL)),
        CONSTRAINT ck_asset_profile__chassis_pair CHECK ((chassis_id IS NULL AND chassis_code IS NULL) OR (chassis_id IS NOT NULL AND chassis_code IS NOT NULL)),
        CONSTRAINT ck_asset_profile__owner_pair CHECK ((owner_party_id IS NULL AND owner_party_code IS NULL) OR (owner_party_id IS NOT NULL AND owner_party_code IS NOT NULL)),
        CONSTRAINT ck_asset_profile__code CHECK (asset_code = UPPER(asset_code) COLLATE Latin1_General_100_CS_AS AND LEN(asset_code) > 0),
        CONSTRAINT ck_asset_profile__ownership CHECK (ownership_type IN ('OWN','LEASED','SUBCON','CUSTOMER')),
        CONSTRAINT ck_asset_profile__meter CHECK (meter_type IN ('KM','HOUR','KM_HOUR','NONE')),
        CONSTRAINT ck_asset_profile__status CHECK (status IN ('ACTIVE','INACTIVE','DISPOSED')),
        CONSTRAINT ck_asset_profile__disposed CHECK (status <> 'DISPOSED' OR disposed_date IS NOT NULL),
        CONSTRAINT ck_asset_profile__currency CHECK (currency_code IS NULL OR currency_code LIKE '[A-Z][A-Z][A-Z]'),
        CONSTRAINT ck_asset_profile__money_currency CHECK ((acquisition_cost IS NULL AND residual_value IS NULL) OR currency_code IS NOT NULL),
        CONSTRAINT ck_asset_profile__amounts CHECK ((acquisition_cost IS NULL OR acquisition_cost >= 0) AND (residual_value IS NULL OR residual_value >= 0)
            AND (expected_life_km IS NULL OR expected_life_km > 0) AND (expected_life_months IS NULL OR expected_life_months > 0)
            AND (warranty_until_km IS NULL OR warranty_until_km >= 0)),
        CONSTRAINT ck_asset_profile__year CHECK (year_built IS NULL OR year_built BETWEEN 1950 AND 2100)
    );
    -- One Fleet asset per Trucking vehicle / chassis.
    CREATE UNIQUE NONCLUSTERED INDEX uq_asset_profile__vehicle
        ON asset.asset_profile (tenant_id, vehicle_id) WHERE vehicle_id IS NOT NULL AND deleted_at IS NULL;
    CREATE UNIQUE NONCLUSTERED INDEX uq_asset_profile__chassis
        ON asset.asset_profile (tenant_id, chassis_id) WHERE chassis_id IS NOT NULL AND deleted_at IS NULL;
    -- Unique per source (see header: SCT has truck codes equal to chassis numbers).
    CREATE UNIQUE NONCLUSTERED INDEX uq_asset_profile__code
        ON asset.asset_profile (tenant_id, asset_source, asset_code) WHERE deleted_at IS NULL;
    -- The register list: by branch and status, with what the list shows.
    CREATE NONCLUSTERED INDEX ix_asset_profile__branch_status
        ON asset.asset_profile (tenant_id, branch_id, status)
        INCLUDE (asset_code, asset_source, asset_class, registration_no, meter_type)
        WHERE deleted_at IS NULL;
    CREATE NONCLUSTERED INDEX ix_asset_profile__registration
        ON asset.asset_profile (tenant_id, registration_no) WHERE deleted_at IS NULL AND registration_no IS NOT NULL;
    EXEC dbo.usp_enable_temporal @schema = 'asset', @table = 'asset_profile';
END
GO

EXEC dbo.usp_record_script '03_asset.sql', N'asset: asset_profile (Fleet register, Trucking-linked or owned), axle_layout, axle_layout_axle — all temporal';
GO

PRINT '>> 03_asset.sql completed.';
GO
