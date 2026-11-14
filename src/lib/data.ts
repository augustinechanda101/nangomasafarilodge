import { supabase } from './supabase';
import type { BookingDraft, GridBar, GridRoom } from './staffTypes';

export interface LocationWithRooms {
  id: number;
  name: string;
  rooms: GridRoom[];
}

const DAY_MS = 86_400_000;

// Fetch locations with their rooms, mapped to the UI's GridRoom shape
export async function fetchLocationsWithRooms(): Promise<LocationWithRooms[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, rooms (id, number, type, nightly_rate, housekeeping)')
    .order('id');
  if (error) throw error;
  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    rooms: (l.rooms ?? [])
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
      .map((r) => ({
        name: r.number,
        state: r.housekeeping === 'ready' ? 'Available' : r.housekeeping,
        type: r.type ?? undefined,
        rate: Number(r.nightly_rate) || undefined,
        location: l.name,
      })),
  }));
}

// Create a booking via the atomic DB function (booking + stays + payment + log)
export async function createBooking(
  locationId: number,
  draft: BookingDraft,
): Promise<{ booking_id: number; invoice: string } | { error: string }> {
  const arrival = new Date(draft.arrival + 'T' + (draft.arrivalTime || '14:00'));
  const { data, error } = await supabase.rpc('create_booking', {
    p_location_id: locationId,
    p_room_numbers: draft.rooms,
    p_guest_name: draft.guestName,
    p_guest_phone: draft.phone,
    p_expected_arrival: arrival.toISOString(),
    p_nights: draft.nights,
    p_amount: Number(draft.amount) || 0,
    p_method: draft.method,
    p_reference: draft.reference || null,
    p_invoice: draft.invoice || null,
  });
  if (error) return { error: error.message };
  return data;
}

interface BookingRow {
  id: number;
  invoice: string | null;
  guest_name: string;
  status: string;
  expected_arrival: string;
  checkout_at: string;
  stays: {
    room_id: number;
    starts_at: string;
    ends_at: string;
    rooms: { number: string }[] | null;
  }[];
  payments: { amount: number; method: string; voided: boolean }[] | null;
}

async function fetchBookingRows(): Promise<BookingRow[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, invoice, guest_name, status, expected_arrival, checkout_at, stays (room_id, starts_at, ends_at, rooms ( number )), payments (amount, method, voided)')
    .neq('status', 'cancelled');
  if (error) throw error;
  return data ?? [];
}

function kindFor(status: string): GridBar['kind'] {
  return status === 'checked_in' ? 'checkedIn'
    : status === 'booked' ? 'awaiting'
    : status === 'checked_out' ? 'inspect'
    : 'hold';
}

function labelFor(b: BookingRow): string {
  if (b.status === 'booked') {
    const d = new Date(b.expected_arrival);
    const h = d.getHours();
    return `${b.guest_name} · arrives ${((h % 12) || 12)}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }
  if (b.status === 'checked_out') return `${b.guest_name} · out 10:00`;
  return `${b.guest_name} · ${b.status.replace('_', ' ')}`;
}

function paymentOf(b: BookingRow): { amount?: number; method?: string } {
  const p = (b.payments ?? []).find((x) => !x.voided);
  return p ? { amount: Number(p.amount), method: p.method } : {};
}

// Overview window: bars positioned by day offset within the visible window
export async function fetchWindowBars(
  windowStartISO: string,
  numDays: number,
  roomIndexByNumber: Map<string, number>,
): Promise<GridBar[]> {
  const rows = await fetchBookingRows();
  const windowStart = new Date(windowStartISO + 'T00:00:00').getTime();
  const bars: GridBar[] = [];

  for (const b of rows) {
    for (const stay of b.stays ?? []) {
      const roomNumber = stay.rooms?.[0]?.number;
      const idx = roomNumber ? roomIndexByNumber.get(roomNumber) : undefined;
      if (idx === undefined) continue;

      const startDay = Math.floor((new Date(stay.starts_at).getTime() - windowStart) / DAY_MS);
      const endDay = Math.ceil((new Date(stay.ends_at).getTime() - windowStart) / DAY_MS);
      const start = Math.max(0, startDay);
      const end = Math.min(numDays, endDay);
      if (end <= start) continue;

      bars.push({
        room: idx + 1,
        start,
        end,
        kind: kindFor(b.status),
        label: labelFor(b),
        invoice: b.invoice ?? undefined,
        bookingId: b.id,
        ...paymentOf(b),
      });
    }
  }
  return bars;
}

// Single date (hourly view): bars positioned by hour, 06:00–23:00 window
export async function fetchDayBars(
  dateISO: string,
  roomIndexByNumber: Map<string, number>,
): Promise<GridBar[]> {
  const rows = await fetchBookingRows();
  const dayStart = new Date(dateISO + 'T00:00:00').getTime();
  const bars: GridBar[] = [];

  for (const b of rows) {
    for (const stay of b.stays ?? []) {
      const roomNumber = stay.rooms?.[0]?.number;
      const idx = roomNumber ? roomIndexByNumber.get(roomNumber) : undefined;
      if (idx === undefined) continue;

      const s = new Date(stay.starts_at);
      const e = new Date(stay.ends_at);
      const stayStart = s.getTime();
      const stayEnd = e.getTime();
      if (stayEnd <= dayStart || stayStart >= dayStart + DAY_MS) continue; // not this day

      const arrivesToday = s.toDateString() === new Date(dayStart).toDateString();
      const departsToday = e.toDateString() === new Date(dayStart).toDateString();

      let startHour: number;
      let endHour: number;
      if (arrivesToday && departsToday) {
        startHour = Math.max(6, s.getHours());
        endHour = Math.min(23, Math.max(startHour + 1, e.getHours()));
      } else if (arrivesToday) {
        startHour = Math.max(6, s.getHours());
        endHour = 23;
      } else if (departsToday) {
        startHour = 6;
        endHour = Math.min(23, Math.max(7, e.getHours()));
      } else {
        startHour = 6;
        endHour = 23;
      }

      bars.push({
        room: idx + 1,
        start: startHour,
        end: endHour,
        kind: kindFor(b.status),
        label: labelFor(b),
        invoice: b.invoice ?? undefined,
        bookingId: b.id,
        ...paymentOf(b),
      });
    }
  }
  return bars;
}

// Desk actions on a booking: update status + timestamps + write the log
export async function bookingAction(verb: string, bookingId: number, label: string): Promise<string | null> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (verb === 'checkin') {
    patch.status = 'checked_in';
    patch.checked_in_at = now;
  } else if (verb === 'checkout') {
    patch.status = 'checked_out';
    patch.checked_out_at = now;
  } else if (verb === 'mark-ready') {
    patch.status = 'booked';
  } else if (verb === 'release') {
    patch.status = 'cancelled';
  }
  const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId);
  if (error) return error.message;
  await supabase.from('activity_log').insert({ action: `${verb}: ${label}`, booking_id: bookingId });
  return null;
}
