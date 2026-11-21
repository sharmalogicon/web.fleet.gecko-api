-- ============================================================
-- GECKO FLEET — ASSET SPECIFICATION (P1, GAP 1, owner 2026-11-19)
-- Script: 06_asset_specification.sql
--
-- The existing equipment form has a Spec tab (gross / net weight, length,
-- width, height, engine capacity, horse power, fuel capacity, payload) and a
-- licence number that nothing stored. The UI policy says the back end adapts to
-- the screens, so they get their own 1:1 table: asset.asset_specification.
--   * Fleet owns it for EVERY asset (Trucking-linked or Fleet-owned): Trucking
--     holds only tank capacity and payload; the Trucking sync copies those two
--     into an EMPTY field when it links a truck, and never overwrites a value.
--   * The form's "chassis no" is asset_profile.vin (in Thai registration books
--     the chassis number is the VIN); not repeated here.
--   * Units are fixed and metric (kg, metres, cc, hp, litres): the column name
--     says the unit, the UI labels already say them.
-- One row per asset at most (unique on asset_profile_id); no row = nothing
-- recorded yet. Temporal. Run 91_rls_policy.sql AFTER this script. Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @table   asset.asset_specification
-- @purpose The technical specification of one asset (weights, dimensions, engine, fuel tank, payload, operating licence): the equipment form's Spec tab.
-- @vector  Master.Equipment spec fields (GrossWeight, NetWeight, Length, Width, Height, EngineCapacity, HorsePower, FuelCapacity, Payload, LicenseNo)
-- @owner   Fleet Assets
-- @flags   T
-- @phase   1
IF OBJECT_ID('asset.asset_specification') IS NULL
BEGIN
    CREATE TABLE asset.asset_specification (
        asset_specification_id  UNIQUEIDENTIFIER    NOT NULL CONSTRAINT df_asset_specification__id DEFAULT NEWSEQUENTIALID(),
        tenant_id               UNIQUEIDENTIFIER    NOT NULL,
        asset_profile_id        UNIQUEIDENTIFIER    NOT NULL,   -- ref asset.asset_profile: the asset (1:1)
        gross_weight_kg         DECIMAL(12,2)       NULL,       -- gross vehicle weight (GVW)
        net_weight_kg           DECIMAL(12,2)       NULL,       -- unladen / tare weight
        length_m                DECIMAL(7,3)        NULL,       -- overall length
        width_m                 DECIMAL(7,3)        NULL,       -- overall width
        height_m                DECIMAL(7,3)        NULL,       -- overall height
        engine_capacity_cc      INT                 NULL,       -- engine displacement
        horse_power_hp          DECIMAL(7,1)        NULL,       -- rated power
        fuel_capacity_l         DECIMAL(9,2)        NULL,       -- fuel tank capacity (prefilled from Trucking's tank capacity)
        payload_kg              DECIMAL(12,2)       NULL,       -- rated payload (prefilled from Trucking's max payload)
        licence_no              VARCHAR(40)         NULL,       -- operating licence / permit number of the asset (not a driver's licence)
        created_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_asset_specification__created_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        created_by              UNIQUEIDENTIFIER    NULL,
        updated_at              DATETIMEOFFSET(7)   NOT NULL CONSTRAINT df_asset_specification__updated_at DEFAULT (SYSUTCDATETIME() AT TIME ZONE 'UTC'),
        updated_by              UNIQUEIDENTIFIER    NULL,
        deleted_at              DATETIMEOFFSET(7)   NULL,
        deleted_by              UNIQUEIDENTIFIER    NULL,
        row_version             ROWVERSION          NOT NULL,
        CONSTRAINT pk_asset_specification PRIMARY KEY CLUSTERED (asset_specification_id),
        CONSTRAINT ck_asset_specification__weights CHECK ((gross_weight_kg IS NULL OR gross_weight_kg >= 0) AND (net_weight_kg IS NULL OR net_weight_kg >= 0)
            AND (payload_kg IS NULL OR payload_kg >= 0)
            AND (gross_weight_kg IS NULL OR net_weight_kg IS NULL OR net_weight_kg <= gross_weight_kg)),
        CONSTRAINT ck_asset_specification__size CHECK ((length_m IS NULL OR length_m > 0) AND (width_m IS NULL OR width_m > 0) AND (height_m IS NULL OR height_m > 0)),
        CONSTRAINT ck_asset_specification__engine CHECK ((engine_capacity_cc IS NULL OR engine_capacity_cc > 0) AND (horse_power_hp IS NULL OR horse_power_hp > 0)
            AND (fuel_capacity_l IS NULL OR fuel_capacity_l >= 0))
    );
    CREATE UNIQUE NONCLUSTERED INDEX uq_asset_specification__asset
        ON asset.asset_specification (tenant_id, asset_profile_id) WHERE deleted_at IS NULL;
    EXEC dbo.usp_enable_temporal @schema = 'asset', @table = 'asset_specification';
END
GO

-- Guard
IF OBJECT_ID('asset.asset_specification') IS NULL OR OBJECT_ID('history.asset_asset_specification') IS NULL
    THROW 50000, '06_asset_specification: table or its history missing.', 1;
GO
PRINT '06_asset_specification.sql completed.';
GO
