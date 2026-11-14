import { useEffect, useState } from 'react';
import { addStaff, deleteStaff, fetchStaffList, setStaffStatus, type StaffMember } from '../lib/data';

const FIELD =
  'min-h-10 w-full rounded-xl border border-bark-field bg-sand-card px-3 text-sm text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre';
const LABEL = 'flex flex-col gap-1 text-[13px] text-bark-muted';

const DEPARTMENTS = [
  { id: 'reception', label: 'Reception', role: 'reception', access: 'Full reception desk' },
  { id: 'kitchen', label: 'Kitchen', role: 'staff', access: 'View-only schedule' },
  { id: 'security', label: 'Security', role: 'staff', access: 'View-only schedule' },
  { id: 'outdoor', label: 'Outdoor', role: 'staff', access: 'View-only schedule' },
  { id: 'management', label: 'Management', role: 'gm', access: 'This dashboard' },
] as const;

const DEPT_LABEL: Record<string, string> = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.label]));

export default function StaffManager() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deptTab, setDeptTab] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dept, setDept] = useState<string>('reception');
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const toggleStatus = async (m: StaffMember) => {
    setRowBusy(m.id);
    const next = m.status === 'disabled' ? 'approved' : 'disabled';
    const err = await setStaffStatus(m.id, next);
    setRowBusy(null);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    load();
  };

  const remove = async (m: StaffMember) => {
    if (confirmId !== m.id) {
      setConfirmId(m.id);
      return;
    }
    setConfirmId(null);
    setRowBusy(m.id);
    const err = await deleteStaff(m.id);
    setRowBusy(null);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaved(`${m.name} permanently deleted`);
    load();
  };

  const load = () =>
    fetchStaffList()
      .then(setStaff)
      .catch((e) => setLoadError(e.message ?? 'Failed to load staff'));

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);
    const role = DEPARTMENTS.find((d) => d.id === dept)?.role ?? 'staff';
    const err = await addStaff({ name: name.trim(), email: email.trim(), password, role, department: dept });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setSaved(`${name.trim()} added — they can sign in with their email and password`);
    setName(''); setEmail(''); setPassword('');
    load();
  };

  const openForm = () => {
    setFormOpen(!formOpen);
    setSaved(null);
    if (!formOpen && deptTab !== 'all') setDept(deptTab);
  };

  const visible = (staff ?? []).filter((s) => deptTab === 'all' || s.department === deptTab);
  const countFor = (id: string) => (staff ?? []).filter((s) => s.department === id).length;

  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold">Employees</h3>
        <button
          type="button"
          onClick={openForm}
          className="min-h-10 rounded-xl bg-ochre px-3.5 text-sm font-semibold text-sand-card hover:bg-bark-deep"
        >
          {formOpen ? 'Close' : 'Add staff'}
        </button>
      </div>

      {/* Department tabs */}
      <div className="mt-3 flex w-fit flex-wrap items-center gap-2 rounded-xl bg-bark-soft p-0.5">
        <button
          type="button"
          onClick={() => setDeptTab('all')}
          className={`min-h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors ${
            deptTab === 'all' ? 'bg-sand-card text-bark shadow-sm' : 'text-bark-muted hover:text-bark'
          }`}
        >
          All ({staff?.length ?? 0})
        </button>
        {DEPARTMENTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDeptTab(d.id)}
            className={`min-h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors ${
              deptTab === d.id ? 'bg-sand-card text-bark shadow-sm' : 'text-bark-muted hover:text-bark'
            }`}
          >
            {d.label} ({countFor(d.id)})
          </button>
        ))}
      </div>

      {formOpen && (
        <form className="mt-3 flex flex-col gap-3 rounded-xl bg-bark-soft p-3" onSubmit={save}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>Full name
              <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className={LABEL}>Email (their login)
              <input className={FIELD} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className={LABEL}>Password (min 6 characters)
              <input className={FIELD} type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </label>
            <label className={LABEL}>Department
              <select className={FIELD} value={dept} onChange={(e) => setDept(e.target.value)}>
                {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[13px] text-bark-muted">
            Access: {DEPARTMENTS.find((d) => d.id === dept)?.access}
          </p>
          {error && <p className="rounded-xl bg-brick-chip px-3 py-2 text-sm font-semibold text-brick-ink">{error}</p>}
          {saved && <p className="rounded-xl bg-savanna-chip px-3 py-2 text-sm font-semibold text-savanna-ink">{saved}</p>}
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-fit rounded-xl bg-bark-deep px-4 text-sm font-semibold text-sand-card hover:bg-bark disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save staff member'}
          </button>
        </form>
      )}

      {loadError ? (
        <p className="mt-3 text-sm text-brick-ink">{loadError}</p>
      ) : staff === null ? (
        <div className="flex justify-center py-8">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-3 text-sm text-bark-muted">
          No {deptTab === 'all' ? '' : `${DEPT_LABEL[deptTab]?.toLowerCase() ?? deptTab} `}staff yet
        </p>
      ) : (
        <div className="mt-2">
          {visible.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-x-3 border-t border-sand-line py-2.5">
              <span className={`font-semibold ${m.status === 'disabled' ? 'text-bark-muted line-through' : ''}`}>
                {m.name}
              </span>
              <span className="text-[13px] text-bark-muted">{m.email}</span>
              <span className="ml-auto rounded-full bg-bark-soft px-2.5 py-1 text-xs font-semibold text-bark">
                {DEPT_LABEL[m.department] ?? m.department}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                m.status === 'approved' ? 'bg-savanna-chip text-savanna-ink' : 'bg-brick-chip text-brick-ink'
              }`}>
                {m.status === 'disabled' ? 'suspended' : m.status}
              </span>
              <button
                type="button"
                onClick={() => toggleStatus(m)}
                disabled={rowBusy === m.id}
                className="min-h-9 rounded-lg bg-bark-soft px-3 text-xs font-semibold text-bark hover:bg-sand-line disabled:opacity-60"
              >
                {rowBusy === m.id
                  ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ochre border-t-transparent align-middle" />
                  : m.status === 'disabled' ? 'Reinstate' : 'Suspend'}
              </button>
              <button
                type="button"
                onClick={() => remove(m)}
                disabled={rowBusy === m.id}
                className={`min-h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-60 ${
                  confirmId === m.id
                    ? 'bg-brick-ink text-sand-card hover:bg-brick'
                    : 'bg-brick-chip text-brick-ink hover:bg-brick'
                }`}
              >
                {rowBusy === m.id
                  ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sand-card border-t-transparent align-middle" />
                  : confirmId === m.id ? 'Confirm delete?' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
