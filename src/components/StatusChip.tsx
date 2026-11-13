import type { RoomStatus } from '../types';

const STYLES: Record<RoomStatus, string> = {
  available: 'bg-savanna-chip text-savanna-ink',
  processing: 'bg-ochre-chip text-ochre-ink',
  booked: 'bg-brick-chip text-brick-ink',
};

const LABELS: Record<RoomStatus, string> = {
  available: 'Available',
  processing: 'Processing',
  booked: 'Booked',
};

export default function StatusChip({ status }: { status: RoomStatus }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
