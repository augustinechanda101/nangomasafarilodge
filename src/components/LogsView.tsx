import type { LogEvent } from '../lib/staffTypes';

const FIELD =
  'min-h-10 rounded-xl border border-bark-field bg-sand-card px-3 text-sm text-bark focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre';

const TONE: Record<LogEvent['tone'], string> = {
  in: 'bg-savanna-chip text-savanna-ink',
  out: 'bg-brick-chip text-brick-ink',
  money: 'bg-ochre-chip text-ochre-ink',
  info: 'bg-bark-soft text-bark',
};

interface Props {
  date: string;
  onDateChange: (date: string) => void;
  logs: LogEvent[];
}

export default function LogsView({ date, onDateChange, logs }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-bark-muted">
        Log date:
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className={FIELD}
        />
      </label>
      <div className="max-h-[28rem] overflow-y-auto">
        <div className="flex flex-col gap-2">
          {logs.length === 0 ? (
            <p className="text-sm text-bark-muted">No activity logged on this date</p>
          ) : (
            logs.map((e, i) => (
              <div
                key={`${e.time}-${i}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs ${TONE[e.tone]}`}
              >
                <span className="w-14 shrink-0 font-semibold">{e.time}</span>
                <span className="flex-1">{e.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
