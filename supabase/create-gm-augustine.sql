-- Run this ONCE in the Supabase SQL editor.
-- Creates the management account for Augustine with the default password.
-- (The SQL editor runs with admin rights, so it bypasses the GM-only check
--  inside create_staff — that check only applies to the app's Add form.)

WITH new_user AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'augustinechanda101@gmail.com', crypt('nangoma2026', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Augustine Chanda","role":"gm"}'::jsonb,
    now(), now()
  )
  RETURNING id
)
INSERT INTO users (id, name, email, role, status, department)
SELECT id, 'Augustine Chanda', 'augustinechanda101@gmail.com', 'gm', 'approved', 'management'
FROM new_user;

INSERT INTO activity_log (action)
VALUES ('staff added: Augustine Chanda (management) — via SQL setup');
