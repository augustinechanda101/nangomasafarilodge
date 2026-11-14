-- Run this once in the Supabase SQL editor.
-- Lets management suspend / reinstate staff accounts.
-- A suspended account cannot log in and is locked out of any open session.

CREATE OR REPLACE FUNCTION set_staff_status(
  p_id     UUID,
  p_status TEXT
) RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_target TEXT;
  v_role   TEXT;
  v_caller TEXT;
BEGIN
  -- Only management accounts may change staff status
  SELECT role, name INTO v_role, v_caller FROM users WHERE id = auth.uid();
  IF COALESCE(v_role, '') <> 'gm' THEN
    RETURN json_build_object('error', 'Only management can change staff status');
  END IF;

  IF p_status NOT IN ('approved','disabled') THEN
    RETURN json_build_object('error', 'Invalid status');
  END IF;

  -- You cannot suspend your own account
  IF p_id = auth.uid() THEN
    RETURN json_build_object('error', 'You cannot suspend your own account');
  END IF;

  SELECT name INTO v_target FROM users WHERE id = p_id;
  IF v_target IS NULL THEN
    RETURN json_build_object('error', 'Staff member not found');
  END IF;

  UPDATE users SET status = p_status WHERE id = p_id;

  INSERT INTO activity_log (user_id, action)
  VALUES (
    auth.uid(),
    (CASE WHEN p_status = 'disabled' THEN 'staff suspended: ' ELSE 'staff reinstated: ' END)
      || v_target
      || ' — by ' || v_caller
  );

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION set_staff_status(UUID, TEXT) TO authenticated;
