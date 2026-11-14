import type { AlertItem, BarKind, BookingRecord, FeedItem, GridBar, GridRoom, Kpi, LogEvent, PendingStaff, RevenuePoint, StaffTotal } from './staffTypes';

// All sample data. Replace with Express calls when the backend exists.
export const DAYS = ['Thu 5', 'Fri 6', 'Sat 7', 'Sun 8', 'Mon 9', 'Tue 10', 'Wed 11'];

export const DAM_LODGE_ROOMS: GridRoom[] = [
  { name: 'Room 1', state: 'Available', type: 'Chalet', rate: 1500, location: 'Dam Lodge' },
  { name: 'Room 2', state: 'Needs inspection', type: 'Chalet', rate: 1500, location: 'Dam Lodge' },
  { name: 'Room 3', state: 'Overdue', type: 'Chalet', rate: 1500, location: 'Dam Lodge' },
  { name: 'Room 4', state: 'On hold', type: 'Chalet', rate: 1500, location: 'Dam Lodge' },
  { name: 'Room 5', state: 'Awaiting check-in', type: 'Chalet', rate: 1500, location: 'Dam Lodge' },
  { name: 'Room 6', state: 'Checked in', type: 'Chalet', rate: 1500, location: 'Dam Lodge' },
  { name: 'Room 7', state: 'Available now', type: 'Family Room', rate: 2000, location: 'Dam Lodge' },
  { name: 'Room 8', state: 'Available', type: 'Standard Double', rate: 1300, location: 'Dam Lodge' },
  { name: 'Room 9', state: 'Available', type: 'Standard Double', rate: 1300, location: 'Dam Lodge' },
  { name: 'Room 10', state: 'Available', type: 'Family Room', rate: 2500, location: 'Dam Lodge' },
];

export const FARM_HOUSE_ROOMS: GridRoom[] = Array.from({ length: 13 }, (_, i) => ({
  name: `Room ${i + 1}`,
  state: 'Available',
  type: i === 3 ? 'Family Room' : 'Farm House room',
  location: 'Farm House',
}));

export const ALL_ROOMS: GridRoom[] = [...DAM_LODGE_ROOMS, ...FARM_HOUSE_ROOMS];

export type LocationId = 'all' | 'dam-lodge' | 'farm-house';
export const LOCATIONS: { id: LocationId; name: string; rooms: GridRoom[] }[] = [
  { id: 'all', name: 'All Locations', rooms: ALL_ROOMS },
  { id: 'dam-lodge', name: 'Dam Lodge', rooms: DAM_LODGE_ROOMS },
  { id: 'farm-house', name: 'Farm House', rooms: FARM_HOUSE_ROOMS },
];

// Backwards-compatible export (Dam Lodge is the default location)
export const GRID_ROOMS = DAM_LODGE_ROOMS;

// Deterministic sample bookings for a given date (until the backend exists).
// Same date always produces the same schedule; different dates look different.
export function barsForDate(dateStr: string): GridBar[] {
  const seed = dateStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const kinds: BarKind[] = ['checkedIn', 'awaiting', 'hold', 'inspect'];
  const names = ['Tembo', 'Zulu', 'Phiri', 'Banda', 'Mwansa', 'Chileshe', 'Sakala'];
  const bars: GridBar[] = [];
  let prevInvoice = '';
  let prevBooked = false;
  for (let room = 1; room <= 23; room++) {
    const roll = (seed * 31 + room * 17) % 100;
    if (roll < 40) {
      const start = 6 + ((seed + room * 13) % 15); // 06:00–20:00
      const dur = 1 + ((seed + room * 7) % 4); // 1–4 hours
      const kind = kinds[(seed + room * 3) % kinds.length];
      const guest = names[(seed + room * 5) % names.length];
      const verb =
        kind === 'awaiting' ? 'arrives' : kind === 'checkedIn' ? 'checked in' : kind;
      // Occasionally group with the previous room's booking
      const share = prevBooked && (seed + room * 11) % 3 === 0;
      const invoice = share ? prevInvoice : `INV-${((seed + room * 7) % 900) + 100}`;
      const rate = ALL_ROOMS[room - 1]?.rate ?? 1300;
      const nights = 1 + ((seed + room * 5) % 3);
      const amount = kind === 'inspect' ? undefined : rate * nights;
      const method = ['Mobile money', 'Cash', 'Bank transfer'][(seed + room) % 3];
      bars.push({ room, start, end: start + dur, kind, label: `${guest} · ${verb}`, invoice, amount, method });
      prevInvoice = invoice;
      prevBooked = true;
    } else {
      prevBooked = false;
    }
  }
  return bars;
}

export const GRID_BARS: GridBar[] = [
  { room: 1, start: 4, end: 6, kind: 'awaiting', label: 'Zulu · arrives 8:00 PM', invoice: 'INV-2101', amount: 3000, method: 'Mobile money' },
  { room: 2, start: 0, end: 1, kind: 'inspect', label: 'Needs inspection', invoice: 'INV-2102' },
  { room: 3, start: 0, end: 1, kind: 'overdue', label: 'Banda · overdue, out 10:00', invoice: 'INV-2103', amount: 1500, method: 'Cash' },
  { room: 4, start: 1, end: 3, kind: 'hold', label: 'Processing hold · 2h left', invoice: 'INV-2104' },
  { room: 5, start: 0, end: 2, kind: 'awaiting', label: 'Phiri · arrives 4:00 AM', invoice: 'INV-1042', amount: 4000, method: 'Mobile money' },
  { room: 6, start: 0, end: 4, kind: 'checkedIn', label: 'Tembo · checked in · out Mon 10:00', invoice: 'INV-1043', amount: 4500, method: 'Bank transfer' },
  { room: 7, start: 2, end: 5, kind: 'awaiting', label: 'Mwansa · arrives 8:00 PM', invoice: 'INV-1044', amount: 3900, method: 'Mobile money' },
  { room: 8, start: 0, end: 2, kind: 'awaiting', label: 'Phiri · arrives 4:00 AM', invoice: 'INV-1042', amount: 1300, method: 'Mobile money' },
];

// Sample booking records: past 7 days through 3 weeks ahead, derived from barsForDate
export function sampleRecords(): BookingRecord[] {
  const localISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date();
  const records: BookingRecord[] = [];
  for (let off = -7; off <= 21; off++) {
    const d = new Date(today);
    d.setDate(d.getDate() + off);
    const dateStr = localISO(d);
    const seed = dateStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    for (const b of barsForDate(dateStr)) {
      const room = ALL_ROOMS[b.room - 1];
      if (!room) continue;
      const s = seed + b.room * 13;
      const nights = 1 + (s % 3);
      const [guest] = b.label.split('·');
      const status = off < 0 ? 'Completed' : off === 0 ? 'In house' : 'Booked';
      records.push({
        guest: guest.trim(),
        phone: `09${String(70 + (s % 6))}-${String(100000 + (s % 900000))}`,
        room: room.name,
        location: room.location ?? '',
        checkIn: dateStr,
        nights,
        amount: (room.rate ?? 1300) * nights,
        method: ['Mobile money', 'Cash', 'Bank transfer'][s % 3],
        invoice: b.invoice ?? '',
        status,
      });
    }
  }
  return records.sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1));
}

// Deterministic event log for a date: check-ins, check-outs, payments, holds
export function logsForDate(dateStr: string): LogEvent[] {
  const seed = dateStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const events: LogEvent[] = [];
  for (const b of barsForDate(dateStr)) {
    const [guest] = b.label.split('·');
    const name = guest.trim();
    const room = ALL_ROOMS[b.room - 1];
    const hour = 6 + ((seed + b.room * 13) % 15);
    const time = `${String(hour).padStart(2, '0')}:${String((seed + b.room * 7) % 60).padStart(2, '0')}`;
    if (b.kind === 'checkedIn') {
      events.push({ time, text: `${name} checked in · ${room?.name ?? `Room ${b.room}`}`, tone: 'in' });
    } else if (b.kind === 'overdue') {
      events.push({ time: '10:00', text: `${name} checked out · ${room?.name ?? `Room ${b.room}`} (overdue)`, tone: 'out' });
    } else if (b.kind === 'awaiting') {
      events.push({ time, text: `${name} expected · ${room?.name ?? `Room ${b.room}`}`, tone: 'info' });
    } else if (b.kind === 'hold') {
      events.push({ time, text: `${room?.name ?? `Room ${b.room}`} held for 3 hours`, tone: 'info' });
    }
    if (b.amount) {
      events.push({
        time,
        text: `Payment K${b.amount.toLocaleString()} · ${b.method} · ${b.invoice}`,
        tone: 'money',
      });
    }
  }
  return events.sort((a, b) => (a.time < b.time ? -1 : 1));
}

export const ALERTS: AlertItem[] = [
  { id: 1, tag: 'Overdue checkout', tone: 'bad', text: 'Room 3 · Banda · checkout was 10:00', action: 'Check out', location: 'Dam Lodge' },
  { id: 2, tag: 'Awaiting check-in', tone: 'warn', text: 'Room 5 · Phiri · expected 4:00 AM', action: 'Check in', location: 'Dam Lodge' },
  { id: 3, tag: 'Needs inspection', tone: 'warn', text: 'Room 2 · guest moved to Room 7 at 3:05 PM', action: 'Mark ready', location: 'Farm House' },
];

export const KPIS: Kpi[] = [
  { label: 'Revenue today', value: 'K3,200', note: 'Sample data' },
  { label: 'This week', value: 'K27,600', note: 'Last 7 days' },
  { label: 'This month', value: 'K96,300', note: '1 to 5 Nov' },
  { label: 'Occupancy tonight', value: '6 of 8 rooms', note: '75%' },
];

export const REVENUE: RevenuePoint[] = [
  { day: 'Fri', amount: 3000 }, { day: 'Sat', amount: 4200 }, { day: 'Sun', amount: 3100 },
  { day: 'Mon', amount: 5600 }, { day: 'Tue', amount: 4800 }, { day: 'Wed', amount: 3700 },
  { day: 'Thu', amount: 3200, today: true },
];

export const STAFF_TOTALS: StaffTotal[] = [
  { name: 'Receptionist A', bookings: 9, amount: 15300 },
  { name: 'Receptionist B', bookings: 7, amount: 9800 },
  { name: 'GM', bookings: 1, amount: 2500 },
];

export const PENDING: PendingStaff[] = [
  { id: 1, name: 'Mutale K.' },
  { id: 2, name: 'Bwalya S.' },
];

export const FEED: FeedItem[] = [
  { id: 1, title: 'Room 4 to Room 7: aircon fault', meta: 'Receptionist A · 3:05 PM', unread: true },
  { id: 2, title: 'Payment of K500 voided: wrong amount', meta: 'Receptionist B · 1:40 PM', unread: true },
  { id: 3, title: 'Room 6 extended by 1 night', meta: 'Receptionist A · Yesterday', unread: false },
  { id: 4, title: 'Booking cancelled, Room 8', meta: 'Receptionist B · Yesterday', unread: false },
];
