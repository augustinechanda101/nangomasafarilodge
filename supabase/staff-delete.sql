-- Run this once in the Supabase SQL editor.
-- Lets management permanently delete a staff member:
-- removes their login account and profile. Irreversible.
-- GUARD: management accounts cannot be deleted from the app —
-- they are managed by the owner via the SQL editor / dashboard only.

CREATE OR REPLACE FUNCTION delete_staff(
  p_id UUID
) RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_target      TEXT;
  v_target_role TEXT;
  v_role        TEXT;
  v_caller      TEXT;
BEGIN
  -- Only management accounts may delete staff
  SELECT role, name INTO v_role, v_caller FROM users WHERE id = auth.uid();
  IF COALESCE(v_role, '') <> 'gm' THEN
    RETURN json_build_object('error', 'Only management can delete staff');
  END IF;

  -- You cannot delete your own account
  IF p_id = auth.uid() THEN
    RETURN json_build_object('error', 'You cannot delete your own account');
  END IF;

  SELECT name, role INTO v_target, v_target_role FROM users WHERE id = p_id;
  IF v_target IS NULL THEN
    RETURN json_build_object('error', 'Staff member not found');
  END IF;

  -- Guard: management accounts are the owner's to manage, not the app's
  IF v_target_role = 'gm' THEN
    RETURN json_build_object('error', 'Management accounts can only be deleted by the owner (SQL editor / dashboard)');
  END IF;

  -- The profile row cascades with the auth account
  DELETE FROM auth.users WHERE id = p_id;

  INSERT INTO activity_log (user_id, action)
  VALUES (auth.uid(), 'staff deleted: ' || v_target || ' — by ' || v_caller);

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_staff(UUID) TO authenticated;
