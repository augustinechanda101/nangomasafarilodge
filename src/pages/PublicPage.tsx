import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Room } from '../types';
import { fetchRooms, nightsBetween } from '../lib/rooms';
import DateBar from '../components/DateBar';
import RoomCard from '../components/RoomCard';
import StatusChip from '../components/StatusChip';

const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

export default function PublicPage() {
  const [checkIn, setCheckIn] = useState(iso(1));
  const [checkOut, setCheckOut] = useState(iso(3));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const valid = nightsBetween(checkIn, checkOut) >= 1;

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    setLoading(true);
    fetchRooms(checkIn, checkOut).then((r) => {
      if (!cancelled) {
        setRooms(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, valid]);

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-4 md:px-14 md:py-7 2xl:gap-6 2xl:px-12 2xl:py-10">
        <header className="flex items-center justify-between">
          <div>
            <img
              src="/nangomalogo.webp"
              alt="Nangoma Safari Lodge"
              className="h-16 w-auto rounded-xl shadow-sm ring-1 ring-sand-line md:h-20"
            />
            <div className="mt-2 h-[3px] w-10 bg-ochre" />
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="hover:underline">Back to Home</Link>
            <a className="hover:underline" href="#rooms">Rooms</a>
            <a className="hover:underline" href="#contact">Contact</a>
          </nav>
        </header>

        <h1 className="font-display text-3xl font-semibold md:mt-3 md:text-5xl 2xl:text-6xl">Find your room</h1>

        <DateBar
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(a, b) => {
            setCheckIn(a);
            setCheckOut(b);
          }}
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusChip status="available" />
            <StatusChip status="processing" />
            <StatusChip status="booked" />
          </div>
          <p className="text-sm text-bark-muted">
            Status is for your selected dates. Book by WhatsApp or phone. No payment is taken on this site.
          </p>
        </div>

        <section id="rooms" aria-busy={loading}>
          {valid ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 2xl:grid-cols-4 2xl:gap-6">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} checkIn={checkIn} checkOut={checkOut} />
              ))}
            </div>
          ) : (
            <p className="text-bark-muted">Pick a check-out date after your check-in to see rooms.</p>
          )}
        </section>
      </div>
    </div>
  );
}
