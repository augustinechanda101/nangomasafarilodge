import type { AlertItem } from '../lib/staffTypes';

export default function AlertCard({ item, onAction }: { item: AlertItem; onAction: (id: number) => void }) {
  const chip = item.tone === 'bad' ? 'bg-brick-chip text-brick-ink' : 'bg-ochre-chip text-ochre-ink';
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-sand-line bg-sand-card px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}>{item.tag}</span>
        {item.location && (
          <span className="text-[11px] text-bark-muted">{item.location}</span>
        )}
      </div>
      <p className="text-sm">{item.text}</p>
      <button
        type="button"
        onClick={() => onAction(item.id)}
        className="min-h-10 rounded-xl bg-bark-deep px-3.5 text-sm font-semibold text-sand-card hover:bg-bark"
      >
        {item.action}
      </button>
    </div>
  );
}
