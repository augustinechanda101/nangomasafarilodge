import type { PendingStaff } from '../lib/staffTypes';

interface Props {
  items: PendingStaff[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export default function ApprovalList({ items, onApprove, onReject }: Props) {
  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold">Staff waiting for approval</h3>
        {items.length > 0 && (
          <span className="rounded-full bg-ochre-chip px-2.5 py-1 text-xs font-semibold text-ochre-ink">{items.length} pending</span>
        )}
      </div>
      {items.length === 0 && <p className="mt-2 text-sm text-bark-muted">No one is waiting. New sign-ups appear here.</p>}
      {items.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 border-t border-sand-line py-2.5 first:mt-2">
          <div>
            <b className="text-sm">{p.name}</b>
            <p className="text-[13px] text-bark-muted">Reception · requested today</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onApprove(p.id)} className="min-h-10 rounded-xl bg-bark-deep px-3.5 text-sm font-semibold text-sand-card hover:bg-bark">Approve</button>
            <button type="button" onClick={() => onReject(p.id)} className="min-h-10 rounded-xl bg-bark-soft px-3.5 text-sm font-semibold text-bark">Reject</button>
          </div>
        </div>
      ))}
    </section>
  );
}
