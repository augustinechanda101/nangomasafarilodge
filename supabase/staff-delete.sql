-- Run this once in the Supabase SQL editor.
-- Lets management permanently delete a staff member:
-- removes their login account and profile. Irreversible.

CREATE OR REPLACE FUNCTION delete_staff(
  p_id UUID
) RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_target TEXT;
  v_role   TEXT;
  v_caller TEXT;
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

  SELECT name INTO v_target FROM users WHERE id = p_id;
  IF v_target IS NULL THEN
    RETURN json_build_object('error', 'Staff member not found');
  END IF;

  -- The profile row cascades with the auth account
  DELETE FROM auth.users WHERE id = p_id;

  INSERT INTO activity_log (user_id, action)
  VALUES (auth.uid(), 'staff deleted: ' || v_target || ' — by ' || v_caller);

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_staff(UUID) TO authenticated;
