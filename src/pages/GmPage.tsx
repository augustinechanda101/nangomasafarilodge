import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FEED, KPIS, PENDING, REVENUE, STAFF_TOTALS } from '../lib/sampleStaff';
import ActivityFeed from '../components/ActivityFeed';
import ApprovalList from '../components/ApprovalList';
import KpiCard from '../components/KpiCard';
import RevenueChart from '../components/RevenueChart';
import StaffHeader from '../components/StaffHeader';
import StaffTotals from '../components/StaffTotals';

export default function GmPage() {
  const [pending, setPending] = useState(PENDING);
  // TODO: call POST /api/staff/:id/approve and /reject, then remove from the list
  const resolve = (id: number, verb: 'approve' | 'reject') => {
    console.log(`POST /api/staff/${id}/${verb}`);
    setPending((p) => p.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-bark-muted hover:underline">← Back to Home</Link>
        </div>
        <StaffHeader role="General manager" who="[GM name]" />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {KPIS.map((k) => <KpiCard key={k.label} kpi={k} />)}
        </div>

        <div className="flex flex-col items-start gap-4 lg:flex-row">
          <div className="flex w-full flex-[3] flex-col gap-4">
            <RevenueChart data={REVENUE} />
            <StaffTotals rows={STAFF_TOTALS} />
          </div>
          <div className="flex w-full flex-[2] flex-col gap-4">
            <ApprovalList items={pending} onApprove={(id) => resolve(id, 'approve')} onReject={(id) => resolve(id, 'reject')} />
            <ActivityFeed items={FEED} />
          </div>
        </div>
      </div>
    </div>
  );
}
