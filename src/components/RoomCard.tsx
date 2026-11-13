import type { Room } from '../types';
import { whatsappLink } from '../lib/rooms';
import StatusChip from './StatusChip';

interface Props {
  room: Room;
  checkIn: string;
  checkOut: string;
}

const BTN =
  'flex min-h-11 items-center justify-center rounded-xl px-4 text-[15px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre';

export default function RoomCard({ room, checkIn, checkOut }: Props) {
  const rate = room.nightlyRate ? `K${room.nightlyRate} / night` : 'K[rate] / night';

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-sand-line bg-sand-card">
      <div className="flex h-36 items-center justify-center bg-sand-photo text-sm text-bark-deep md:h-44 2xl:h-48">
        Room photo
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-semibold">Room {room.number}</h3>
          <StatusChip status={room.status} />
        </div>
        <p className="text-sm text-bark-muted">{rate}</p>

        {room.status === 'booked' ? (
          <button type="button" disabled className={`${BTN} cursor-not-allowed bg-bark-off text-bark-offink`}>
            Not available for these dates
          </button>
        ) : (
          <a
            href={whatsappLink(room, checkIn, checkOut)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BTN} bg-bark-deep text-sand-card hover:bg-bark`}
          >
            {room.status === 'processing' ? 'Enquire on WhatsApp' : 'Book on WhatsApp'}
          </a>
        )}
      </div>
    </article>
  );
}
