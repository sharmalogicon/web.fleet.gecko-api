-- ============================================================
-- GECKO TRUCKING — driver personal data: the remaining fields (owner 2026-11-19)
-- Script: 04_gecko_trucking/40_driver_personal_extra.sql   (written by the Fleet
-- backend session; runs through FLEET_RUN on gecko_trucking)
--
-- Decision (owner 2026-11-19, Fleet GAP 2 option A): a driver's personal data
-- lives ONLY in Trucking, encrypted; Fleet reads it at view time and never
-- stores it. fleet.driver already holds licence no, national id, mobile, address
-- and bank account (*_enc). The Fleet driver form also shows birth date,
-- social-security number, phone, fax, e-mail and an emergency contact, which
-- nothing held. They go here, in ONE encrypted column (application AES-256-GCM,
-- key version in pii_key_version, the same as the other *_enc columns): nobody
-- searches by them, so no hash columns are needed.
--
-- personal_extra_enc = encrypted UTF-8 JSON:
--   { "birthDate": "1985-04-02", "socialSecurityNo": "...", "phone": "...",
--     "fax": "...", "email": "...", "emergencyContactName": "...",
--     "emergencyContactPhone": "...", "emergencyContactRelation": "..." }
--
-- Additive only on an existing database: one NULL column (SQL Server adds it to
-- history.fleet_driver too) + one CHECK. Safe on the live Azure database.
-- Idempotent.
-- ============================================================

USE gecko_trucking;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- @column fleet.driver.personal_extra_enc  Birth date, social-security no, phone, fax, e-mail, emergency contact: one encrypted JSON (AES-256-GCM, pii_key_version)
IF COL_LENGTH('fleet.driver', 'personal_extra_enc') IS NULL
    ALTER TABLE fleet.driver ADD personal_extra_enc VARBINARY(4000) NULL;
GO

IF OBJECT_ID('fleet.ck_driver__pii_key_extra') IS NULL
    ALTER TABLE fleet.driver ADD CONSTRAINT ck_driver__pii_key_extra
        CHECK (pii_key_version IS NOT NULL OR personal_extra_enc IS NULL);
GO

-- Guard
IF COL_LENGTH('fleet.driver', 'personal_extra_enc') IS NULL OR COL_LENGTH('history.fleet_driver', 'personal_extra_enc') IS NULL
    THROW 50000, '40_driver_personal_extra: personal_extra_enc missing on fleet.driver or history.fleet_driver.', 1;
GO
PRINT '40_driver_personal_extra.sql completed.';
GO
