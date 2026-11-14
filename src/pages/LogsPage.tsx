import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LogsView from '../components/LogsView';
import { fetchLogs } from '../lib/data';
import type { LogEvent } from '../lib/staffTypes';
import StaffHeader from '../components/StaffHeader';

function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function LogsPage() {
  const [date, setDate] = useState(localISO(new Date()));
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLogs(date)
      .then(setLogs)
      .catch((e) => console.error('logs fetch failed', e))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/reception" className="text-sm text-bark-muted hover:underline">← Back to Reception</Link>
        </div>
        <StaffHeader role="Reception — Logs" who="[Receptionist name]" />

        <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
          <LogsView date={date} onDateChange={setDate} logs={logs} loading={loading} />
        </section>
      </div>
    </div>
  );
}
