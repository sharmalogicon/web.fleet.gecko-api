-- ============================================================
-- GECKO FLEET — TYRE CONDITION FROM THE CODE LIST (Fleet backend item #1)
-- Script: 22_tyre_condition_code.sql
--
--   tyre.tyre.condition_code, tyre.tyre_event.condition_code   VARCHAR(40) NULL
--     The tyre's condition is now a FLEET_TYRE_CONDITION code (gecko_master 55; owner answer 13 Q6). The old
--     `condition` columns are VARCHAR(10) with ck_tyre__condition IN ('GOOD','FAIR','POOR'), and CHECKs never change,
--     so the code lives in a new column. The API reads and writes condition_code; it still copies the value into
--     `condition` when it is GOOD / FAIR / POOR (old readers keep working) and leaves it NULL otherwise.
--     The code is validated against the list by the API (the list is in another database); the CHECK here only
--     keeps it an upper-case code.
--   Existing rows: condition_code is filled from condition.
-- Additive. Idempotent. No RLS change (same tables).
-- ============================================================

USE gecko_fleet;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('tyre.tyre', 'condition_code') IS NULL
    ALTER TABLE tyre.tyre ADD condition_code VARCHAR(40) NULL;   -- system-versioned: the history table gets the column too
GO
IF COL_LENGTH('tyre.tyre_event', 'condition_code') IS NULL
    ALTER TABLE tyre.tyre_event ADD condition_code VARCHAR(40) NULL;
GO

IF OBJECT_ID('tyre.ck_tyre__condition_code') IS NULL
    ALTER TABLE tyre.tyre ADD CONSTRAINT ck_tyre__condition_code
        CHECK (condition_code IS NULL OR (condition_code = UPPER(condition_code) COLLATE Latin1_General_100_CS_AS AND condition_code NOT LIKE '%[^A-Z0-9_]%'));
GO
IF OBJECT_ID('tyre.ck_tyre_event__condition_code') IS NULL
    ALTER TABLE tyre.tyre_event ADD CONSTRAINT ck_tyre_event__condition_code
        CHECK (condition_code IS NULL OR (condition_code = UPPER(condition_code) COLLATE Latin1_General_100_CS_AS AND condition_code NOT LIKE '%[^A-Z0-9_]%'));
GO

-- Back-fill. tyre_event is append-only (UPDATE denied to the app logins); this runs as sysadmin, once.
UPDATE tyre.tyre SET condition_code = condition WHERE condition IS NOT NULL AND condition_code IS NULL;
UPDATE tyre.tyre_event SET condition_code = condition WHERE condition IS NOT NULL AND condition_code IS NULL;
GO

EXEC dbo.usp_record_script '22_tyre_condition_code.sql', N'Fleet #1: tyre.tyre / tyre_event.condition_code (FLEET_TYRE_CONDITION code; old condition column kept)';
GO

IF COL_LENGTH('tyre.tyre', 'condition_code') IS NULL OR COL_LENGTH('tyre.tyre_event', 'condition_code') IS NULL
    THROW 50000, '22_tyre_condition_code: a column is missing.', 1;
GO
PRINT '22_tyre_condition_code.sql completed.';
GO
