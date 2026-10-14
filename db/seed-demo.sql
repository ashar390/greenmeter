INSERT INTO households (name, address, owner_user_id)
SELECT 'GreenMeter demo home', '1842 East Lemon Street', NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM households
  WHERE name = 'GreenMeter demo home'
    AND address = '1842 East Lemon Street'
    AND owner_user_id IS NULL
);

-- Two representative months make the public dashboard, charts, and
-- period-over-period comparisons useful without mixing demo rows with user data.
WITH RECURSIVE
  demo_days(day) AS (
    VALUES (5)
    UNION ALL
    SELECT day + 1 FROM demo_days WHERE day < 14
  ),
  demo_household(id) AS (
    SELECT id
    FROM households
    WHERE name = 'GreenMeter demo home'
      AND address = '1842 East Lemon Street'
      AND owner_user_id IS NULL
    LIMIT 1
  ),
  demo_records(utility_type, reading_date, amount, unit, cost_cents) AS (
    SELECT 'electricity', printf('2026-09-%02d', day),
      round(16.8 + (day % 5) * 1.35, 1), 'kWh',
      CAST(round((16.8 + (day % 5) * 1.35) * 14.2) AS INTEGER)
    FROM demo_days
    UNION ALL
    SELECT 'water', printf('2026-09-%02d', day),
      112 + (day % 4) * 9, 'gal',
      CAST(round((112 + (day % 4) * 9) * 0.58) AS INTEGER)
    FROM demo_days
    UNION ALL
    SELECT 'gas', printf('2026-09-%02d', day),
      round(0.55 + (day % 4) * 0.11, 2), 'therms',
      CAST(round((0.55 + (day % 4) * 0.11) * 140) AS INTEGER)
    FROM demo_days
    UNION ALL
    SELECT 'electricity', printf('2026-08-%02d', day),
      round(18.9 + (day % 5) * 1.45, 1), 'kWh',
      CAST(round((18.9 + (day % 5) * 1.45) * 14.2) AS INTEGER)
    FROM demo_days
    UNION ALL
    SELECT 'water', printf('2026-08-%02d', day),
      121 + (day % 4) * 10, 'gal',
      CAST(round((121 + (day % 4) * 10) * 0.58) AS INTEGER)
    FROM demo_days
    UNION ALL
    SELECT 'gas', printf('2026-08-%02d', day),
      round(0.62 + (day % 4) * 0.12, 2), 'therms',
      CAST(round((0.62 + (day % 4) * 0.12) * 140) AS INTEGER)
    FROM demo_days
  )
INSERT OR IGNORE INTO usage_records
  (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
SELECT demo_household.id, demo_records.utility_type, demo_records.reading_date,
  demo_records.amount, demo_records.unit, demo_records.cost_cents, 'demo_data'
FROM demo_household
CROSS JOIN demo_records;
