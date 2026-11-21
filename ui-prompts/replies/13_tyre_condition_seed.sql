-- FLEET_TYRE_CONDITION code list for gecko_master (owner answer 13 Q6), same shape as FLEET_TRADE / FLEET_SERVICE_CATEGORY.
-- Codes follow what fleet tyre programs commonly record on inspection (overall grade + the usual removal findings,
-- cf. TMC RP 216 "Radial Tire Conditions Analysis" and the condition pick-lists of Fleetio / TireStamp-style systems).
-- Idempotent: safe to run again. Tenants may add their own values (allows_tenant_values = 1).
-- Not run by the UI session (the MCP connection is read-only); for the Platform API owner to add to its seed / migration.

USE gecko_master;
SET XACT_ABORT ON;
BEGIN TRAN;

MERGE lookup.code_list_category AS t
USING (SELECT 'FLEET_TYRE_CONDITION' AS category_code,
              'Condition of a fleet tyre at registration / inspection (overall grade and common damage findings)' AS description_en,
              'FLEET' AS owning_module, CAST(1 AS bit) AS allows_tenant_values, CAST(1 AS bit) AS is_active) AS s
ON t.category_code = s.category_code
WHEN MATCHED THEN UPDATE SET description_en = s.description_en, owning_module = s.owning_module,
                             allows_tenant_values = s.allows_tenant_values, is_active = s.is_active
WHEN NOT MATCHED THEN INSERT (category_code, description_en, owning_module, allows_tenant_values, legacy_vector_category, is_active)
                      VALUES (s.category_code, s.description_en, s.owning_module, s.allows_tenant_values, NULL, s.is_active);

MERGE lookup.code_list_value AS t
USING (VALUES
  ('NEW',             'New, never fitted',                                10),
  ('GOOD',            'Good - serviceable',                               20),
  ('FAIR',            'Fair - serviceable, monitor',                      30),
  ('WORN',            'Worn - near the pull-out tread depth',             40),
  ('IRREGULAR_WEAR',  'Irregular / uneven wear',                          50),
  ('CUT',             'Cut or chip in the tread',                         60),
  ('PUNCTURED',       'Puncture',                                         70),
  ('SIDEWALL_DAMAGE', 'Sidewall damage',                                  80),
  ('BULGE',           'Bulge / blister',                                  90),
  ('SEPARATION',      'Tread or ply separation',                         100),
  ('BEAD_DAMAGE',     'Bead damage',                                     110),
  ('CRACKED',         'Weather / ozone cracking',                        120),
  ('POOR',            'Poor - unserviceable, remove',                    130),
  ('SCRAP',           'Scrap - not repairable or recappable',            140)
) AS s (code, description_en, sort_order)
ON t.category_code = 'FLEET_TYRE_CONDITION' AND t.code = s.code
WHEN MATCHED THEN UPDATE SET description_en = s.description_en, sort_order = s.sort_order, is_active = 1
WHEN NOT MATCHED THEN INSERT (category_code, code, description_en, iso_code, sort_order, is_active)
                      VALUES ('FLEET_TYRE_CONDITION', s.code, s.description_en, NULL, s.sort_order, 1);

COMMIT;
