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
INSERT OR IGNORE INTO usage_records
  (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
VALUES
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-09-10', 16.8, 'kWh', 239, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-09-11', 18.2, 'kWh', 258, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-09-12', 19.5, 'kWh', 277, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-09-13', 20.9, 'kWh', 297, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-09-14', 22.2, 'kWh', 315, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-09-10', 112, 'gal', 65, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-09-11', 121, 'gal', 70, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-09-12', 130, 'gal', 75, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-09-13', 139, 'gal', 81, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-09-14', 112, 'gal', 65, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-09-10', 0.55, 'therms', 77, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-09-11', 0.66, 'therms', 92, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-09-12', 0.77, 'therms', 108, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-09-13', 0.88, 'therms', 123, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-09-14', 0.55, 'therms', 77, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-08-10', 18.9, 'kWh', 268, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-08-11', 20.4, 'kWh', 290, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-08-12', 21.8, 'kWh', 310, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-08-13', 23.3, 'kWh', 331, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'electricity', '2026-08-14', 24.7, 'kWh', 351, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-08-10', 121, 'gal', 70, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-08-11', 131, 'gal', 76, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-08-12', 141, 'gal', 82, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-08-13', 151, 'gal', 88, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'water', '2026-08-14', 121, 'gal', 70, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-08-10', 0.62, 'therms', 87, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-08-11', 0.74, 'therms', 104, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-08-12', 0.86, 'therms', 120, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-08-13', 0.98, 'therms', 137, 'demo_data'),
  ((SELECT id FROM households WHERE name = 'GreenMeter demo home' AND owner_user_id IS NULL LIMIT 1), 'gas', '2026-08-14', 0.62, 'therms', 87, 'demo_data');
