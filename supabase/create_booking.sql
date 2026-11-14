CREATE OR REPLACE FUNCTION create_booking(
  p_location_id    INT,
  p_room_numbers   TEXT[],
  p_guest_name     TEXT,
  p_guest_phone    TEXT,
  p_expected_arrival TIMESTAMPTZ,
  p_nights         INT,
  p_amount         NUMERIC,
  p_method         TEXT,
  p_reference      TEXT,
  p_invoice        TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id INT;
  v_invoice    TEXT;
  v_room_id    INT;
  v_checkout   TIMESTAMPTZ;
  v_i          INT;
BEGIN
  v_invoice := COALESCE(p_invoice, 'INV-' || to_char(now() AT TIME ZONE 'Africa/Lusaka', 'YYMMDD') || '-' || floor(random() * 9000 + 1000)::int);
  v_checkout := ((p_expected_arrival AT TIME ZONE 'Africa/Lusaka')::date + p_nights)::timestamp
                AT TIME ZONE 'Africa/Lusaka' + interval '10 hours';

  INSERT INTO bookings (invoice, guest_name, guest_phone, expected_arrival, checkout_at, status)
  VALUES (v_invoice, p_guest_name, p_guest_phone, p_expected_arrival, v_checkout, 'booked')
  RETURNING id INTO v_booking_id;

  FOR v_i IN 1..coalesce(array_length(p_room_numbers, 1), 0) LOOP
    SELECT id INTO v_room_id
    FROM rooms WHERE location_id = p_location_id AND number = p_room_numbers[v_i];
    IF v_room_id IS NULL THEN
      RAISE EXCEPTION 'Room % not found at location %', p_room_numbers[v_i], p_location_id;
    END IF;
    INSERT INTO stays (booking_id, room_id, starts_at, ends_at)
    VALUES (v_booking_id, v_room_id, p_expected_arrival, v_checkout);
  END LOOP;

  IF p_amount IS NOT NULL AND p_amount > 0 THEN
    INSERT INTO payments (booking_id, amount, method, reference, invoice)
    VALUES (v_booking_id, p_amount, p_method, p_reference, v_invoice);
  END IF;

  INSERT INTO activity_log (action, booking_id)
  VALUES ('booking created: ' || p_guest_name || ' · rooms ' || array_to_string(p_room_numbers, ', '), v_booking_id);

  RETURN json_build_object('booking_id', v_booking_id, 'invoice', v_invoice);
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('error', 'One of the selected rooms is already booked for those dates');
END;
$$;
