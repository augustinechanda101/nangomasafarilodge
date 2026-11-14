-- Run this once in the Supabase SQL editor.
-- Enables staff management:
--   1. department column on users (kitchen / security / outdoor / reception / management)
--   2. authenticated staff can read the employee list
--   3. GM-only create_staff() — creates the login account + profile in one call

-- 1. Department column (existing users default to reception; GM accounts to management)
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'reception';
UPDATE users SET department = 'management' WHERE role = 'gm';

-- 2. Employee list readable by any signed-in staff account
CREATE POLICY "authenticated read users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Add staff (GM only): creates the auth login + the profile row
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_staff(
  p_name       TEXT,
  p_email      TEXT,
  p_password   TEXT,
  p_role       TEXT,
  p_department TEXT DEFAULT NULL
) RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_id  UUID;
  v_dept TEXT;
BEGIN
  -- Only management accounts may add staff
  IF COALESCE((SELECT role FROM users WHERE id = auth.uid()), '') <> 'gm' THEN
    RETURN json_build_object('error', 'Only management can add staff');
  END IF;

  IF p_role NOT IN ('staff','reception','gm') THEN
    RETURN json_build_object('error', 'Invalid role');
  END IF;
  IF length(p_password) < 6 THEN
    RETURN json_build_object('error', 'Password must be at least 6 characters');
  END IF;

  v_dept := COALESCE(p_department, CASE p_role WHEN 'gm' THEN 'management' ELSE p_role END);

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email)) THEN
    RETURN json_build_object('error', 'An account with that email already exists');
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    lower(p_email), crypt(p_password, gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('name', p_name, 'role', p_role)::jsonb,
    now(), now()
  )
  RETURNING id INTO v_id;

  INSERT INTO users (id, name, email, role, status, department)
  VALUES (v_id, p_name, lower(p_email), p_role, 'approved', v_dept);

  RETURN json_build_object('id', v_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION create_staff(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
