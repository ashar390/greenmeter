INSERT INTO households (name, address, owner_user_id)
SELECT 'GreenMeter demo home', '1842 East Lemon Street', NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM households
  WHERE name = 'GreenMeter demo home'
    AND address = '1842 East Lemon Street'
    AND owner_user_id IS NULL
);

INSERT OR IGNORE INTO usage_records
  (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
SELECT id, 'electricity', '2026-09-18', 18.4, 'kWh', 261, 'demo_data'
FROM households
WHERE name = 'GreenMeter demo home'
  AND address = '1842 East Lemon Street'
  AND owner_user_id IS NULL;

INSERT OR IGNORE INTO usage_records
  (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
SELECT id, 'electricity', '2026-09-17', 21.2, 'kWh', 301, 'demo_data'
FROM households
WHERE name = 'GreenMeter demo home'
  AND address = '1842 East Lemon Street'
  AND owner_user_id IS NULL;

INSERT OR IGNORE INTO usage_records
  (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
SELECT id, 'gas', '2026-09-16', 0.8, 'therms', 112, 'demo_data'
FROM households
WHERE name = 'GreenMeter demo home'
  AND address = '1842 East Lemon Street'
  AND owner_user_id IS NULL;

INSERT OR IGNORE INTO usage_records
  (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
SELECT id, 'water', '2026-09-15', 126, 'gal', 74, 'demo_data'
FROM households
WHERE name = 'GreenMeter demo home'
  AND address = '1842 East Lemon Street'
  AND owner_user_id IS NULL;

INSERT OR IGNORE INTO usage_records
  (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
SELECT id, 'electricity', '2026-09-14', 16.7, 'kWh', 237, 'demo_data'
FROM households
WHERE name = 'GreenMeter demo home'
  AND address = '1842 East Lemon Street'
  AND owner_user_id IS NULL;
