import { Link } from 'react-router-dom';
import NewBookingForm from '../components/NewBookingForm';

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/reception" className="text-sm text-bark-muted hover:underline">← Back to Reception</Link>
        </div>

        <div className="flex flex-col items-center gap-4">
          <section className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-sand-line bg-sand-card p-4">
            <NewBookingForm
              onSave={(draft) => draft.rooms.forEach((room) => console.log('POST /api/bookings', { ...draft, room }))}
              onHold={(draft) => draft.rooms.forEach((room) => console.log('POST /api/holds', { ...draft, room }))}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
