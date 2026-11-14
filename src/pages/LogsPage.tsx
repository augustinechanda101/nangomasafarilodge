import { Link } from 'react-router-dom';
import LogsPanel from '../components/LogsPanel';
import StaffHeader from '../components/StaffHeader';

export default function LogsPage() {
  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/reception" className="text-sm text-bark-muted hover:underline">← Back to Reception</Link>
        </div>
        <StaffHeader role="Reception — Logs" who="[Receptionist name]" />

        <LogsPanel />
      </div>
    </div>
  );
}
