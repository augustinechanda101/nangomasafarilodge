import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RecordsView from '../components/RecordsView';
import LoadingScreen from '../components/LoadingScreen';
import { fetchRecords } from '../lib/data';
import type { BookingRecord } from '../lib/staffTypes';
import StaffHeader from '../components/StaffHeader';

export default function RecordsPage() {
  const [records, setRecords] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords()
      .then(setRecords)
      .catch((e) => console.error('records fetch failed', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/reception" className="text-sm text-bark-muted hover:underline">← Back to Reception</Link>
        </div>
        <StaffHeader role="Reception — Booking Records" who="[Receptionist name]" />

        <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
          <RecordsView records={records} />
        </section>
      </div>
    </div>
  );
}
