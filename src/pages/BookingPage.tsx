import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import NewBookingForm from '../components/NewBookingForm';
import { bookingAction, createBooking, fetchLocationsWithRooms, holdRooms, type LocationWithRooms } from '../lib/data';
import { LOCATIONS } from '../lib/sampleStaff';

export default function BookingPage() {
  const [params] = useSearchParams();
  const initialLocation = params.get('location') ?? undefined;
  const initialRoom = params.get('room') ?? undefined;
  const initialDate = params.get('date') ?? undefined;

  const [locations, setLocations] = useState<LocationWithRooms[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchLocationsWithRooms()
      .then(setLocations)
      .catch((e) => {
        console.error('locations fetch failed', e);
        setLocations(LOCATIONS.filter((l) => l.id !== 'all').map((l) => ({ id: 0, name: l.name, rooms: l.rooms })));
      });
  }, []);

  const save = async (draft: Parameters<typeof createBooking>[1]) => {
    setBusy(true);
    setSaveError(null);
    setSaved(null);
    const loc = locations.find((l) => l.name === draft.location);
    if (!loc || !loc.id) {
      setSaveError('Location not loaded yet — try again in a moment');
      setBusy(false);
      return;
    }
    const result = await createBooking(loc.id, draft);
    setBusy(false);
    if ('error' in result && result.error) {
      setSaveError(result.error);
    } else if ('invoice' in result) {
      setSaved(result.invoice);
    }
  };

  // Walk-in: create the booking and check the guest in, right there and then
  const saveAndCheckIn = async (draft: Parameters<typeof createBooking>[1]) => {
    setBusy(true);
    setSaveError(null);
    setSaved(null);
    const loc = locations.find((l) => l.name === draft.location);
    if (!loc || !loc.id) {
      setSaveError('Location not loaded yet — try again in a moment');
      setBusy(false);
      return;
    }
    const result = await createBooking(loc.id, draft);
    if ('error' in result && result.error) {
      setSaveError(result.error);
      setBusy(false);
      return;
    }
    if (!('booking_id' in result)) {
      setBusy(false);
      return;
    }
    const label = `${draft.rooms.length > 1 ? 'Rooms' : 'Room'} ${draft.rooms.join(', ')} · ${draft.guestName}`;
    const err = await bookingAction('checkin', result.booking_id, label);
    setBusy(false);
    if (err) {
      setSaveError(`Booking saved (invoice ${result.invoice}) but check-in failed: ${err}`);
      return;
    }
    setSaved(`${result.invoice} — guest checked in`);
  };

  // Hold: room state 'hold' + a 3-hour holds row — NOT a booking
  const hold = async (draft: Parameters<typeof createBooking>[1]) => {
    setBusy(true);
    setSaveError(null);
    setSaved(null);
    const loc = locations.find((l) => l.name === draft.location);
    if (!loc || !loc.id) {
      setSaveError('Location not loaded yet — try again in a moment');
      setBusy(false);
      return;
    }
    const ids = loc.rooms
      .filter((r) => draft.rooms.includes(r.name) && r.id !== undefined)
      .map((r) => r.id as number);
    if (ids.length === 0) {
      setSaveError('Select at least one room to hold');
      setBusy(false);
      return;
    }
    const err = await holdRooms(ids, draft.guestName, `${draft.rooms.join(', ')} · ${loc.name}`);
    setBusy(false);
    if (err) {
      setSaveError(err);
      return;
    }
    setSaved(`Room${draft.rooms.length > 1 ? 's' : ''} held for 3 hours`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand font-sans text-bark px-4 py-6">
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <Link to="/reception" className="self-start text-sm text-bark-muted hover:underline">
          ← Back to Reception
        </Link>
        {saved && (
          <p className="rounded-xl bg-savanna-chip px-3 py-2 text-sm font-semibold text-savanna-ink">
            Booking saved — invoice {saved}
          </p>
        )}
        {saveError && (
          <p className="rounded-xl bg-brick-chip px-3 py-2 text-sm font-semibold text-brick-ink">
            {saveError}
          </p>
        )}
        <NewBookingForm
          locations={locations.map((l) => ({ name: l.name, rooms: l.rooms.map((r) => r.name) }))}
          initialLocation={initialLocation}
          initialRoom={initialRoom}
          initialDate={initialDate}
          onSave={save}
          onHold={hold}
          onSaveAndCheckIn={saveAndCheckIn}
          busy={busy}
        />
      </div>
    </div>
  );
}
