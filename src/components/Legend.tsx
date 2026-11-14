// Shared color legend — one source of truth for what each color means
const ITEMS: [string, string][] = [
  ['bg-bark-deep text-sand-card', 'Checked in'],
  ['bg-ochre-chip text-ochre-ink', 'Awaiting check-in'],
  ['bg-ochre text-sand-card', 'Hold'],
  ['bg-brick-ink text-sand-card', 'Overdue'],
  ['bg-brick-chip text-brick-ink', 'Maintenance'],
  ['bg-bark-soft text-bark', 'Unavailable'],
];

export default function Legend() {
  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map(([cls, label]) => (
        <span key={label} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
