import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGmData, fetchRecords, type GmData } from '../lib/data';
import { useProfile } from '../lib/auth';
import ActivityPanel from '../components/ActivityPanel';
import FinanceView from '../components/FinanceView';
import KpiCard from '../components/KpiCard';
import LoadingScreen from '../components/LoadingScreen';
import RecordsView from '../components/RecordsView';
import RevenueChart from '../components/RevenueChart';
import StaffHeader from '../components/StaffHeader';
import StaffManager from '../components/StaffManager';
import type { BookingRecord } from '../lib/staffTypes';

const TABS = [
  { id: 'overall', label: 'Overall' },
  { id: 'finance', label: 'Finance' },
  { id: 'staff', label: 'Staff' },
  { id: 'activity', label: 'Activity' },
  { id: 'records', label: 'Records' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function GmPage() {
  const profile = useProfile();
  const [data, setData] = useState<GmData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('overall');
  const [records, setRecords] = useState<BookingRecord[] | null>(null);

  useEffect(() => {
    fetchGmData()
      .then(setData)
      .catch((e) => setError(e.message ?? 'Failed to load'));
  }, []);

  // Records/Finance share one booking-history fetch, loaded when first needed
  useEffect(() => {
    if ((tab === 'records' || tab === 'finance') && records === null) {
      fetchRecords()
        .then(setRecords)
        .catch((e) => console.error('records fetch failed', e));
    }
  }, [tab, records]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-sand font-sans text-bark">
        <p className="font-semibold">Could not load the dashboard</p>
        <p className="text-sm text-bark-muted">{error}</p>
      </div>
    );
  }
  if (!data) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-bark-muted hover:underline">← Back to Home</Link>
        </div>
        <StaffHeader
          role="General manager"
          who={profile?.name ?? 'Management'}
          menuItems={
            <Link
              to="/gm/logs"
              className="min-h-10 rounded-lg px-3 text-left text-sm font-semibold text-bark hover:bg-sand-line"
            >
              Logs
            </Link>
          }
        />

        {/* Section tabs */}
        <div className="flex w-fit flex-wrap items-center gap-3 rounded-xl bg-bark-soft p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-sand-card text-bark shadow-sm' : 'text-bark-muted hover:text-bark'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overall' && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {data.kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
            </div>
            <RevenueChart data={data.revenue} months={data.revenueMonths} />
          </>
        )}

        {tab === 'activity' && <ActivityPanel />}

        {tab === 'staff' && <StaffManager />}

        {tab === 'records' && (
          <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
            {records === null ? (
              <div className="flex justify-center py-8">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
              </div>
            ) : (
              <RecordsView records={records} />
            )}
          </section>
        )}

        {tab === 'finance' && (
          records === null ? (
            <div className="flex justify-center py-8">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
              <FinanceView records={records} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
