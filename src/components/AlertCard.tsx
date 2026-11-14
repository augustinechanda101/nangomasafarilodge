import { useState } from 'react';
import type { AlertItem } from '../lib/staffTypes';

interface Props {
  item: AlertItem;
  onAction: (id: number) => void | Promise<void>;
}

export default function AlertCard({ item, onAction }: Props) {
  const [busy, setBusy] = useState(false);
  const chip = item.tone === 'bad' ? 'bg-brick-chip text-brick-ink' : 'bg-ochre-chip text-ochre-ink';

  const act = async () => {
    setBusy(true);
    await onAction(item.id);
    setBusy(false);
  };

  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-sand-line bg-sand-card px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}>{item.tag}</span>
        <span className="flex items-center gap-2">
          {item.status && (
            <span className="rounded-full bg-bark-soft px-2.5 py-1 text-xs font-semibold text-bark">{item.status}</span>
          )}
          {item.location && (
            <span className="text-[11px] text-bark-muted">{item.location}</span>
          )}
        </span>
      </div>
      <p className="text-sm">{item.text}</p>
      <button
        type="button"
        onClick={act}
        disabled={busy}
        className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-bark-deep px-3.5 text-sm font-semibold text-sand-card hover:bg-bark disabled:opacity-70"
      >
        {busy && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {item.action}
      </button>
    </div>
  );
}
