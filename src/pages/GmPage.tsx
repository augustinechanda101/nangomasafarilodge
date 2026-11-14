import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGmData, type GmData } from '../lib/data';
import { useProfile } from '../lib/auth';
import ActivityFeed from '../components/ActivityFeed';
import KpiCard from '../components/KpiCard';
import LoadingScreen from '../components/LoadingScreen';
import RevenueChart from '../components/RevenueChart';
import StaffHeader from '../components/StaffHeader';
import StaffManager from '../components/StaffManager';
import StaffTotals from '../components/StaffTotals';

const TABS = [
  { id: 'overall', label: 'Overall' },
  { id: 'activity', label: 'Activity' },
  { id: 'staff', label: 'Staff' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function GmPage() {
  const profile = useProfile();
  const [data, setData] = useState<GmData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('overall');

  useEffect(() => {
    fetchGmData()
      .then(setData)
      .catch((e) => setError(e.message ?? 'Failed to load'));
  }, []);

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
        <StaffHeader role="General manager" who={profile?.name ?? 'Management'} />

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
            <RevenueChart data={data.revenue} />
          </>
        )}

        {tab === 'activity' && (
          <div className="flex flex-col gap-4">
            <ActivityFeed items={data.feed} />
            <StaffTotals rows={data.staffTotals} />
          </div>
        )}

        {tab === 'staff' && <StaffManager />}
      </div>
    </div>
  );
}
