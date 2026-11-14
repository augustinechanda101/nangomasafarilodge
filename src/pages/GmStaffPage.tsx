import { Link } from 'react-router-dom';
import StaffHeader from '../components/StaffHeader';
import StaffManager from '../components/StaffManager';
import { useProfile } from '../lib/auth';

export default function GmStaffPage() {
  const profile = useProfile();

  return (
    <div className="min-h-screen bg-sand font-sans text-bark">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/gm" className="text-sm text-bark-muted hover:underline">← Back to Management</Link>
        </div>
        <StaffHeader role="General manager — Staff" who={profile?.name ?? 'Management'} />

        <StaffManager />
      </div>
    </div>
  );
}
