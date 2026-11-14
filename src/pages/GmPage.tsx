import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGmData, type GmData } from '../lib/data';
import { useProfile } from '../lib/auth';
import ActivityFeed from '../components/ActivityFeed';
import KpiCard from '../components/KpiCard';
import LoadingScreen from '../components/LoadingScreen';
import RevenueChart from '../components/RevenueChart';
import StaffHeader from '../components/StaffHeader';
import StaffTotals from '../components/StaffTotals';

export default function GmPage() {
  const profile = useProfile();
  const [data, setData] = useState<GmData | null>(null);
  const [error, setError] = useState<string | null>(null);

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

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {data.kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
        </div>

        <div className="flex flex-col items-start gap-4 lg:flex-row">
          <div className="flex w-full flex-[3] flex-col gap-4">
            <RevenueChart data={data.revenue} />
            <StaffTotals rows={data.staffTotals} />
          </div>
          <div className="flex w-full flex-[2] flex-col gap-4">
            <ActivityFeed items={data.feed} />
          </div>
        </div>
      </div>
    </div>
  );
}
