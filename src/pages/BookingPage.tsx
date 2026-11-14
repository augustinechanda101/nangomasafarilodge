import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NewBookingForm from '../components/NewBookingForm';
import { createBooking, fetchLocationsWithRooms, type LocationWithRooms } from '../lib/data';
import { LOCATIONS } from '../lib/sampleStaff';
import StaffHeader from '../components/StaffHeader';

export default function BookingPage() {
  const [locations, setLocations] = useState<LocationWithRooms[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocationsWithRooms()
      .then(setLocations)
      .catch((e) => {
        console.error('locations fetch failed', e);
        setLocations(LOCATIONS.filter((l) => l.id !== 'all').map((l) => ({ id: 0, name: l.name, rooms: l.rooms })));
      });
  }, []);

  const save = async (draft: Parameters<typeof createBooking>[1]) => {
    setSaveError(null);
    setSaved(null);
    const loc = locations.find((l) => l.name === draft.location);
    if (!loc || !loc.id) {
      setSaveError('Location not loaded yet — try again in a moment');
      return;
    }
    const result = await createBooking(loc.id, draft);
    if ('error' in result && result.error) {
      setSaveError(result.error);
    } else if ('invoice' in result) {
      setSaved(result.invoice);
    }
  };

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/reception" className="text-sm text-bark-muted hover:underline">← Back to Reception</Link>
        </div>
        <StaffHeader role="Reception — New booking" who="[Receptionist name]" />

        <div className="flex flex-col items-center gap-4">
          <section className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-sand-line bg-sand-card p-4">
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
              onSave={save}
              onHold={save}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
