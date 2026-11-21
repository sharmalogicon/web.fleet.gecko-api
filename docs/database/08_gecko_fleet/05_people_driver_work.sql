-- ============================================================
-- GECKO FLEET — PEOPLE (P1): driver work fields
-- Script: 05_people_driver_work.sql
--
-- The existing Fleet Drivers form (owner 2026-11-19: the back end adapts to the
-- screens) has four fields that are NOT personal data and that Trucking does
-- not hold, so Fleet owns them for every driver (TRUCKING-linked or FLEET):
--   * position_title       — "Driver", "Forklift operator", "Crane operator" ...
--   * cost_per_hour / ot_cost_per_hour / currency_code — the driver's internal
--     cost of an hour (the form's standard / overtime rate), e.g. for incident
--     and yard-work costing; same shape as people.technician.
--   * fuel_card_no         — the company fuel card the driver carries (P7 fuel
--     reconciliation matches card transactions to drivers by it).
-- Personal data (ID / social-security numbers, birth date, address, phones,
-- e-mail, emergency contact, licence number) is still NOT stored here: option A
-- (owner 2026-11-19) reads it from Trucking at view time.
--
-- Additive only: ALTER TABLE ... ADD on the system-versioned table (SQL Server
-- propagates new nullable columns to history.people_driver). Idempotent.
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @column people.driver.position_title    Job title shown on the driver form (Driver, Forklift operator ...)
-- @column people.driver.cost_per_hour     Internal cost of a normal hour (form: standard rate); NULL = not costed
-- @column people.driver.ot_cost_per_hour  Internal cost of an overtime hour (form: overtime rate)
-- @column people.driver.currency_code     Currency of the two rates (set with them)
-- @column people.driver.fuel_card_no      Company fuel card the driver carries (not personal data)
IF COL_LENGTH('people.driver', 'position_title') IS NULL
    ALTER TABLE people.driver ADD position_title NVARCHAR(100) NULL;
IF COL_LENGTH('people.driver', 'cost_per_hour') IS NULL
    ALTER TABLE people.driver ADD cost_per_hour DECIMAL(18,4) NULL;
IF COL_LENGTH('people.driver', 'ot_cost_per_hour') IS NULL
    ALTER TABLE people.driver ADD ot_cost_per_hour DECIMAL(18,4) NULL;
IF COL_LENGTH('people.driver', 'currency_code') IS NULL
    ALTER TABLE people.driver ADD currency_code CHAR(3) NULL;
IF COL_LENGTH('people.driver', 'fuel_card_no') IS NULL
    ALTER TABLE people.driver ADD fuel_card_no VARCHAR(40) NULL;
GO

IF OBJECT_ID('people.ck_driver__rates') IS NULL
    ALTER TABLE people.driver ADD CONSTRAINT ck_driver__rates
        CHECK ((cost_per_hour IS NULL OR cost_per_hour >= 0) AND (ot_cost_per_hour IS NULL OR ot_cost_per_hour >= 0));
IF OBJECT_ID('people.ck_driver__currency') IS NULL
    ALTER TABLE people.driver ADD CONSTRAINT ck_driver__currency
        CHECK ((cost_per_hour IS NULL AND ot_cost_per_hour IS NULL AND currency_code IS NULL)
            OR (currency_code IS NOT NULL AND currency_code LIKE '[A-Z][A-Z][A-Z]'));
IF OBJECT_ID('people.ck_driver__fuel_card') IS NULL
    ALTER TABLE people.driver ADD CONSTRAINT ck_driver__fuel_card
        CHECK (fuel_card_no IS NULL OR (LEN(fuel_card_no) > 0 AND fuel_card_no = UPPER(fuel_card_no) COLLATE Latin1_General_100_CS_AS));
GO

-- One card, one driver (P7 matches card transactions to drivers by it).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_driver__fuel_card' AND object_id = OBJECT_ID('people.driver'))
    CREATE UNIQUE NONCLUSTERED INDEX uq_driver__fuel_card
        ON people.driver (tenant_id, fuel_card_no) WHERE fuel_card_no IS NOT NULL AND deleted_at IS NULL;
GO

-- Guard
IF COL_LENGTH('people.driver', 'fuel_card_no') IS NULL OR COL_LENGTH('history.people_driver', 'fuel_card_no') IS NULL
    THROW 50000, '05_people_driver_work: columns missing on people.driver or its history.', 1;
GO
PRINT '05_people_driver_work.sql completed.';
GO
