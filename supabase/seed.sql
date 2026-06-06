-- ============================================================
-- PANACEA — Seed Data
-- Run AFTER 001_initial_schema.sql
-- Apply with: supabase db seed  OR  paste into SQL editor
-- ============================================================

-- ── Missions ─────────────────────────────────────────────────────────────────
INSERT INTO public.missions (title, description, icon, xp_reward, is_active, tag) VALUES
  ('Wash Hands',        'Wash hands with soap for at least 20 seconds, especially after contact with shared surfaces.',   'wash',          50,  TRUE, 'HYGIENE'),
  ('Drink Water',       'Consume at least 2 litres of clean water today to maintain optimal hydration and immunity.',      'water_drop',    50,  TRUE, 'NUTRITION'),
  ('Wear a Mask',       'Wear a well-fitted mask in any crowded indoor space to reduce aerosol transmission risk.',        'masks',         50,  TRUE, 'PREVENTION'),
  ('Log Symptoms',      'Complete one AI symptom check in the AI Guidance module and save the results to your health log.','monitor_heart', 100, TRUE, 'MONITORING'),
  ('Ventilate Space',   'Open windows or doors for at least 15 minutes to improve indoor air quality.',                    'air',           50,  TRUE, 'ENVIRONMENT'),
  ('Take Temperature',  'Measure your body temperature and note any reading above 37.5°C in your health log.',             'thermostat',    100, TRUE, 'MONITORING')
ON CONFLICT DO NOTHING;

-- ── Pathologies ───────────────────────────────────────────────────────────────
INSERT INTO public.pathologies (name, description, color, affected_zones, symptom_clusters) VALUES
  (
    'Malaria',
    'A life-threatening disease caused by Plasmodium parasites transmitted through Anopheles mosquito bites. Common in sub-Saharan Africa.',
    '#986801',
    '["head","abdomen","legs"]'::jsonb,
    '["fever","chills","headache","fatigue","sweating","nausea"]'::jsonb
  ),
  (
    'Influenza',
    'A contagious respiratory illness caused by influenza viruses. Spreads via respiratory droplets and contaminated surfaces.',
    '#ba1a1a',
    '["head","chest","throat"]'::jsonb,
    '["fever","cough","headache","fatigue","sore throat","body aches"]'::jsonb
  ),
  (
    'Dengue',
    'A mosquito-borne viral infection causing severe flu-like illness. Transmitted by Aedes mosquitoes in tropical regions.',
    '#c85e17',
    '["head","abdomen","joints","skin"]'::jsonb,
    '["fever","headache","rash","joint pain","nausea","eye pain"]'::jsonb
  ),
  (
    'Tuberculosis',
    'An infectious airborne disease caused by Mycobacterium tuberculosis, primarily affecting the lungs.',
    '#5e5e5e',
    '["chest","throat"]'::jsonb,
    '["cough","fatigue","night sweats","weight loss","fever","chest pain"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- ── Risk Events ───────────────────────────────────────────────────────────────
INSERT INTO public.risk_events (level, description, temp_celsius, humidity_pct, air_quality, aqi, location, recorded_at) VALUES
  (
    'MEDIUM',
    'Moderate viral activity detected in the Nairobi metro area. Elevated mosquito index following recent rainfall. Take precautions in crowded spaces.',
    28.4, 74.2, 'Moderate', 'MODERATE', 'Nairobi, Kenya',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'HIGH',
    'Increased dengue transmission risk in Upper Hill and Kilimani districts. Avoid stagnant water and use mosquito repellent.',
    31.1, 81.0, 'Poor', 'UNHEALTHY', 'Nairobi, Kenya',
    NOW() - INTERVAL '6 hours'
  ),
  (
    'LOW',
    'Disease transmission risk remains low across monitored zones. Continue routine prevention protocols.',
    24.8, 62.5, 'Good', 'GOOD', 'Nairobi, Kenya',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT DO NOTHING;

-- ── Heatmap Reports ───────────────────────────────────────────────────────────
INSERT INTO public.heatmap_reports (disease_tag, intensity, lat, lng, neighborhood, trend, reported_at) VALUES
  ('MALARIA',  0.85, -1.2850, 36.8200, 'Upper Hill District', 'Rising +12%',  NOW() - INTERVAL '30 minutes'),
  ('MALARIA',  0.62, -1.2634, 36.7943, 'Westlands Core',      'Stable',       NOW() - INTERVAL '2 hours'),
  ('DENGUE',   0.45, -1.3032, 36.8123, 'Kilimani Sector',     'Rising +4%',   NOW() - INTERVAL '4 hours'),
  ('DENGUE',   0.70, -1.2100, 36.8850, 'Eastlands Central',   'Rising +8%',   NOW() - INTERVAL '6 hours'),
  ('TB',       0.30, -1.3200, 36.7200, 'Karen Enclave',       'Declining',    NOW() - INTERVAL '12 hours'),
  ('TB',       0.50, -1.2800, 36.7600, 'South B',             'Stable',       NOW() - INTERVAL '1 day'),
  ('INFLUENZA',0.55, -1.2450, 36.8600, 'Nairobi CBD',         'Rising +6%',   NOW() - INTERVAL '3 hours'),
  ('INFLUENZA',0.40, -1.2700, 36.8100, 'Parklands',           'Stable',       NOW() - INTERVAL '8 hours')
ON CONFLICT DO NOTHING;
