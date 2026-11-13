import type { FeedItem } from '../lib/staffTypes';

export default function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <section className="rounded-2xl border border-sand-line bg-sand-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold">Activity</h3>
        <a href="/gm/log" className="flex min-h-10 items-center rounded-xl bg-bark-soft px-3.5 text-sm font-semibold text-bark">
          View full log
        </a>
      </div>
      {items.map((f) => (
        <div key={f.id} className="flex gap-2.5 border-t border-sand-line py-2.5 first:mt-2">
          <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${f.unread ? 'bg-ochre' : 'bg-bark-off'}`} aria-label={f.unread ? 'Unread' : 'Read'} />
          <div>
            <p className="text-sm">{f.title}</p>
            <p className="text-[13px] text-bark-muted">{f.meta}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
