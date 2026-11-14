import type { GmFeedItem } from '../lib/data';

export default function ActivityFeed({ items }: { items: GmFeedItem[] }) {
  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <h3 className="font-display text-xl font-semibold">Activity</h3>
      {items.length === 0 ? (
        <p className="py-3 text-sm text-bark-muted">Nothing logged yet</p>
      ) : (
        items.map((f) => (
          <div key={f.id} className="border-t border-sand-line py-2.5 first:mt-2">
            <p className="text-sm">{f.text}</p>
            <p className="text-[13px] text-bark-muted">{f.when} · Lusaka</p>
          </div>
        ))
      )}
    </section>
  );
}
