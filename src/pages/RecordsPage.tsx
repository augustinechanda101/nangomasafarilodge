import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import RecordsView from '../components/RecordsView';
import FinanceCard from '../components/FinanceCard';
import { sampleRecords } from '../lib/sampleStaff';
import StaffHeader from '../components/StaffHeader';

export default function RecordsPage() {
  const records = useMemo(() => sampleRecords(), []);

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/reception" className="text-sm text-bark-muted hover:underline">← Back to Reception</Link>
        </div>
        <StaffHeader role="Reception — Records" who="[Receptionist name]" />

        <FinanceCard items={records} title="Financial records — all shown" />

        <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
          <RecordsView records={records} />
        </section>
      </div>
    </div>
  );
}
