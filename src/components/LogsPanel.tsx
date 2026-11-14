import { useEffect, useState } from 'react';
import LogsView from './LogsView';
import { fetchLogs } from '../lib/data';
import type { LogEvent } from '../lib/staffTypes';

function localISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Self-fetching log panel: owns the date state and loads that day's real log.
// scope 'reception' = desk operations; 'management' = everything incl. staff actions.
export default function LogsPanel({ scope = 'reception' }: { scope?: 'reception' | 'management' }) {
  const [date, setDate] = useState(localISO(new Date()));
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLogs(date, scope)
      .then(setLogs)
      .catch((e) => console.error('logs fetch failed', e))
      .finally(() => setLoading(false));
  }, [date, scope]);

  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <LogsView date={date} onDateChange={setDate} logs={logs} loading={loading} />
    </section>
  );
}
